import pool from '../db/postgres.js';

export const standardRepo = {
  async findAll() {
    const result = await pool.query('SELECT * FROM standards ORDER BY name');
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM standards WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByIdWithValues(id) {
    const standard = await this.findById(id);
    if (!standard) return null;

    const valuesResult = await pool.query(
      'SELECT * FROM standard_values WHERE standard_id = $1 ORDER BY sort_order, code',
      [id]
    );
    standard.values = valuesResult.rows.map(v => ({
      id: v.id,
      code: v.code,
      label: v.label,
      labelEn: v.label_en
    }));
    return standard;
  },

  async createWithValues(name, description, values) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const standardResult = await client.query(
        'INSERT INTO standards (name, description) VALUES ($1, $2) RETURNING *',
        [name, description]
      );
      const standard = standardResult.rows[0];

      if (values && values.length > 0) {
        for (let i = 0; i < values.length; i++) {
          const v = values[i];
          await client.query(
            `INSERT INTO standard_values (standard_id, code, label, label_en, sort_order)
            VALUES ($1, $2, $3, $4, $5)`,
            [standard.id, v.code, v.label, v.labelEn, i]
          );
        }
      }

      await client.query('COMMIT');
      return this.findByIdWithValues(standard.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id, name, description) {
    const result = await pool.query(
      'UPDATE standards SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name, description, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM standards WHERE id = $1', [id]);
  },

  async addValue(standardId, code, label, labelEn) {
    const result = await pool.query(
      `INSERT INTO standard_values (standard_id, code, label, label_en)
      VALUES ($1, $2, $3, $4) RETURNING *`,
      [standardId, code, label, labelEn]
    );
    return result.rows[0];
  },

  async deleteValue(valueId) {
    await pool.query('DELETE FROM standard_values WHERE id = $1', [valueId]);
  }
};
