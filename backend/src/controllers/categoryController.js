// backend/src/controllers/categoryController.js
const { categoryService } = require('../services'); // ensure correct relative path

exports.list = async (req, res) => {
  try {
    const categories = await categoryService.listCategories({
      householdId: req.user?.householdId || null,   // default to requester’s household
      // optionally: type: req.query.type,
      // optionally: includeInactive: req.query.includeInactive === 'true',
      // optionally: includeCounts: req.query.includeCounts === 'true',
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    // name already validated in routes/categories.js
    const { name, type, color, icon } = req.body;

    const category = await categoryService.createCategory({
      name,
      type,    // optional (defaults to 'expense' in service)
      color,   // optional
      icon,    // optional
      householdId: req.user?.householdId, // *** required by model association ***
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
