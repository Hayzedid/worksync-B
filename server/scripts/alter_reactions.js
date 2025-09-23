import { pool } from '../src/config/database.js';

(async function(){
  try {
    await pool.query("ALTER TABLE reactions MODIFY COLUMN target_type ENUM('task','comment','note') NOT NULL");
    console.log('ALTER OK');
    process.exit(0);
  } catch (e) {
    console.error('ALTER ERR', e.message);
    process.exit(1);
  }
})();
