#!/bin/bash
# Update the PostToolUse hook matcher in ~/.claude/settings.json to a broader pattern
set -e

SETTINGS="$HOME/.claude/settings.json"
NEW_MATCHER='(?i)(edit|write|create|file_write|file_create|file|replace|modify|str_replace|posttooluse|post_tool_use|tool_use|postToolUse)'

if [ ! -f "$SETTINGS" ]; then
  echo "No settings.json at $SETTINGS"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to update $SETTINGS. Install jq and retry."
  exit 1
fi

tmpfile=$(mktemp)
jq --arg m "$NEW_MATCHER" '.hooks.PostToolUse[0].matcher = $m' "$SETTINGS" > "$tmpfile" && mv "$tmpfile" "$SETTINGS"
echo "Updated matcher in $SETTINGS to: $NEW_MATCHER"
