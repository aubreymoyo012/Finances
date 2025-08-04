// backend/src/controllers/categoryController.js
const { categoryService } = require('../services');

exports.list = async (req, res) => {
  try {
    const categories = await categoryService.listCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    if (!req.body.name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const category = await categoryService.createCategory({
      name: req.body.name
    });
    
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};