import pool from '../db/postgres.js';

export const glossaryRepo = {
  async findAll() {
    const result = await pool.query('SELECT * FROM glossaries ORDER BY term');
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM glossaries WHERE id = $1', [id]);
    return result.rows[0];
  },

  async create(data) {
    const result = await pool.query(
      `INSERT INTO glossaries (term, domain, owner, definition, status, dict_ref, std_ref)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.term, data.domain, data.owner, data.definition, data.status, data.dictRef, data.stdRef]
    );
    return result.rows[0];
  },

  async update(id, data) {
    const result = await pool.query(
      `UPDATE glossaries SET
      term = $1, domain = $2, owner = $3, definition = $4,
      status = $5, dict_ref = $6, std_ref = $7,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *`,
      [data.term, data.domain, data.owner, data.definition, data.status, data.dictRef, data.stdRef, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM glossaries WHERE id = $1', [id]);
  }
};
