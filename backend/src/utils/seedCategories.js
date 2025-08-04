module.exports = async (Category) => {
  const defaultCategories = [
    { name: 'Housing', type: 'expense', color: '#FF6B6B', icon: 'home' },
    { name: 'Utilities', type: 'expense', color: '#4ECDC4', icon: 'bolt' },
    { name: 'Groceries', type: 'expense', color: '#45B7D1', icon: 'shopping-cart' },
    { name: 'Transportation', type: 'expense', color: '#FFA07A', icon: 'car' },
    { name: 'Healthcare', type: 'expense', color: '#98D8C8', icon: 'heart' },
    { name: 'Entertainment', type: 'expense', color: '#F06292', icon: 'film' },
    { name: 'Dining Out', type: 'expense', color: '#7986CB', icon: 'utensils' },
    { name: 'Savings', type: 'saving', color: '#66BB6A', icon: 'piggy-bank' },
    { name: 'Investments', type: 'saving', color: '#26A69A', icon: 'chart-line' },
    { name: 'Salary', type: 'income', color: '#81C784', icon: 'money-bill-wave' },
    { name: 'Bonus', type: 'income', color: '#AED581', icon: 'gift' },
    { name: 'Freelance', type: 'income', color: '#DCE775', icon: 'laptop-code' }
  ];

  try {
    const results = await Promise.all(
      defaultCategories.map(category => 
        Category.findOrCreate({
          where: { name: category.name },
          defaults: {
            type: category.type,
            color: category.color,
            icon: category.icon,
            isActive: true,
            systemDefault: true
          }
        })
      )
    );

    const createdCount = results.filter(([_, created]) => created).length;
    console.log(`Categories seeded: ${createdCount} new categories added, ${results.length - createdCount} already existed`);
    
    return {
      total: results.length,
      created: createdCount,
      existed: results.length - createdCount
    };
  } catch (error) {
    console.error('Error seeding categories:', error);
    throw error;
  }
};