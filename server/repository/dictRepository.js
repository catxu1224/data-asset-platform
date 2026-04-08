import pool from '../db/postgres.js';

export const dictRepo = {
  async findAll() {
    const result = await pool.query('SELECT * FROM dicts ORDER BY term');
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM dicts WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create(data) {
    const result = await pool.query(
      `INSERT INTO dicts (term, term_type, definition, domain, physical_ref, term_ref, std_ref)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.term, data.type, data.definition, data.domain, data.physicalRef, data.termRef, data.stdRef]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const result = await pool.query(
      `UPDATE dicts SET
      term = $1, term_type = $2, definition = $3, domain = $4,
      physical_ref = $5, term_ref = $6, std_ref = $7,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *`,
      [data.term, data.type, data.definition, data.domain, data.physicalRef, data.termRef, data.stdRef, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM dicts WHERE id = $1', [id]);
  }
};
