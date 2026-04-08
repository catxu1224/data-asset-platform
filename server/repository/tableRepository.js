import pool from '../db/postgres.js';

export const tableRepo = {
  async findAll() {
    const result = await pool.query(`
      SELECT t.*, s.name as schema_name
      FROM tables t
      LEFT JOIN schemas s ON t.schema_id = s.id
      ORDER BY s.name, t.name
    `);
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(`
      SELECT t.*, s.name as schema_name
      FROM tables t
      LEFT JOIN schemas s ON t.schema_id = s.id
      WHERE t.id = $1
    `, [id]);
    return result.rows[0];
  },

  async findBySchema(schemaId) {
    const result = await pool.query(
      'SELECT * FROM tables WHERE schema_id = $1 ORDER BY name',
      [schemaId]
    );
    return result.rows;
  },

  async createWithFields(schemaId, id, name, comment, desc, fields) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 插入表
      const tableResult = await client.query(
        'INSERT INTO tables (schema_id, id, name, comment, "desc") VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [schemaId, id, name, comment, desc]
      );
      const table = tableResult.rows[0];

      // 插入字段
      if (fields && fields.length > 0) {
        for (const field of fields) {
          await client.query(
            `INSERT INTO fields
            (table_id, id, name, field_type, len, precision, is_pk, is_fk, is_nullable, comment, "desc", dict_ref, term_ref, std_ref)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              table.id, field.id, field.name, field.type, field.len, field.precision,
              field.pk || false, field.fk || false, field.nullable !== false,
              field.comment, field.desc, field.dictRef, field.termRef, field.stdRef
            ]
          );
        }
      }

      await client.query('COMMIT');
      return this.findById(table.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async update(id, name, comment, desc) {
    const result = await pool.query(
      'UPDATE tables SET name = $1, comment = $2, "desc" = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
      [name, comment, desc, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM tables WHERE id = $1', [id]);
  },

  async getWithFields(tableId) {
    const client = await pool.connect();
    try {
      // 获取表信息
      const tableResult = await client.query(`
        SELECT t.*, s.name as schema_name
        FROM tables t
        LEFT JOIN schemas s ON t.schema_id = s.id
        WHERE t.id = $1
      `, [tableId]);

      const table = tableResult.rows[0];
      if (!table) return null;

      // 获取字段
      const fieldsResult = await client.query(
        'SELECT * FROM fields WHERE table_id = $1 ORDER BY id',
        [tableId]
      );

      table.fields = fieldsResult.rows.map(f => ({
        id: f.id,
        name: f.name,
        type: f.field_type,
        len: f.len,
        precision: f.precision,
        pk: f.is_pk,
        fk: f.is_fk,
        nullable: f.is_nullable,
        comment: f.comment,  // 字段中文名
        desc: f.desc,        // 字段描述
        dictRef: f.dict_ref,
        termRef: f.term_ref,
        stdRef: f.std_ref,
        fkTableId: f.fk_table_id,
        fkFieldId: f.fk_field_id
      }));

      return table;
    } finally {
      client.release();
    }
  },

  async getFields(tableId) {
    const result = await pool.query(
      `SELECT f.*,
              ft.name as fk_table_name,
              ff.name as fk_field_name
       FROM fields f
       LEFT JOIN tables ft ON f.fk_table_id = ft.id
       LEFT JOIN fields ff ON f.fk_field_id = ff.id
       WHERE f.table_id = $1
       ORDER BY f.id`,
      [tableId]
    );
    return result.rows.map(f => ({
      id: f.id,
      name: f.name,
      type: f.field_type,
      len: f.len,
      precision: f.precision,
      pk: f.is_pk,
      fk: f.is_fk,
      nullable: f.is_nullable,
      comment: f.comment,  // 字段中文名
      desc: f.desc,        // 字段描述
      dictRef: f.dict_ref,
      termRef: f.term_ref,
      stdRef: f.std_ref,
      fkTableId: f.fk_table_id,
      fkFieldId: f.fk_field_id,
      fkTable: f.fk_table_name,
      fkField: f.fk_field_name
    }));
  }
};
