---
name: migration-safety
description: Guides agents through writing and reviewing database migrations safely. Covers dangerous patterns, zero-downtime techniques, rollback strategies, and pre-release migration validation. Use before running any migration in production, when writing schema changes, or when reviewing a release that includes migrations.
---

# Migration Safety

## Overview

Database migrations are the most dangerous part of a production release. Unlike code, schema changes can be irreversible, fail partway through, and block the entire application. A bad migration at 2AM is a production incident.

This skill applies to any database with schema management: PostgreSQL, MySQL, SQLite, MongoDB schema validation, or any ORM migration framework (Alembic, Prisma, Sequelize, Django migrations).

---

## When to Use

- Writing a migration that changes existing data or schema
- Reviewing a PR that includes migration files
- Running `/release` on a codebase that has migrations since the last tag
- Any time a migration touches a column with existing production data

---

## Dangerous patterns (require explicit confirmation before running)

### 1. NOT NULL without a default on an existing table

```sql
-- DANGEROUS: will fail on all existing rows
ALTER TABLE users ADD COLUMN verified BOOLEAN NOT NULL;

-- SAFE: add nullable first, backfill, then add constraint
ALTER TABLE users ADD COLUMN verified BOOLEAN;
UPDATE users SET verified = false WHERE verified IS NULL;
ALTER TABLE users ALTER COLUMN verified SET NOT NULL;
```

### 2. Dropping columns or tables

```sql
-- DANGEROUS: data loss, cannot be undone
ALTER TABLE users DROP COLUMN legacy_field;
DROP TABLE old_sessions;
```

Safe approach: use the expand-contract pattern (see below). Only drop after the application has been deployed without reading the column for at least one full release cycle.

### 3. Changing column types

```sql
-- DANGEROUS: may truncate data, may fail on incompatible values
ALTER TABLE orders ALTER COLUMN amount TYPE BIGINT;
ALTER TABLE users ALTER COLUMN status TYPE VARCHAR(10);  -- if any value > 10 chars
```

Safe approach: add a new column of the new type, backfill, migrate reads/writes via dual-write, then drop the old column.

### 4. Adding a unique constraint on existing data

```sql
-- DANGEROUS: will fail if duplicates exist
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);
```

Check first:
```sql
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
```

### 5. Removing an index

```sql
-- RISKY: may cause severe query performance regression
DROP INDEX idx_orders_user_id;
```

Always check `EXPLAIN ANALYZE` on critical queries before removing an index. Monitor query time after removal.

### 6. Large table operations without batching

```sql
-- DANGEROUS: locks the table for the duration
UPDATE orders SET status = 'active' WHERE status IS NULL;  -- on a 50M row table
```

Use batched updates with `LIMIT` and a loop for tables > 100k rows.

---

## The expand-contract pattern (zero-downtime migrations)

For any destructive change, use expand-contract across multiple releases:

```
Release 1 — EXPAND: add the new column/table alongside the old one
  - New code writes to both old and new
  - New code reads from old (new may be incomplete)

Release 2 — MIGRATE: backfill data from old to new
  - Run in batches to avoid locking
  - Verify completeness: SELECT COUNT(*) WHERE new_col IS NULL

Release 3 — CONTRACT: switch reads to new, stop writing to old
  - Deploy code that reads/writes only the new column
  - Old column is now unused but still exists

Release 4 — CLEANUP: drop the old column
  - Only after Release 3 has been stable for at least one cycle
  - Safe to drop now — no code references it
```

---

## Pre-release migration checklist

Run this before every release that includes migration files:

```bash
# 1. Identify new migration files since last tag
git diff $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~1")..HEAD \
  --name-only | grep -E 'migrations?/|alembic/versions|schema'

# 2. For each migration file, check for dangerous patterns
grep -E 'NOT NULL|DROP (TABLE|COLUMN)|ALTER COLUMN|UNIQUE|ADD CONSTRAINT' <migration_file>

# 3. Check table sizes for any tables being migrated
# PostgreSQL: SELECT pg_size_pretty(pg_relation_size('table_name'));
# MySQL: SELECT data_length + index_length FROM information_schema.tables WHERE table_name = 'table_name';

# 4. Verify the migration has a downgrade/rollback path
# Alembic: check for def downgrade(): section
# Django: verify --fake or reversal exists
# Prisma: verify previous state is captured
```

---

## Rollback documentation

Before every release with migrations, document:

```markdown
## Migration rollback for vX.Y.Z

### Migrations included
- `<filename>` — <what it does>

### Is rollback possible?
- [ ] Yes — use `alembic downgrade -1` / `python manage.py migrate <app> <previous>` / `prisma migrate dev --name rollback`
- [ ] Partial — <which parts can be rolled back>
- [ ] No — <which changes are irreversible and why>

### Irreversible changes
- <list any DROP COLUMN, DROP TABLE, data transformations that cannot be undone>

### Rollback procedure
1. Deploy previous version of application code
2. <specific rollback commands>
3. Verify: <what to check to confirm rollback succeeded>

### Data recovery (if needed)
- Backup taken: <yes/no — when>
- Recovery command: <if applicable>
```

---

## Common Rationalizations

| Excuse | Counter-argument |
|---|---|
| "It's a small table — it's fine to lock it" | Tables grow. Write the safe version now so it works when the table is large. |
| "The downgrade path is rarely used — skip it" | You will need the downgrade path at 2AM during a failed deployment. Write it now. |
| "NOT NULL with a default is safer than nullable" | Adding NOT NULL to an existing table locks and rewrites the table. Add nullable, backfill, then add constraint — three safe steps. |
| "We'll do the cleanup migration next sprint" | Expand-contract only works if you actually run the contract step. Schedule it immediately. |

---

## Red Flags

- Migration file has no corresponding downgrade/rollback function
- `NOT NULL` added to a column on an existing table without `DEFAULT` or prior backfill
- `DROP COLUMN` or `DROP TABLE` in a single release (not the contract step of an expand-contract)
- Mass `UPDATE` on a table known to be large without `LIMIT` batching
- Migration checked in without a pre-migration data check (e.g., checking for duplicates before adding a UNIQUE constraint)
- No table size estimate for migrations touching large tables

---

## Verification

- [ ] All dangerous patterns identified and confirmed with explicit user acknowledgement
- [ ] Downgrade/rollback path documented for every migration
- [ ] Irreversible changes listed explicitly
- [ ] Large table operations use batched updates
- [ ] Expand-contract pattern used for any column removal or type change
- [ ] Backup confirmed before release if migrations are irreversible
