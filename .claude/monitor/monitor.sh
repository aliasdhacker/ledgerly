#!/bin/bash
# Claude Monitor - Ollama-powered code review and control system
# Copy to: ~/.claude/monitor/monitor.sh

set -e

# Configuration
# Allow callers to set OLLAMA_HOST as either "host:port" or a full URL (http://host:port)
OLLAMA_HOST_RAW="${OLLAMA_HOST:-localhost:11434}"
if [[ "$OLLAMA_HOST_RAW" =~ ^https?:// ]]; then
  OLLAMA_URL="$OLLAMA_HOST_RAW"
else
  OLLAMA_URL="http://$OLLAMA_HOST_RAW"
fi
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.1:8b}"
MONITOR_DIR="$HOME/.claude/monitor"
LOG_FILE="$MONITOR_DIR/reviews.log"
QUEUE_DIR="$MONITOR_DIR/queue"
DECISIONS_FILE="$MONITOR_DIR/decisions.jsonl"
MODE="${CLAUDE_MONITOR_MODE:-log}"  # log, review, strict

# Ensure directories exist
mkdir -p "$QUEUE_DIR"

# Read hook input from stdin
INPUT=$(cat)

# Write raw input for debugging (helpful when hooks appear not to run)
mkdir -p "$MONITOR_DIR"
echo "$INPUT" > "$MONITOR_DIR/last_input.json" || true

# Exit if no input
if [ -z "$INPUT" ]; then
  exit 0
fi

# Parse input
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"')
FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // .filePath // .path // "unknown"')
CONTENT=$(echo "$INPUT" | jq -r '.new_string // .content // .file_text // ""' | head -c 4000)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
REVIEW_ID=$(echo "$TIMESTAMP$FILE_PATH" | shasum | head -c 8)

# Log the action
log_action() {
  echo "{\"id\":\"$REVIEW_ID\",\"timestamp\":\"$TIMESTAMP\",\"tool\":\"$TOOL_NAME\",\"file\":\"$FILE_PATH\",\"decision\":\"$1\",\"reason\":\"$2\"}" >> "$DECISIONS_FILE"
}

# Send to Ollama for review
review_with_ollama() {
  local prompt="You are a code review assistant monitoring an AI coding agent.

TASK: Review this code change and respond with a JSON object.

Tool: $TOOL_NAME
File: $FILE_PATH
Content:
\`\`\`\
$CONTENT
\`\`\`\

Evaluate for:
1. Security issues (credentials, injection, unsafe operations)
2. Destructive operations (deletes, overwrites without backup)
3. Scope creep (changes unrelated to the task)
4. Code quality issues

Respond ONLY with this JSON format:
{
  \"safe\": true/false,
  \"severity\": \"ok|warning|critical\",
  \"issues\": [\"issue1\", \"issue2\"],
  \"summary\": \"one line summary\"
}"

  local payload=$(jq -n \
    --arg model "$OLLAMA_MODEL" \
    --arg prompt "$prompt" \
    '{model: $model, prompt: $prompt, stream: false, format: "json"}')

  # Use computed OLLAMA_URL (handles full URLs and host:port)
  local response
  response=$(curl -s --max-time 30 "$OLLAMA_URL/api/generate" \
    -H "Content-Type: application/json" \
    -d "$payload" 2>/dev/null) || response=""

  if [ -z "$response" ]; then
    echo "{\"safe\":true,\"severity\":\"ok\",\"issues\":[],\"summary\":\"Ollama unavailable\"}"
    return
  fi

  # When Ollama returns a structured object it may be under .response or top-level
  echo "$response" | jq -r '.response // . // "{\"safe\":true,\"severity\":\"ok\",\"issues\":[],\"summary\":\"Ollama response parse error\"}"'
}

# Main logic based on mode
case "$MODE" in
  "log")
    # Just log, don't block
    echo "[$TIMESTAMP] $TOOL_NAME: $FILE_PATH" >> "$LOG_FILE"
    log_action "allowed" "log-only mode"
    exit 0
    ;;

  "review")
    # Review with Ollama, log results, but don't block
    REVIEW=$(review_with_ollama)
    SEVERITY=$(echo "$REVIEW" | jq -r '.severity // "ok"')
    SUMMARY=$(echo "$REVIEW" | jq -r '.summary // "No summary"')
    
    echo "[$TIMESTAMP] [$SEVERITY] $TOOL_NAME: $FILE_PATH - $SUMMARY" >> "$LOG_FILE"
    echo "$REVIEW" | jq -c ". + {id:\"$REVIEW_ID\",file:\"$FILE_PATH\",tool:\"$TOOL_NAME\"}" >> "$DECISIONS_FILE"
    
    # Alert on critical issues (write to stderr so user sees it)
    if [ "$SEVERITY" = "critical" ]; then
      echo "⚠️  CRITICAL: $SUMMARY" >&2
    fi
    
    exit 0
    ;;

  "strict")
    # Review with Ollama and block if unsafe
    REVIEW=$(review_with_ollama)
    SAFE=$(echo "$REVIEW" | jq -r '.safe // true')
    SEVERITY=$(echo "$REVIEW" | jq -r '.severity // "ok"')
    SUMMARY=$(echo "$REVIEW" | jq -r '.summary // "No summary"')
    
    echo "[$TIMESTAMP] [$SEVERITY] $TOOL_NAME: $FILE_PATH - $SUMMARY" >> "$LOG_FILE"
    echo "$REVIEW" | jq -c ". + {id:\"$REVIEW_ID\",file:\"$FILE_PATH\",tool:\"$TOOL_NAME\"}" >> "$DECISIONS_FILE"
    
    if [ "$SAFE" = "false" ] && [ "$SEVERITY" = "critical" ]; then
      echo "🛑 BLOCKED: $SUMMARY" >&2
      log_action "blocked" "$SUMMARY"
      
      # Save to queue for manual review
      echo "$INPUT" | jq ". + {review: $REVIEW}" > "$QUEUE_DIR/$REVIEW_ID.json"
      
      exit 1  # Non-zero exit blocks the action
    fi
    
    exit 0
    ;;

  *)
    echo "Unknown mode: $MODE" >&2
    exit 0
    ;;
esac
