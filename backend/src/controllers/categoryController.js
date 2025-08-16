// backend/src/controllers/categoryController.js
const categoryService = require('../services/categoryService'); // fixed import

exports.list = async (req, res) => {
  try {
    const categories = await categoryService.listCategories({
      householdId: req.user?.householdId || null,
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;
    const category = await categoryService.createCategory({
      name,
      type,
      color,
      icon,
      householdId: req.user?.householdId,
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
