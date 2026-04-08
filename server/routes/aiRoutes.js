import express from 'express';
import { aiService } from '../services/aiService.js';
import { tableRepo } from '../repository/tableRepository.js';

const router = express.Router();

// AI 增强解析 SQL 血缘
router.post('/ai/parse-lineage', async (req, res) => {
  try {
    const { sql, dialect, useAI } = req.body;

    if (!sql) {
      return res.status(400).json({ error: 'SQL 语句不能为空' });
    }

    const result = await aiService.parseLineage(sql, dialect || '自动检测', useAI !== false);
    res.json(result);
  } catch (err) {
    console.error('AI 解析失败:', err);
    res.status(500).json({ error: err.message });
  }
});

// 自然语言转 SQL
router.post('/ai/nl2sql', async (req, res) => {
  try {
    const { naturalLanguage } = req.body;

    if (!naturalLanguage) {
      return res.status(400).json({ error: '自然语言描述不能为空' });
    }

    // 获取物理模型 schema 信息
    const tables = await tableRepo.findAll();

    // 按 schema_id 分组
    const schemasMap = new Map();
    tables.forEach(table => {
      if (!schemasMap.has(table.schema_id)) {
        schemasMap.set(table.schema_id, {
          id: table.schema_id,
          name: table.schema_name,
          tables: []
        });
      }
      schemasMap.get(table.schema_id).tables.push({
        id: table.id,
        name: table.name,
        comment: table.comment,
        desc: table.desc,
        fields: []
      });
    });

    // 获取每个表的字段
    for (const [schemaId, schema] of schemasMap) {
      for (const table of schema.tables) {
        const fields = await tableRepo.getFields(table.id);
        table.fields = fields.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type,
          len: f.len,
          precision: f.precision,
          comment: f.comment,
          desc: f.desc
        }));
      }
    }

    const schemas = Array.from(schemasMap.values());
    const result = await aiService.nl2sql(naturalLanguage, schemas);
    res.json(result);
  } catch (err) {
    console.error('NL2SQL 失败:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
