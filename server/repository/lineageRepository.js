import pool from '../db/postgres.js';
import driver from '../db/neo4j.js';

export const lineageRepo = {
  // ===== 分类管理 =====
  async findAllCategories() {
    const result = await pool.query('SELECT * FROM lineage_categories ORDER BY sort_order, name');
    return result.rows;
  },

  async createCategory(name, description, sort_order = 0) {
    const result = await pool.query(
      `INSERT INTO lineage_categories (name, description, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET description = $2, sort_order = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [name, description, sort_order]
    );
    return result.rows[0];
  },

  async updateCategory(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.sort_order !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(data.sort_order);
    }

    if (fields.length === 0) return this.findCategoryById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE lineage_categories SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async deleteCategory(id) {
    await pool.query('UPDATE lineage_records SET category_id = NULL WHERE category_id = $1', [id]);
    await pool.query('DELETE FROM lineage_categories WHERE id = $1', [id]);
  },

  async findCategoryById(id) {
    const result = await pool.query('SELECT * FROM lineage_categories WHERE id = $1', [id]);
    return result.rows[0];
  },

  // ===== 血缘记录管理 =====
  async findAllRecords() {
    const result = await pool.query(`
      SELECT lr.*, lc.name as category_name
      FROM lineage_records lr
      LEFT JOIN lineage_categories lc ON lr.category_id = lc.id
      ORDER BY lr.created_at DESC
    `);
    return result.rows;
  },

  async findRecordById(id) {
    const result = await pool.query(`
      SELECT lr.*, lc.name as category_name
      FROM lineage_records lr
      LEFT JOIN lineage_categories lc ON lr.category_id = lc.id
      WHERE lr.id = $1
    `);
    return result.rows[0];
  },

  async findRecordsByCategory(categoryId) {
    const result = await pool.query(`
      SELECT lr.*, lc.name as category_name
      FROM lineage_records lr
      LEFT JOIN lineage_categories lc ON lr.category_id = lc.id
      WHERE lr.category_id = $1
      ORDER BY lr.created_at DESC
    `);
    return result.rows;
  },

  async saveRecord(data) {
    const {
      name,
      category_id,
      sql_text,
      dialect,
      source_tables,
      target_tables,
      mappings,
      nodes,
      edges,
      description,
      created_by
    } = data;

    const result = await pool.query(
      `INSERT INTO lineage_records
       (name, category_id, sql_text, dialect, source_tables, target_tables, mappings, nodes, edges, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        name,
        category_id || null,
        sql_text,
        dialect || 'PostgreSQL',
        source_tables || [],
        target_tables || [],
        mappings ? JSON.stringify(mappings) : null,
        nodes ? JSON.stringify(nodes) : null,
        edges ? JSON.stringify(edges) : null,
        description || null,
        created_by || null
      ]
    );
    return result.rows[0];
  },

  async updateRecord(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(data.name);
    }
    if (data.category_id !== undefined) {
      fields.push(`category_id = $${idx++}`);
      values.push(data.category_id);
    }
    if (data.sql_text !== undefined) {
      fields.push(`sql_text = $${idx++}`);
      values.push(data.sql_text);
    }
    if (data.dialect !== undefined) {
      fields.push(`dialect = $${idx++}`);
      values.push(data.dialect);
    }
    if (data.source_tables !== undefined) {
      fields.push(`source_tables = $${idx++}`);
      values.push(data.source_tables);
    }
    if (data.target_tables !== undefined) {
      fields.push(`target_tables = $${idx++}`);
      values.push(data.target_tables);
    }
    if (data.mappings !== undefined) {
      fields.push(`mappings = $${idx++}::jsonb`);
      values.push(JSON.stringify(data.mappings));
    }
    if (data.nodes !== undefined) {
      fields.push(`nodes = $${idx++}::jsonb`);
      values.push(JSON.stringify(data.nodes));
    }
    if (data.edges !== undefined) {
      fields.push(`edges = $${idx++}::jsonb`);
      values.push(JSON.stringify(data.edges));
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }

    if (fields.length === 0) return this.findRecordById(id);

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE lineage_records SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async deleteRecord(id) {
    await pool.query('DELETE FROM lineage_records WHERE id = $1', [id]);
  },

  // ===== 旧方法保留（向后兼容）=====
  async findAllSources() {
    const result = await pool.query('SELECT * FROM lineage_sources ORDER BY created_at DESC');
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM lineage_sources WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByIdWithMappings(id) {
    const source = await this.findById(id);
    if (!source) return null;

    const mappingsResult = await pool.query(
      'SELECT * FROM lineage_mappings WHERE source_id = $1',
      [id]
    );
    source.mappings = mappingsResult.rows.map(m => ({
      id: m.id,
      sourceField: m.source_field,
      sourceTable: m.source_table,
      targetField: m.target_field,
      targetTable: m.target_table,
      transformation: m.transformation
    }));
    return source;
  },

  async create(name, sourceType, sqlContent) {
    const result = await pool.query(
      'INSERT INTO lineage_sources (name, source_type, sql_content) VALUES ($1, $2, $3) RETURNING *',
      [name, sourceType, sqlContent]
    );
    return result.rows[0];
  },

  async addMapping(sourceId, mappingData) {
    const result = await pool.query(
      `INSERT INTO lineage_mappings
      (source_id, source_field, source_table, target_field, target_table, transformation)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        sourceId, mappingData.sourceField, mappingData.sourceTable,
        mappingData.targetField, mappingData.targetTable, mappingData.transformation
      ]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM lineage_sources WHERE id = $1', [id]);
  },

  // Neo4j 相关方法
  async saveToGraph(sourceData) {
    const session = driver.session();
    try {
      // 创建源节点
      await session.run(
        `MERGE (s:LineageSource {id: $id})
         SET s.name = $name, s.sourceType = $sourceType, s.updatedAt = datetime()`,
        { id: sourceData.id, name: sourceData.name, sourceType: sourceData.source_type }
      );

      // 创建字段映射关系
      if (sourceData.mappings) {
        for (const mapping of sourceData.mappings) {
          await session.run(
            `MATCH (s:LineageSource {id: $sourceId})
             MERGE (srcTbl:Table {name: $sourceTable})
             MERGE (tgtTbl:Table {name: $targetTable})
             MERGE (srcFld:Field {tableName: $sourceTable, fieldName: $sourceField})
             MERGE (tgtFld:Field {tableName: $targetTable, fieldName: $targetField})
             MERGE (srcFld)-[:BELONGS_TO]->(srcTbl)
             MERGE (tgtFld)-[:BELONGS_TO]->(tgtTbl)
             CREATE (s)-[:MAPS {transformation: $transformation}]->(tgtFld)
             CREATE (srcFld)-[:FLOWS_TO {via: $sourceId}]->(tgtFld)`,
            {
              sourceId: sourceData.id,
              sourceTable: mapping.source_table || 'UNKNOWN',
              sourceField: mapping.source_field || '*',
              targetTable: mapping.target_table,
              targetField: mapping.target_field,
              transformation: mapping.transformation
            }
          );
        }
      }
    } finally {
      await session.close();
    }
  },

  async getGraphData() {
    const session = driver.session();
    try {
      const result = await session.run(`
        MATCH (srcFld:Field)-[f:FLOWS_TO]->(tgtFld:Field)
        OPTIONAL MATCH (srcTbl:Table)<-[:BELONGS_TO]-(srcFld)
        OPTIONAL MATCH (tgtTbl:Table)<-[:BELONGS_TO]-(tgtFld)
        RETURN DISTINCT
          srcTbl.name as sourceTable,
          srcFld.fieldName as sourceField,
          tgtTbl.name as targetTable,
          tgtFld.fieldName as targetField,
          f.via as lineageId
        ORDER BY srcTbl.name, tgtTbl.name
      `);
      return result.records.map(r => r.toObject());
    } finally {
      await session.close();
    }
  }
};
