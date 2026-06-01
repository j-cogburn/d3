#!/bin/bash
# PostToolUse gate: pytest on api-python/ after any Edit or Write touching api-python/
# Exit 2 blocks the agent turn and surfaces failures for self-correction.
# Requires: api-python/.venv/bin/pytest (created by the standard Python setup).

FILE=$(python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null)

# Only run for api-python/ files
[[ "$FILE" != *"api-python/"* ]] && exit 0

# Resolve pytest from the venv
PYTEST="api-python/.venv/bin/pytest"
if [ ! -f "$PYTEST" ]; then
  echo "PYTEST GATE SKIPPED — $PYTEST not found (run: cd api-python && python -m venv .venv && .venv/bin/pip install -e .)"
  exit 0
fi

OUTPUT=$("$PYTEST" api-python/tests/ -q 2>&1)
STATUS=$?

if [ $STATUS -ne 0 ]; then
  echo "PYTEST GATE FAILED — fix before continuing:"
  echo "$OUTPUT"
  exit 2
fi

exit 0
