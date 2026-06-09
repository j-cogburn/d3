#!/bin/bash
# PostToolUse hook: run pip-audit on api-python when dependency files change.
# Only triggers on requirements.txt or pyproject.toml edits.
# Exit 2 blocks the agent if vulnerabilities are found.

DATA=$(cat)
FILE=$(echo "$DATA" | python3 -c "
import sys, json
d = json.loads(sys.stdin.read())
print(d.get('tool_input', {}).get('file_path', ''))
" 2>/dev/null)

# Only run when dependency files change in the python service
[[ "$FILE" != *"api-python/requirements.txt" && \
   "$FILE" != *"api-python/requirements"* && \
   "$FILE" != *"api-python/pyproject.toml" ]] && exit 0

# Check the service and venv exist
[ -d "api-python" ] || exit 0

# Try pip-audit via the project venv, fall back to system pip-audit
PIPIT=""
if [ -f "api-python/.venv/bin/pip-audit" ]; then
  PIPIT="api-python/.venv/bin/pip-audit"
elif which pip-audit > /dev/null 2>&1; then
  PIPIT="pip-audit"
else
  echo "pip-audit not found — skipping Python security scan."
  echo "Install with: pip install pip-audit"
  exit 0
fi

OUTPUT=$($PIPIT -r api-python/requirements.txt 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "SECURITY GATE — pip-audit found vulnerabilities in api-python:"
  echo "$OUTPUT"
  echo ""
  echo "Resolve these before continuing. Run: pip-audit -r api-python/requirements.txt --fix"
  exit 2
fi
