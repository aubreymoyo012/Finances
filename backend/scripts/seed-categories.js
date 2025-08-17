require('dotenv').config();
const db = require('../src/models');
const { seedCategories } = require('../src/utils/seedCategories');

(async () => {
  try {
    await db.sequelize.authenticate();

    // Find your user (by email) to get householdId
    const email = process.argv[2] || 'demo@example.com';
    const user = await db.User.findOne({ where: { email } });
    if (!user) throw new Error(`User not found for ${email}`);

    const out = await seedCategories(user.householdId);
    console.log(`Seeded ${out.length} categories for household ${user.householdId}`);
    process.exit(0);
  } catch (e) {
    console.error('Seed error:', e.message);
    process.exit(1);
  }
})();
