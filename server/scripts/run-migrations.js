import { pool } from '../src/config/database.js';

async function runMigrations() {
  try {
    console.log('Starting schema migrations on Railway DB...');
    
    // 1. Clean invalid comments.created_by values first
    console.log('1. Cleaning invalid comments.created_by values...');
    await pool.execute(`
      UPDATE comments c
      LEFT JOIN users u ON u.id = c.created_by
      SET c.created_by = NULL
      WHERE c.created_by IS NOT NULL AND u.id IS NULL
    `);
    console.log('✓ Cleaned invalid comments.created_by values');

    // 2. Add polymorphic columns to comments if missing
    console.log('2. Adding polymorphic columns to comments...');
    
    // Check if commentable_type exists
    const [commentableTypeExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'commentable_type'
    `);
    if (commentableTypeExists[0].cnt === 0) {
      await pool.execute(`ALTER TABLE comments ADD COLUMN commentable_type ENUM('task','note','project') NOT NULL DEFAULT 'task'`);
    }
    
    // Check if commentable_id exists
    const [commentableIdExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'commentable_id'
    `);
    if (commentableIdExists[0].cnt === 0) {
      await pool.execute(`ALTER TABLE comments ADD COLUMN commentable_id INT NOT NULL DEFAULT 0`);
    }
    
    // Check if created_by exists
    const [createdByExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND COLUMN_NAME = 'created_by'
    `);
    if (createdByExists[0].cnt === 0) {
      await pool.execute(`ALTER TABLE comments ADD COLUMN created_by INT NULL`);
    }
    
    console.log('✓ Added polymorphic columns to comments');

    // 3. Make created_by nullable and add indexes/FK
    console.log('3. Adding indexes and foreign key to comments...');
    
    // Make created_by nullable
    await pool.execute(`ALTER TABLE comments MODIFY COLUMN created_by INT NULL`);
    
    // Check and create composite index
    const [compositeIdxExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND INDEX_NAME = 'idx_comments_commentable'
    `);
    if (compositeIdxExists[0].cnt === 0) {
      await pool.execute(`CREATE INDEX idx_comments_commentable ON comments(commentable_type, commentable_id)`);
    }
    
    // Check and create created_by index
    const [createdByIdxExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND INDEX_NAME = 'idx_comments_created_by'
    `);
    if (createdByIdxExists[0].cnt === 0) {
      await pool.execute(`CREATE INDEX idx_comments_created_by ON comments(created_by)`);
    }
    
    // Check and create FK
    const [fkExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comments' AND CONSTRAINT_NAME = 'fk_comments_created_by'
    `);
    if (fkExists[0].cnt === 0) {
      await pool.execute(`ALTER TABLE comments ADD CONSTRAINT fk_comments_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`);
    }
    
    console.log('✓ Added indexes and foreign key to comments');

    // 4. Normalize events table (owner_id -> created_by)
    console.log('4. Normalizing events table...');
    
    // Check if created_by exists in events
    const [eventsCreatedByExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'created_by'
    `);
    if (eventsCreatedByExists[0].cnt === 0) {
      await pool.execute(`ALTER TABLE events ADD COLUMN created_by INT NULL`);
    }
    
    // Copy owner_id to created_by where needed
    const [ownerIdExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME = 'owner_id'
    `);
    
    if (ownerIdExists[0].cnt > 0) {
      await pool.execute(`UPDATE events SET created_by = owner_id WHERE created_by IS NULL AND owner_id IS NOT NULL`);
      await pool.execute(`ALTER TABLE events DROP COLUMN owner_id`);
    }
    
    // Check and create index
    const [eventsIdxExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND INDEX_NAME = 'idx_events_created_by'
    `);
    if (eventsIdxExists[0].cnt === 0) {
      await pool.execute(`CREATE INDEX idx_events_created_by ON events(created_by)`);
    }
    
    // Check and create FK
    const [eventsFkExists] = await pool.execute(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND CONSTRAINT_NAME = 'fk_events_created_by'
    `);
    if (eventsFkExists[0].cnt === 0) {
      await pool.execute(`ALTER TABLE events ADD CONSTRAINT fk_events_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE`);
    }
    
    console.log('✓ Normalized events table');

    console.log('\n🎉 All migrations completed successfully!');
    
    // Verification query
    const [tables] = await pool.execute(`
      SELECT table_name, column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name IN ('comments', 'events')
      AND column_name IN ('commentable_type', 'commentable_id', 'created_by')
      ORDER BY table_name, column_name
    `);
    
    console.log('\nVerification - New columns added:');
    tables.forEach(row => {
      console.log(`${row.table_name}.${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();