#!/bin/bash
# PostToolUse gate: run Express tests after any Edit or Write touching api-express/
# Exit 2 blocks the agent turn and surfaces failures for self-correction.

FILE=$(python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null)

# Only run for api-express/ files
[[ "$FILE" != *"api-express/"* ]] && exit 0

OUTPUT=$(npm test --prefix api-express 2>&1)
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "EXPRESS TEST GATE FAILED — fix before continuing:"
  echo "$OUTPUT"
  exit 2
fi

exit 0
