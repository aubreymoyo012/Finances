const { Category } = require('../models');

async function listCategories() {
  return Category.findAll();
}

async function createCategory(name) {
  return Category.create({ name });
}

module.exports = { listCategories, createCategory };
