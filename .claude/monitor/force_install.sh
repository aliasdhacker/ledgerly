#!/usr/bin/env bash
# Force-install monitor files from this repo into $HOME/.claude/monitor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SRC_DIR="$REPO_ROOT/.claude/monitor"
DEST_DIR="$HOME/.claude/monitor"

echo "Installing monitor files from $SRC_DIR to $DEST_DIR"
mkdir -p "$DEST_DIR"

files=(monitor.sh dashboard.sh install.sh test_hook.sh update_settings_matcher.sh)
for f in "${files[@]}"; do
  if [ -f "$SRC_DIR/$f" ]; then
    echo "Copying $f"
    cp -f "$SRC_DIR/$f" "$DEST_DIR/"
    chmod 755 "$DEST_DIR/$f" || true
  else
    echo "Skipping missing $f"
  fi
done

echo "Ensure decisions/logs/queue exist"
mkdir -p "$DEST_DIR/queue"
touch "$DEST_DIR/reviews.log" "$DEST_DIR/decisions.jsonl" || true

echo "Done. To test, run:"
echo "  export CLAUDE_MONITOR_MODE=\"review\""
echo "  export OLLAMA_HOST=\"http://192.168.98.108:11434\""
echo "  echo '{\"tool_name\":\"test\",\"file_path\":\"x.txt\",\"content\":\"console.log(\\\"hi\\\")\"}' | bash $DEST_DIR/monitor.sh"

exit 0
