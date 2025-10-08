This folder contains Knex migration files. I added three new migrations (20251008_*) to capture recent schema changes that were previously applied directly as SQL.

How to run migrations locally

1. Install dependencies (if not already):

   npm install

2. Ensure your environment variables point to the target DB (development or a test DB). For example (PowerShell):

   $env:DB_HOST='localhost'; $env:DB_USER='root'; $env:DB_PASSWORD=''; $env:DB_NAME='worksync'; npm run knex -- migrate:latest

Or using the project npm script if defined (check package.json). You can also run the knex binary directly if installed globally.

Safety notes

- The migrations are written to be idempotent where possible (they check INFORMATION_SCHEMA before creating indexes/FKs). However, adding foreign keys can fail if there are invalid referencing rows (e.g., comments.created_by = 0). Clean those rows first.
- I recommend running the migrations against a staging or local copy of your Railway database before applying to production.

Verification steps (smoke tests)

1. Run the project's API server connected to the same DB.
2. Use the smoke test script (if available) or run these checks manually:

   - POST /api/auth/login with a test user -> expect 200 and token
   - GET /api/tasks with token -> expect 200
   - GET attachments endpoints for a sample task -> expect 200 and attachments array

This folder contains SQL migration files for the WorkSync project.

## Recent Schema Changes (October 8, 2025)

The following schema changes were applied to the Railway database:

1. **Comments Table - Polymorphic Support**: Added `commentable_type`, `commentable_id`, and `created_by` columns to support polymorphic associations (tasks, notes, projects)
2. **Comments Table - Performance**: Added indexes on `(commentable_type, commentable_id)` and `created_by`, plus foreign key constraint to `users(id)`
3. **Events Table - Normalization**: Standardized ownership by migrating `owner_id` → `created_by` for consistency across tables
4. **Data Cleaning**: Removed invalid `created_by` references that pointed to non-existent users

## How to Apply Schema Changes

This project uses a simple database connection approach rather than a formal migration framework. For schema changes:

1. **Create a migration script** in `server/scripts/` following the pattern in `run-migrations.js`
2. **Use INFORMATION_SCHEMA queries** to check for existing columns/indexes before creating them
3. **Test against a staging/local database first**

### Example Migration Pattern

```javascript
import { pool } from '../src/config/database.js';

async function runMigration() {
  try {
    // Check if column exists
    const [columnExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'your_table' AND COLUMN_NAME = 'your_column'
    `);
    
    if (columnExists[0].cnt === 0) {
      await pool.execute(`ALTER TABLE your_table ADD COLUMN your_column INT NULL`);
      console.log('✓ Added column');
    }
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}
```

## Verification

After applying schema changes, run the smoke tests:

```powershell
$env:SMOKE_TEST_EMAIL='your-test-email'; $env:SMOKE_TEST_PASSWORD='your-password'; node scripts/api-smoke-tests.cjs
```

## Files in this directory

- `.sql` files: Raw SQL migrations (some applied manually, others are templates)
- `README.md`: This documentation
- The actual schema is defined in `src/config/initDatabase.js`
