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
UX_DATE=$(get_audit_date "ux-audit")
A11Y_DATE=$(get_audit_date "accessibility-audit")
VISION_DATE=$(get_audit_date "vision-audit")
CODE_DATE=$(get_audit_date "code-audit")

# ── Directives ────────────────────────────────────────────────────────────────
READY=$(grep -c '\*\*Status:\*\* ready' .d3/TASKS.md 2>/dev/null || echo 0)
IN_PROGRESS=$(grep -c 'in-progress' .d3/TASKS.md 2>/dev/null || echo 0)
READY_IDS=$(grep -B4 '\*\*Status:\*\* ready' .d3/TASKS.md 2>/dev/null | grep '### DIRECTIVE' | sed 's/### //' | sed 's/:.*//' | tr '\n' ' ')

# ── Vision ───────────────────────────────────────────────────────────────────
VISION=""
if [ -f ".d3/vision.md" ]; then
  VISION=$(awk '/^## Vision/{found=1; next} found && NF{print; exit}' .d3/vision.md 2>/dev/null)
fi

# ── Objectives ───────────────────────────────────────────────────────────────
ACTIVE_OBJECTIVES=$(grep -l 'Status.*active' .d3/objectives/obj-*.md 2>/dev/null | wc -l | tr -d ' ')
OBJECTIVE_SUMMARY=""
if [ "$ACTIVE_OBJECTIVES" -gt 0 ]; then
  OBJECTIVE_SUMMARY=$(grep -h '^\*\*ID:\*\*\|^# Objective:' .d3/objectives/obj-*.md 2>/dev/null | paste - - | sed 's/# Objective: //' | sed 's/\*\*ID:\*\* //' | awk '{print "  " $2 "  " $1}' | head -3)
fi

# ── Skills ───────────────────────────────────────────────────────────────────
LESSON_COUNT=$(ls .d3/docs/lessons/*.md 2>/dev/null | grep -v .gitkeep | wc -l | tr -d ' ')
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

# ── Intent-aware recommended action ──────────────────────────────────────────
# Detect likely session intent from multiple signals and surface the most
# relevant next action, not a generic fallback.

# Signal: are there PRs merged since the last tag that haven't been released?
UNRELEASED_MERGES=$(git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --oneline --merges 2>/dev/null | wc -l | tr -d ' ')

# Signal: is there work in-progress from last session?
NEEDS_REVIEW=$(grep -c 'needs-review' .d3/TASKS.md 2>/dev/null || echo 0)

# Signal: was the last session a large execution batch?
LAST_CHANGELOG_DATE=$(grep -m1 '^## ' .d3/CHANGELOG.md 2>/dev/null | sed 's/## //')
TODAY_DATE=$(date '+%Y-%m-%d')

# Determine intent profile and recommendation
if [ "$NEEDS_REVIEW" -gt 0 ]; then
  # Directives flagged by adversarial review need human attention
  RECOMMENDED="/status  ($NEEDS_REVIEW directive(s) need-review — adversarial review flagged issues)"
elif [ "$IN_PROGRESS" -gt 0 ]; then
  # Agents were running — likely picking up where we left off
  RECOMMENDED="/status  ($IN_PROGRESS directive(s) in-progress — check what's still running)"
elif [ "$ACTIVE_OBJECTIVES" -gt 0 ] && [ "$READY" -eq 0 ]; then
  RECOMMENDED="/objective  (active objective needs next phase)"
elif [ "$READY" -gt 0 ]; then
  RECOMMENDED="/execute  ($READY directive(s) ready to run)"
elif [ "$UNRELEASED_MERGES" -gt 0 ] && [ "$READY" -eq 0 ]; then
  # PRs merged but no tag yet — release context
  RECOMMENDED="/release  ($UNRELEASED_MERGES merge(s) since last tag — ready to ship?)"
elif [ "$LAST_CHANGELOG_DATE" = "$TODAY_DATE" ] && [ "$READY" -eq 0 ]; then
  # Shipped something today — verify and sync
  RECOMMENDED="/verify  (changes shipped today — confirm they work)"
elif [ "$DOCS_DATE" = "never" ] && [ "$ACTIVE_OBJECTIVES" -eq 0 ]; then
  RECOMMENDED="/objective  (no objectives defined — start here)"
elif [ "$DOCS_DATE" = "never" ]; then
  RECOMMENDED="/audit docs  (no docs audit on record)"
elif [ "$UX_DATE" = "never" ]; then
  RECOMMENDED="/audit ux  (no UX audit on record)"
elif [ "$A11Y_DATE" = "never" ]; then
  RECOMMENDED="/audit accessibility  (no accessibility audit on record)"
else
  RECOMMENDED="/status  (check full snapshot for next action)"
fi

# ── Output ────────────────────────────────────────────────────────────────────
TODAY=$(date '+%Y-%m-%d')
echo "SESSION CONTEXT — ${TODAY}"
echo "=============================="
if [ -n "$VISION" ]; then
echo "Vision:     ${VISION}"
echo ""
fi
echo "Branch:     ${BRANCH} (${GIT_STATE})"
echo ""
if [ "$ACTIVE_OBJECTIVES" -gt 0 ]; then
echo "OBJECTIVES  (${ACTIVE_OBJECTIVES} active)"
echo "${OBJECTIVE_SUMMARY}"
echo ""
fi
echo "DIRECTIVES"
echo "  Ready:       ${READY}  ${READY_IDS}"
echo "  In-progress: ${IN_PROGRESS}"
echo ""
if [ "$LESSON_COUNT" -gt 0 ]; then
echo "LESSONS"
echo "  $LESSON_COUNT in .d3/docs/lessons/ — injected into agent briefs for relevant services"
echo ""
fi
if [ "$SKILL_COUNT" -gt 0 ]; then
echo "SKILLS"
echo "  ${SKILL_COUNT} available in .d3/skills/"
echo ""
fi
echo "LAST AUDIT"
echo "  docs:          ${DOCS_DATE}"
echo "  product:       ${PRODUCT_DATE}"
echo "  design:        ${DESIGN_DATE}"
echo "  ux:            ${UX_DATE}"
echo "  accessibility: ${A11Y_DATE}"
echo "  vision:        ${VISION_DATE}"
echo "  code:          ${CODE_DATE}"
echo ""
echo "RECOMMENDED: ${RECOMMENDED}"
