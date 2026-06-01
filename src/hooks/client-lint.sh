#!/bin/bash
# PostToolUse gate: ESLint on client/ after any Edit or Write touching client/
# Exit 2 blocks the agent turn and surfaces errors for self-correction.

FILE=$(python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null)

# Only run for client/ files
[[ "$FILE" != *"client/"* ]] && exit 0

OUTPUT=$(npm run lint --prefix client 2>&1)
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "LINT GATE FAILED — fix before continuing:"
  echo "$OUTPUT"
  exit 2
fi

exit 0
