const fs = require('fs').promises;
const path = require('path');
const { pool } = require('../config/database');
const logger = require('../utils/logger');


async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  try {
    logger.info('Starting database migrations...');

    // Read all migration files
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Execute in alphabetical order

    if (sqlFiles.length === 0) {
      logger.warn('No migration files found');
      return;
    }

    // Execute each migration
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf8');

      logger.info(`Running migration: ${file}`);
      
      try {
        await pool.query(sql);
        logger.info(`✓ Migration completed: ${file}`);
      } catch (error) {
        logger.error(`✗ Migration failed: ${file}`, error);
        throw error;
      }
    }

    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration process failed', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      logger.info('Migration process finished');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration process failed', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };