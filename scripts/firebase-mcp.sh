#!/bin/sh
# Starts Firebase's MCP server for Claude Code (see .mcp.json).
# Auth: run `firebase login` on your own machine, or in a cloud session put the service
# account JSON in the FIREBASE_SERVICE_ACCOUNT environment variable.
if [ -n "$FIREBASE_SERVICE_ACCOUNT" ] && [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  umask 077
  key="${TMPDIR:-/tmp}/firebase-service-account.json"
  printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$key"
  export GOOGLE_APPLICATION_CREDENTIALS="$key"
fi
exec npx -y firebase-tools@15.33.0 mcp --dir "$(cd "$(dirname "$0")/.." && pwd)"
