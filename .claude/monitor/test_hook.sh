#!/bin/bash
# Simple test helper to simulate a Claude PostToolUse hook invocation
set -e

MONITOR="$HOME/.claude/monitor/monitor.sh"
if [ ! -f "$MONITOR" ]; then
  echo "Monitor not installed at $MONITOR. You can run the repo copy at .claude/monitor/monitor.sh for testing."
  MONITOR="$(dirname "$0")/monitor.sh"
fi

export OLLAMA_HOST="http://192.168.98.108:11434"
export OLLAMA_MODEL="llama3.1:8b"
export CLAUDE_MONITOR_MODE="review"

cat > /tmp/claude_hook_sample.json <<'JSON'
{
  "tool_name": "exampleTool",
  "file_path": "src/example.ts",
  "new_string": "console.log(\"hello\")",
  "actor": "test"
}
JSON

echo "Running monitor with sample input (output will be printed)"
cat /tmp/claude_hook_sample.json | bash "$MONITOR"

echo "Wrote raw input to ~/.claude/monitor/last_input.json for debugging"
