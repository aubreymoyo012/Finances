module.exports = async (Category) => {
  const categories = ['Rent', 'Groceries', 'Utilities', 'Entertainment', 'Transport'];

  for (const name of categories) {
    await Category.findOrCreate({ where: { name } });
  }

  console.log('Default categories added.');
};
