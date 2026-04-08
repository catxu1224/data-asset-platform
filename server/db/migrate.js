import pool from './postgres.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(fileName) {
  try {
    const sqlPath = path.join(__dirname, 'migrations', fileName);
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // 使用 PostgreSQL 协议直接执行整个 SQL 文件
    await pool.query(sql);

    console.log(`✅ Migration ${fileName} executed successfully`);
  } catch (err) {
    console.error(`❌ Error executing ${fileName}:`, err.message);
    throw err;
  }
}

async function initLineageTables() {
  try {
    const sqlPath = path.join(__dirname, 'init-lineage-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    await pool.query(sql);

    console.log('✅ Lineage tables created successfully');
  } catch (err) {
    console.error('❌ Error creating lineage tables:', err.message);
    throw err;
  }
}

async function migrate() {
  try {
    console.log('🚀 Starting database migrations...');

    // 按顺序执行迁移文件
    const migrations = [
      '001_initial.sql',
      '002_users.sql',
      '003_update_physical_model.sql',
      '004_change_id_to_varchar.sql',
      '005_change_all_ids_to_varchar.sql',
      '006_sample_data.sql'
    ];

    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, 'migrations', migration);
      if (fs.existsSync(migrationPath)) {
        console.log(`Running ${migration}...`);
        await runMigration(migration);
      } else {
        console.log(`⚠️  Migration ${migration} not found, skipping...`);
      }
    }

    // 初始化血缘表
    console.log('Initializing lineage tables...');
    await initLineageTables();

    console.log('\n✅ All migrations completed successfully!');
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

migrate();
