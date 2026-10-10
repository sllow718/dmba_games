#!/bin/sh
# Starts Firebase's MCP server for Claude Code (see .mcp.json).
# Auth: run `firebase login` on your own machine, or in a cloud session put the service
# account key in the FIREBASE_SERVICE_ACCOUNT environment variable, either base64-encoded
# (one line, safest for KEY=value settings boxes) or as one-line JSON.
if [ -n "$FIREBASE_SERVICE_ACCOUNT" ] && [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  umask 077
  key="${TMPDIR:-/tmp}/firebase-service-account.json"
  case "$FIREBASE_SERVICE_ACCOUNT" in
    \{*) printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$key" ;;
    *) printf '%s' "$FIREBASE_SERVICE_ACCOUNT" | tr -d ' \r\n' | base64 -d > "$key" 2>/dev/null ;;
  esac
  export GOOGLE_APPLICATION_CREDENTIALS="$key"
fi
exec npx -y firebase-tools@15.33.0 mcp --dir "$(cd "$(dirname "$0")/.." && pwd)"
