import pool from './postgres.js';
import bcrypt from 'bcrypt';

async function createAdmin() {
  const email = 'admin@example.com';
  const password = '123456';
  const name = '管理员';

  try {
    // 检查用户是否已存在
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      console.log('ℹ️  Admin user already exists');
      process.exit(0);
    }

    // 创建用户
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, passwordHash, name, 'admin']
    );

    console.log('✅ Admin user created:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Name: ${name}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createAdmin();
