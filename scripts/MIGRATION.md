# Legacy Migration Guide

## Safety Guarantees
1. **Dry-Run by Default**: Running `node scripts/migrate-legacy.js` executes in dry-run mode. It inspects documents, tests password hashing, verifies invoice files on disk, and outputs a report without modifying ANY data.
2. **Explicit Opt-in**: Migration only applies modifications when the `--apply` flag is passed.
3. **No Legacy Deletions**: The source database is never modified or deleted. Legacy collections remain completely untouched.
4. **Idempotent**: Existing records in the target database are not overwritten. Old `_id` values are preserved for referential integrity.
5. **Secure Passwords**: Plaintext passwords from the legacy system are hashed with `bcrypt` (10 rounds).
6. **Invoice File Integrity**: Existing files in `public/uploads/` are verified and referenced without modification.

## Running Migration

### 1. Perform a Dry Run (Recommended first step)
```bash
node scripts/migrate-legacy.js
```

### 2. Apply Migration
```bash
node scripts/migrate-legacy.js --apply
```

### Custom Source / Target URIs
```bash
node scripts/migrate-legacy.js --source-uri mongodb://127.0.0.1:27017/test --target-uri mongodb://127.0.0.1:27017/inventory_management --apply
```
