#!/bin/bash
# PostToolUse hook: run npm audit on api-express when package files change.
# Only triggers on package.json or package-lock.json edits.
# Exit 2 blocks the agent if high/critical vulnerabilities are found.

DATA=$(cat)
FILE=$(echo "$DATA" | python3 -c "
import sys, json
d = json.loads(sys.stdin.read())
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null)

# Only run when package files change in the express service
[[ "$FILE" != *"api-express/package.json" && "$FILE" != *"api-express/package-lock.json" ]] && exit 0

# Check npm is available and the directory exists
[ -d "api-express" ] || exit 0
which npm > /dev/null 2>&1 || exit 0

OUTPUT=$(npm audit --audit-level=high --prefix api-express 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "SECURITY GATE — npm audit found high/critical vulnerabilities in api-express:"
  echo "$OUTPUT"
  echo ""
  echo "Resolve these before continuing. Run: npm audit fix --prefix api-express"
  exit 2
fi
