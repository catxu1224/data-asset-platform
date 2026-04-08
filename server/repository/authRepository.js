import pool from '../db/postgres.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

export const userRepo = {
  // 创建用户
  async create(email, password, name) {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING *',
      [email, passwordHash, name]
    );
    return result.rows[0];
  },

  // 通过邮箱查找用户
  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  // 通过 ID 查找用户
  async findById(id) {
    const result = await pool.query('SELECT id, email, name, role, is_active, created_at FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  // 验证密码
  async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return null;

    // 返回不包含密码哈希的用户信息
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active
    };
  },

  // 更新密码
  async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, email, name',
      [passwordHash, userId]
    );
    return result.rows[0];
  }
};

// 密码重置令牌
export const resetTokenRepo = {
  // 创建令牌
  async create(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 小时后过期

    const result = await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [userId, token, expiresAt]
    );
    return { token, ...result.rows[0] };
  },

  // 验证令牌
  async verify(token) {
    const result = await pool.query(
      `SELECT prt.*, u.email, u.name
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
      [token]
    );
    return result.rows[0];
  },

  // 使用令牌
  async use(token) {
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE token = $1', [token]);
  },

  // 删除过期令牌
  async deleteExpired(userId) {
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  }
};
