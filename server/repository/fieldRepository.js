import pool from '../db/postgres.js';

export const fieldRepo = {
  async findById(id) {
    const result = await pool.query('SELECT * FROM fields WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByTable(tableId) {
    const result = await pool.query(
      'SELECT * FROM fields WHERE table_id = $1 ORDER BY id',
      [tableId]
    );
    return result.rows;
  },

  async create(tableId, fieldData) {
    const result = await pool.query(
      `INSERT INTO fields
      (table_id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc", dict_ref, term_ref, std_ref, fk_table_id, fk_field_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        tableId, fieldData.name, fieldData.type, fieldData.len, fieldData.precision,
        fieldData.pk || false, fieldData.fk || false, fieldData.nullable !== false,
        fieldData.comment, fieldData.desc, fieldData.dictRef, fieldData.termRef, fieldData.stdRef,
        fieldData.fkTableId, fieldData.fkFieldId
      ]
    );
    return result.rows[0];
  },

  async update(id, fieldData) {
    const result = await pool.query(
      `UPDATE fields SET
      name = $1, field_type = $2, len = $3, precision = $4,
      is_pk = $5, is_fk = $6, is_nullable = $7, comment = $8, "desc" = $9,
      dict_ref = $10, term_ref = $11, std_ref = $12,
      fk_table_id = $13, fk_field_id = $14,
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $15 RETURNING *`,
      [
        fieldData.name, fieldData.type, fieldData.len, fieldData.precision,
        fieldData.pk || false, fieldData.fk || false, fieldData.nullable !== false,
        fieldData.comment, fieldData.desc, fieldData.dictRef, fieldData.termRef, fieldData.stdRef,
        fieldData.fkTableId, fieldData.fkFieldId, id
      ]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM fields WHERE id = $1', [id]);
  }
};
