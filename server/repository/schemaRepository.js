import pool from '../db/postgres.js';

export const schemaRepo = {
  async findAll() {
    const result = await pool.query('SELECT * FROM schemas ORDER BY name');
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM schemas WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create(name, comment) {
    const result = await pool.query(
      'INSERT INTO schemas (name, comment) VALUES ($1, $2) RETURNING *',
      [name, comment]
    );
    return result.rows[0];
  },

  async update(id, name, comment) {
    const result = await pool.query(
      'UPDATE schemas SET name = $1, comment = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, comment, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM schemas WHERE id = $1', [id]);
  }
};
