#!/usr/bin/env bash
# PreToolUse hook — append tool invocations to project audit log (Linux/macOS)
# Writes TSV: timestamp <TAB> tool <TAB> short_summary
# Non-blocking: errors are swallowed. Log path is gitignored.

set +e

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_DIR="$PROJECT_ROOT/.claude/logs"
LOG_FILE="$LOG_DIR/commands.tsv"

mkdir -p "$LOG_DIR" 2>/dev/null || exit 0

raw=$(cat)
[ -z "$raw" ] && exit 0

# Requires jq for JSON parsing. Skip silently if not installed.
command -v jq >/dev/null 2>&1 || exit 0

tool=$(printf '%s' "$raw" | jq -r '.tool_name // empty')
[ -z "$tool" ] && exit 0

case "$tool" in
    Bash)        summary=$(printf '%s' "$raw" | jq -r '.tool_input.command // empty') ;;
    Edit|Write|Read) summary=$(printf '%s' "$raw" | jq -r '.tool_input.file_path // empty') ;;
    Glob|Grep)   summary=$(printf '%s' "$raw" | jq -r '.tool_input.pattern // empty') ;;
    *)           summary='' ;;
esac

# Truncate summary to 200 chars, replace newlines with spaces
summary=$(printf '%s' "$summary" | tr '\n\r' '  ' | cut -c1-200)

ts=$(date -Iseconds)
printf '%s\t%s\t%s\n' "$ts" "$tool" "$summary" >> "$LOG_FILE" 2>/dev/null

exit 0
