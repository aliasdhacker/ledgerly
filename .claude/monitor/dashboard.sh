#!/bin/bash
# Claude Monitor Dashboard - View logs and manage queue
# Copy to: ~/.claude/monitor/dashboard.sh

MONITOR_DIR="$HOME/.claude/monitor"
LOG_FILE="$MONITOR_DIR/reviews.log"
DECISIONS_FILE="$MONITOR_DIR/decisions.jsonl"
QUEUE_DIR="$MONITOR_DIR/queue"

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

show_help() {
  echo "Claude Monitor Dashboard"
  echo ""
  echo "Usage: dashboard.sh [command]"
  echo ""
  echo "Commands:"
  echo "  status    Show current mode and stats"
  echo "  log       Show recent log entries"
  echo "  tail      Follow log in real-time"
  echo "  queue     Show blocked items awaiting review"
  echo "  approve   Approve a blocked item"
  echo "  stats     Show review statistics"
  echo "  mode      Show how to set monitoring mode"
  echo "  clear     Clear logs and queue"
  echo ""
}

show_status() {
  local mode="${CLAUDE_MONITOR_MODE:-log}"
  local queue_count=$(ls -1 "$QUEUE_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
  local log_lines=$(wc -l < "$LOG_FILE" 2>/dev/null | tr -d ' ' || echo "0")
  
  echo "╔══════════════════════════════════════╗"
  echo "║       Claude Monitor Status          ║"
  echo "╠══════════════════════════════════════╣"
  printf "║  Mode:        %-22s ║\n" "$mode"
  printf "║  Log entries: %-22s ║\n" "$log_lines"
  printf "║  Queue:       %-22s ║\n" "$queue_count items"
  echo "╚══════════════════════════════════════╝"
  
  if [ "$mode" = "log" ]; then
    echo -e "${YELLOW}ℹ️  Log mode: Actions logged but not reviewed${NC}"
  elif [ "$mode" = "review" ]; then
    echo -e "${BLUE}👁  Review mode: Ollama reviews, alerts on issues${NC}"
  elif [ "$mode" = "strict" ]; then
    echo -e "${RED}🛡  Strict mode: Unsafe changes blocked${NC}"
  fi
}

show_log() {
  local lines="${1:-20}"
  if [ -f "$LOG_FILE" ]; then
    echo "=== Last $lines log entries ==="
    tail -n "$lines" "$LOG_FILE" | while IFS= read -r line; do
      if [[ "$line" == *"[critical]"* ]]; then
        echo -e "${RED}$line${NC}"
      elif [[ "$line" == *"[warning]"* ]]; then
        echo -e "${YELLOW}$line${NC}"
      else
        echo -e "${GREEN}$line${NC}"
      fi
    done
  else
    echo "No log file found"
  fi
}

show_queue() {
  local files=("$QUEUE_DIR"/*.json)
  
  if [ ! -e "${files[0]}" ]; then
    echo -e "${GREEN}✓ Queue is empty${NC}"
    return
  fi
  
  local count=${#files[@]}
  echo "=== Blocked items ($count) ==="
  
  for file in "${files[@]}"; do
    local id=$(basename "$file" .json)
    local tool=$(jq -r '.tool_name // "unknown"' "$file")
    local path=$(jq -r '.file_path // .path // "unknown"' "$file")
    local summary=$(jq -r '.review.summary // "No summary"' "$file")
    
    echo -e "${RED}[$id]${NC} $tool: $path"
    echo "    $summary"
    echo ""
  done
}

approve_item() {
  local id="$1"
  if [ -z "$id" ]; then
    echo "Usage: dashboard.sh approve <id>"
    return 1
  fi
  
  local file="$QUEUE_DIR/$id.json"
  if [ -f "$file" ]; then
    rm "$file"
    echo -e "${GREEN}✓ Approved and removed: $id${NC}"
  else
    echo -e "${RED}✗ Not found: $id${NC}"
  fi
}

show_stats() {
  if [ ! -f "$DECISIONS_FILE" ]; then
    echo "No decisions recorded yet"
    return
  fi
  
  local total=$(wc -l < "$DECISIONS_FILE" | tr -d ' ')
  local critical=$(grep -c '"severity":"critical"' "$DECISIONS_FILE" 2>/dev/null || echo "0")
  local warning=$(grep -c '"severity":"warning"' "$DECISIONS_FILE" 2>/dev/null || echo "0")
  local blocked=$(grep -c '"decision":"blocked"' "$DECISIONS_FILE" 2>/dev/null || echo "0")
  
  echo "=== Review Statistics ==="
  echo "Total reviews:    $total"
  echo "Critical issues:  $critical"
  echo "Warnings:         $warning"
  echo "Blocked:          $blocked"
}

set_mode() {
  echo ""
  echo "Add to ~/.zshrc or ~/.bashrc:"
  echo ""
  echo "  export CLAUDE_MONITOR_MODE=\"review\"  # or: log, strict"
  echo "  export OLLAMA_HOST=\"localhost:11434\""
  echo "  export OLLAMA_MODEL=\"llama3.2\""
  echo ""
  echo "Then: source ~/.zshrc"
}

clear_all() {
  read -p "Clear all logs and queue? [y/N] " confirm
  if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    rm -f "$LOG_FILE" "$DECISIONS_FILE"
    rm -f "$QUEUE_DIR"/*.json 2>/dev/null
    echo -e "${GREEN}✓ Cleared${NC}"
  fi
}

# Ensure directories exist
mkdir -p "$QUEUE_DIR"

# Main
case "${1:-status}" in
  status) show_status ;;
  log)    show_log "${2:-20}" ;;
  tail)   tail -f "$LOG_FILE" ;;
  queue)  show_queue ;;
  approve) approve_item "$2" ;;
  stats)  show_stats ;;
  mode)   set_mode ;;
  clear)  clear_all ;;
  help|--help|-h) show_help ;;
  *)      show_help ;;
esac
