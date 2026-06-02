#!/bin/bash
# UserPromptSubmit hook: inject project context once at the start of each Claude Code session.
# Uses session_id as a marker so this runs exactly once per session, not on every message.

DATA=$(cat)
SESSION_ID=$(echo "$DATA" | python3 -c "
import sys, json
d = json.loads(sys.stdin.read())
print(d.get('session_id', 'unknown'))
" 2>/dev/null)

MARKER="/tmp/alphalab-session-${SESSION_ID}"
[ -f "$MARKER" ] && exit 0
touch "$MARKER"

# ── Last audit dates ──────────────────────────────────────────────────────────
get_audit_date() {
  local pattern="$1"
  local file
  file=$(ls -t .d3/reports/${pattern}-*.md 2>/dev/null | head -1)
  if [ -n "$file" ]; then
    basename "$file" | sed "s/${pattern}-//" | sed 's/-..\..*//' | sed 's/-[0-9]*$//'
  else
    echo "never"
  fi
}

DOCS_DATE=$(get_audit_date "docs-audit")
PRODUCT_DATE=$(get_audit_date "product-audit")
DESIGN_DATE=$(get_audit_date "design-audit")
VISION_DATE=$(get_audit_date "vision-audit")
CODE_DATE=$(get_audit_date "code-audit")

# ── Directives ────────────────────────────────────────────────────────────────
READY=$(grep -c '\*\*Status:\*\* ready' .d3/TASKS.md 2>/dev/null || echo 0)
IN_PROGRESS=$(grep -c 'in-progress' .d3/TASKS.md 2>/dev/null || echo 0)
READY_IDS=$(grep -B4 '\*\*Status:\*\* ready' .d3/TASKS.md 2>/dev/null | grep '### DIRECTIVE' | sed 's/### //' | sed 's/:.*//' | tr '\n' ' ')

# ── Skills ───────────────────────────────────────────────────────────────────
SKILL_COUNT=$(ls .d3/skills/ 2>/dev/null | wc -l | tr -d ' ')

# ── Git state ─────────────────────────────────────────────────────────────────
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
DIRTY=$(git status --short 2>/dev/null | wc -l | tr -d ' ')
AHEAD=$(git log origin/main..main --oneline 2>/dev/null | wc -l | tr -d ' ')

if [ "$DIRTY" -gt 0 ]; then
  GIT_STATE="$DIRTY dirty files"
elif [ "$AHEAD" -gt 0 ]; then
  GIT_STATE="$AHEAD commits ahead of origin"
else
  GIT_STATE="clean"
fi

# ── Recommended action ────────────────────────────────────────────────────────
if [ "$READY" -gt 0 ]; then
  RECOMMENDED="/execute  ($READY directive(s) ready to run)"
elif [ "$DOCS_DATE" = "never" ]; then
  RECOMMENDED="/audit docs  (no docs audit on record)"
else
  RECOMMENDED="/status  (nothing ready — check full snapshot)"
fi

# ── Output ────────────────────────────────────────────────────────────────────
TODAY=$(date '+%Y-%m-%d')
echo "SESSION CONTEXT — ${TODAY}"
echo "=============================="
echo "Branch:     ${BRANCH} (${GIT_STATE})"
echo ""
echo "DIRECTIVES"
echo "  Ready:       ${READY}  ${READY_IDS}"
echo "  In-progress: ${IN_PROGRESS}"
echo ""
if [ "$SKILL_COUNT" -gt 0 ]; then
echo "SKILLS"
echo "  ${SKILL_COUNT} available in .d3/skills/"
echo ""
fi
echo "LAST AUDIT"
echo "  docs:    ${DOCS_DATE}"
echo "  product: ${PRODUCT_DATE}"
echo "  design:  ${DESIGN_DATE}"
echo "  vision:  ${VISION_DATE}"
echo "  code:    ${CODE_DATE}"
echo ""
echo "RECOMMENDED: ${RECOMMENDED}"
