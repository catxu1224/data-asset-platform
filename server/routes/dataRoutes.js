import express from 'express';
import { dictRepo } from '../repository/dictRepository.js';
import { glossaryRepo } from '../repository/glossaryRepository.js';
import { standardRepo } from '../repository/standardRepository.js';

const router = express.Router();

// ===== Data Dictionary =====
router.get('/dicts', async (req, res) => {
  try {
    const dicts = await dictRepo.findAll();
    res.json(dicts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dicts/:id', async (req, res) => {
  try {
    const dict = await dictRepo.findById(req.params.id);
    if (!dict) {
      return res.status(404).json({ error: 'Dictionary not found' });
    }
    res.json(dict);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/dicts', async (req, res) => {
  try {
    const data = req.body;
    const dict = await dictRepo.create(data);
    res.json(dict);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/dicts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const dict = await dictRepo.update(id, data);
    res.json(dict);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/dicts/:id', async (req, res) => {
  try {
    await dictRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Glossary =====
router.get('/glossaries', async (req, res) => {
  try {
    const glossaries = await glossaryRepo.findAll();
    res.json(glossaries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/glossaries/:id', async (req, res) => {
  try {
    const glossary = await glossaryRepo.findById(req.params.id);
    if (!glossary) {
      return res.status(404).json({ error: 'Glossary not found' });
    }
    res.json(glossary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/glossaries', async (req, res) => {
  try {
    const data = req.body;
    const glossary = await glossaryRepo.create(data);
    res.json(glossary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/glossaries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const glossary = await glossaryRepo.update(id, data);
    res.json(glossary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/glossaries/:id', async (req, res) => {
  try {
    await glossaryRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== Standards =====
router.get('/standards', async (req, res) => {
  try {
    const standards = await standardRepo.findAll();
    res.json(standards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/standards/:id', async (req, res) => {
  try {
    const standard = await standardRepo.findByIdWithValues(req.params.id);
    if (!standard) {
      return res.status(404).json({ error: 'Standard not found' });
    }
    res.json(standard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/standards', async (req, res) => {
  try {
    const { name, description, values } = req.body;
    const standard = await standardRepo.createWithValues(name, description, values);
    res.json(standard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/standards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const standard = await standardRepo.update(id, name, description);
    res.json(standard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/standards/:id', async (req, res) => {
  try {
    await standardRepo.delete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/standards/:id/values', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, label, labelEn } = req.body;
    const value = await standardRepo.addValue(id, code, label, labelEn);
    res.json(value);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/standard-values/:id', async (req, res) => {
  try {
    await standardRepo.deleteValue(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
