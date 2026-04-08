import express from 'express';
import { lineageRepo } from '../repository/lineageRepository.js';

const router = express.Router();

// ===== 分类管理 =====
router.get('/lineage/categories', async (req, res) => {
  try {
    const categories = await lineageRepo.findAllCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lineage/categories', async (req, res) => {
  try {
    const { name, description, sort_order } = req.body;
    if (!name) {
      return res.status(400).json({ error: '分类名称不能为空' });
    }
    const category = await lineageRepo.createCategory(name, description, sort_order);
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/lineage/categories/:id', async (req, res) => {
  try {
    const category = await lineageRepo.updateCategory(req.params.id, req.body);
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lineage/categories/:id', async (req, res) => {
  try {
    await lineageRepo.deleteCategory(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 血缘记录管理 =====
router.get('/lineage/records', async (req, res) => {
  try {
    const { category_id } = req.query;
    let records;
    if (category_id) {
      records = await lineageRepo.findRecordsByCategory(parseInt(category_id));
    } else {
      records = await lineageRepo.findAllRecords();
    }
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/lineage/records/:id', async (req, res) => {
  try {
    const record = await lineageRepo.findRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: '血缘记录不存在' });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lineage/records', async (req, res) => {
  try {
    const record = await lineageRepo.saveRecord(req.body);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/lineage/records/:id', async (req, res) => {
  try {
    const record = await lineageRepo.updateRecord(req.params.id, req.body);
    if (!record) {
      return res.status(404).json({ error: '血缘记录不存在' });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lineage/records/:id', async (req, res) => {
  try {
    await lineageRepo.deleteRecord(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== 旧路由保留（向后兼容）=====
// ===== Lineage Sources =====
router.get('/lineage/sources', async (req, res) => {
  try {
    const sources = await lineageRepo.findAllSources();
    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/lineage/sources/:id', async (req, res) => {
  try {
    const source = await lineageRepo.findByIdWithMappings(req.params.id);
    if (!source) {
      return res.status(404).json({ error: 'Lineage source not found' });
    }
    res.json(source);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/lineage/sources', async (req, res) => {
  try {
    const { name, sourceType, sqlContent, mappings } = req.body;

    // 创建记录
    const source = await lineageRepo.create(name, sourceType, sqlContent);

    // 添加映射关系
    if (mappings && mappings.length > 0) {
      for (const mapping of mappings) {
        await lineageRepo.addMapping(source.id, mapping);
      }
    }

    // 保存到 Neo4j 图数据库
    const fullSource = await lineageRepo.findByIdWithMappings(source.id);
    await lineageRepo.saveToGraph(fullSource);

    res.json(source);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lineage/sources/:id', async (req, res) => {
  try {
    await lineageRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Lineage Graph Data =====
router.get('/lineage/graph', async (req, res) => {
  try {
    const graphData = await lineageRepo.getGraphData();
    res.json(graphData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
