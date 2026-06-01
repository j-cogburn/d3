Cut a production release. Verifies staging, generates release notes from CHANGELOG, tags the version, and triggers the production deploy.

**Usage:**
- `/release 1.2.0` — cut a specific version
- `/release` — determine next version from git tags and prompt for confirmation

---

## Step 1 — Determine version

If `$ARGUMENTS` is empty:
```bash
git tag --sort=-version:refname | head -5
```
Suggest the next patch/minor version based on recent CHANGELOG entries. Ask the user to confirm the version before proceeding.

If `$ARGUMENTS` provides a version, use it directly.

---

## Step 2 — Confirm main is clean and pushed

```bash
git status --short
git log origin/main..main --oneline
```

If there are uncommitted changes or unpushed commits, stop: "Push all changes to origin/main before releasing."

---

## Step 3 — Staging health check

Read `CLAUDE.md` for staging deployment URLs. Then probe each staging service:

```bash
# Replace with actual staging URLs from CLAUDE.md
curl -sf <EXPRESS_STAGING_URL>/api/health && echo "Express OK" || echo "Express DOWN"
curl -sf <PYTHON_STAGING_URL>/health && echo "Python OK" || echo "Python DOWN"
curl -sf -o /dev/null -w "%{http_code}" <CLIENT_STAGING_URL>
```

Also smoke-test the staging client with Playwright (landing + login render without errors).

If any check fails, stop: "Fix staging before tagging production."

---

## Step 4 — Generate release notes

Read `CHANGELOG.md`. Collect all entries since the last git tag:

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

## Step 5 — Create the release

```bash
git tag v<version>
git push origin v<version>
```

Then create the GitHub release:
```bash
gh release create v<version> \
  --title "v<version>" \
  --notes "<release notes from Step 4>"
```

---

## Step 6 — Monitor production deploy

Read `CLAUDE.md` for the CI/CD pipeline details. After the tag is pushed, the production deploy workflow should trigger automatically.

```bash
gh run list --limit 5
```

Watch for the deploy to complete. Once done, probe production health endpoints (if documented in CLAUDE.md).

---

## Step 7 — Report

```
RELEASE COMPLETE
================
Version:    v<version>
Tag:        pushed to origin
GitHub:     <release URL>
Production: UP / deploying (check in N minutes)

Changes in this release:
  <summary of CHANGELOG entries since last tag>
```
