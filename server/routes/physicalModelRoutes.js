import express from 'express';
import { schemaRepo } from '../repository/schemaRepository.js';
import { tableRepo } from '../repository/tableRepository.js';
import { fieldRepo } from '../repository/fieldRepository.js';

const router = express.Router();

// ===== Schemas =====
router.get('/schemas', async (req, res) => {
  try {
    const schemas = await schemaRepo.findAll();
    res.json(schemas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/schemas', async (req, res) => {
  try {
    const { name, comment } = req.body;
    const schema = await schemaRepo.create(name, comment);
    res.json(schema);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/schemas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, comment } = req.body;
    const schema = await schemaRepo.update(id, name, comment);
    res.json(schema);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/schemas/:id', async (req, res) => {
  try {
    await schemaRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Tables =====
router.get('/tables', async (req, res) => {
  try {
    const tables = await tableRepo.findAll();
    // 为每个表加载字段
    const tablesWithFields = await Promise.all(
      tables.map(async (t) => {
        const fields = await tableRepo.getFields(t.id);
        return { ...t, fields };
      })
    );
    res.json(tablesWithFields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tables/:id', async (req, res) => {
  try {
    const table = await tableRepo.getWithFields(req.params.id);
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schemas/:schemaId/tables', async (req, res) => {
  try {
    const tables = await tableRepo.findBySchema(req.params.schemaId);
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/tables', async (req, res) => {
  try {
    const { schemaId, name, comment, desc, fields } = req.body;
    const table = await tableRepo.createWithFields(schemaId, name, comment, desc, fields);
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tables/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, comment, desc } = req.body;
    const table = await tableRepo.update(id, name, comment, desc);
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tables/:id', async (req, res) => {
  try {
    await tableRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Fields =====
router.post('/tables/:tableId/fields', async (req, res) => {
  try {
    const { tableId } = req.params;
    const fieldData = req.body;
    const field = await fieldRepo.create(tableId, fieldData);
    res.json(field);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const fieldData = req.body;
    const field = await fieldRepo.update(id, fieldData);
    res.json(field);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/fields/:id', async (req, res) => {
  try {
    await fieldRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
