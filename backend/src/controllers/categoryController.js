const { Category } = require('../models');

exports.list = async (req, res) => {
  const categories = await Category.findAll();
  res.json(categories);
};

exports.create = async (req, res) => {
  const [category, created] = await Category.findOrCreate({ where: { name: req.body.name } });
  res.status(created ? 201 : 200).json(category);
};
