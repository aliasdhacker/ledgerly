#!/bin/bash
# Install Claude Monitor
# Run: bash install.sh

set -e

DEST="$HOME/.claude/monitor"
SETTINGS="$HOME/.claude/settings.json"

echo "Installing Claude Monitor..."

# Create destination
mkdir -p "$DEST"
mkdir -p "$DEST/queue"

# Copy files
cp monitor.sh "$DEST/"
cp dashboard.sh "$DEST/"
chmod +x "$DEST/monitor.sh" "$DEST/dashboard.sh"

# Backup existing settings
if [ -f "$SETTINGS" ]; then
  cp "$SETTINGS" "$SETTINGS.backup"
  echo "Backed up existing settings to $SETTINGS.backup"
fi

# Create/update settings.json
cat > "$SETTINGS" << 'EOF'
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "(?i)(edit|write|create|str_replace|file_create)",
        "command": ["bash", "$HOME/.claude/monitor/monitor.sh"]
      }
    ]
  }
}
EOF

# Fix the $HOME in settings.json
sed -i.tmp "s|\$HOME|$HOME|g" "$SETTINGS" && rm -f "$SETTINGS.tmp"

echo ""
echo "✓ Installed to $DEST"
echo ""
echo "Next steps:"
echo ""
echo "1. Add to ~/.zshrc:"
echo "   export CLAUDE_MONITOR_MODE=\"review\""
echo "   export OLLAMA_HOST=\"localhost:11434\""
echo "   export OLLAMA_MODEL=\"llama3.2\""
echo "   alias claude-dash=\"bash ~/.claude/monitor/dashboard.sh\""
echo ""
echo "2. Reload shell: source ~/.zshrc"
echo ""
echo "3. Test: claude-dash status"
echo ""
echo "Modes:"
echo "  log    - Just log actions (default)"
echo "  review - Ollama reviews, alerts on issues"
echo "  strict - Ollama blocks unsafe changes"
