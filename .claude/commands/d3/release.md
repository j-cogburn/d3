Cut a production release. Verifies staging, runs tests, generates release notes, tags the version, verifies post-deploy, and documents rollback steps.

**Usage:**
- `/release 1.2.0` — cut a specific version
- `/release` — determine next version from git tags and prompt for confirmation

Invoke `shipping-and-launch` from `.d3/skills/shipping-and-launch/SKILL.md` throughout this process.

---

## Step 1 — Determine version

If `$ARGUMENTS` is empty:
```bash
git tag --sort=-version:refname | head -5
```
Suggest the next patch/minor version based on recent CHANGELOG entries. Ask the user to confirm before proceeding.

If `$ARGUMENTS` provides a version, use it directly.

**Immediately update `package.json` to match the version before proceeding:**
```bash
python3 -c "
import json, sys
v = sys.argv[1]
pkg = json.load(open('package.json'))
pkg['version'] = v
json.dump(pkg, open('package.json', 'w'), indent=2)
open('package.json', 'a').write('\n')
print('package.json updated to', v)
" <version>
git add package.json
```
This keeps `package.json`, git tags, and `d3 update` version reporting in sync.

---

## Step 2 — Confirm main is clean and pushed

```bash
git status --short
git log origin/main..main --oneline
```

If there are uncommitted changes or unpushed commits, stop: "Push all changes to origin/main before releasing."

---

## Step 3 — Migration safety check

Invoke `migration-safety` from `.d3/skills/migration-safety/SKILL.md`.

Identify all migration files added since the last tag:
```bash
git diff $(git describe --tags --abbrev=0 2>/dev/null)..HEAD --name-only \
  | grep -iE 'migration|alembic/versions|schema\.(sql|prisma)'
```

If no migration files: skip to Step 4.

For each migration file found:
1. Read the file and scan for dangerous patterns (NOT NULL, DROP, type changes, mass UPDATE, UNIQUE constraints)
2. Report each dangerous pattern with a risk assessment
3. For each dangerous pattern, require explicit confirmation before proceeding:
   ```
   ⚠ MIGRATION RISK: <file>
      <pattern> — <why it's risky>
      Mitigation: <safe alternative>
   
   Confirm: proceed / abort release
   ```
4. Document rollback steps for this release using the template in the migration-safety skill

If any migration is irreversible and no backup is confirmed, ask: "Has a database backup been taken? This migration cannot be rolled back."

---

## Step 4 — Run tests

Run `/test` to confirm all services pass before tagging. If tests fail, stop: "Fix failing tests before releasing."

---

## Step 5 — Staging health check

Read `CLAUDE.md` for staging deployment URLs. Probe each staging service:

```bash
curl -sf <EXPRESS_STAGING_URL>/api/health && echo "Express OK" || echo "Express DOWN"
curl -sf <PYTHON_STAGING_URL>/health && echo "Python OK" || echo "Python DOWN"
curl -sf -o /dev/null -w "%{http_code}" <CLIENT_STAGING_URL>
```

Smoke-test staging with Playwright: landing page and login render without errors, no console errors.

Run Lighthouse against staging to catch performance regressions before tagging production:
```bash
npx --prefix /tmp/lhci lighthouse <CLIENT_STAGING_URL> \
  --chrome-flags="--headless --no-sandbox" \
  --output=json --output-path=/tmp/lh-staging.json 2>/dev/null
```
Compare against `.d3/reports/performance-baseline.json`. If any Core Web Vitals metric has regressed by more than 10%, stop and report.

If any check fails, stop: "Fix staging before tagging production."

---

## Step 6 — Generate release notes

Read `.d3/CHANGELOG.md`. Collect all entries since the last git tag:

```bash
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "")..HEAD --oneline 2>/dev/null
```

Format as GitHub release notes:
```markdown
## What's New in vX.Y.Z

### Added
- <entry from CHANGELOG>

### Changed
- <entry from CHANGELOG>

### Fixed
- <entry from CHANGELOG>
```

---

## Step 7 — Document rollback steps

Before tagging, record the rollback procedure for this release:

```
Rollback for vX.Y.Z:
  Previous tag: vX.Y.Z-1
  To roll back: git revert v<version> or redeploy from <previous-tag>
  DB migrations: <list any irreversible schema changes — if none, say "none">
```

Print this to the user. If there are irreversible DB migrations, ask to confirm before proceeding.

---

## Step 8 — Tag and release

```bash
git tag v<version>
git push origin v<version>
```

Create the GitHub release:
```bash
gh release create v<version> \
  --title "v<version>" \
  --notes "<release notes from Step 6>"
```

---

## Step 9 — Monitor and verify production

```bash
gh run list --limit 5
```

Watch for the deploy workflow to complete. Once done:

1. Probe production health endpoints (from `CLAUDE.md`):
```bash
curl -sf <EXPRESS_PROD_URL>/api/health && echo "Express OK" || echo "Express DOWN"
```

2. Smoke-test production with Playwright: verify the same surfaces tested in staging load correctly in production. Check for console errors or failed requests.

3. If anything fails: execute the rollback procedure documented in Step 7 and report.

---

## Step 10 — Update CHANGELOG

Add a release marker to `.d3/CHANGELOG.md`:

```markdown
## v<version> — YYYY-MM-DD
<!-- entries already listed above; this marks the release boundary -->
```

---

## Step 11 — Report

```
RELEASE COMPLETE
================
Version:    v<version>
Tag:        pushed to origin
GitHub:     <release URL>
Tests:      all passing
Production: UP / verified
Rollback:   v<previous-version> (no irreversible migrations / see note)

Changes in this release:
  <summary of CHANGELOG entries since last tag>
```

**Track integration:** If `.d3/track.md` exists with an active sprint and this release
fulfils the sprint's success definition: "Run `/track sprint close` to verify exit
criteria and advance the course to the next sprint."
