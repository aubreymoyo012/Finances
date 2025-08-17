'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const defaults = [
      // expenses
      { name: 'Housing',       type: 'expense',  color: '#8E24AA', icon: 'home' },
      { name: 'Utilities',     type: 'expense',  color: '#42A5F5', icon: 'bolt' },
      { name: 'Groceries',     type: 'expense',  color: '#66BB6A', icon: 'cart' },
      { name: 'Transportation',type: 'expense',  color: '#26A69A', icon: 'car' },
      { name: 'Healthcare',    type: 'expense',  color: '#EF5350', icon: 'medkit' },
      { name: 'Entertainment', type: 'expense',  color: '#AB47BC', icon: 'gamepad' },
      { name: 'Dining Out',    type: 'expense',  color: '#FFA726', icon: 'utensils' },
      // savings
      { name: 'Savings',       type: 'savings',  color: '#66BB6A', icon: 'piggy-bank' },
      { name: 'Investments',   type: 'savings',  color: '#26A69A', icon: 'chart-line' },
      // income
      { name: 'Salary',        type: 'income',   color: '#29B6F6', icon: 'briefcase' },
      { name: 'Bonus',         type: 'income',   color: '#7E57C2', icon: 'gift' },
      { name: 'Freelance',     type: 'income',   color: '#26C6DA', icon: 'code' },
    ];

    // get all household ids
    const [households] = await queryInterface.sequelize.query(
      `SELECT id FROM households;`
    );

    const now = new Date();

    for (const hh of households) {
      for (const cat of defaults) {
        // use raw SQL for ON CONFLICT DO NOTHING against unique (householdId,name,type)
        await queryInterface.sequelize.query(
          `
          INSERT INTO categories ("id","name","type","color","icon","householdId","systemDefault","createdAt","updatedAt")
          VALUES (gen_random_uuid(), :name, :type, :color, :icon, :householdId, true, :now, :now)
          ON CONFLICT ("householdId","name","type") DO NOTHING;
          `,
          {
            replacements: {
              name: cat.name,
              type: cat.type,       // <-- already 'savings' (not 'saving')
              color: cat.color,
              icon: cat.icon,
              householdId: hh.id,
              now
            }
          }
        );
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove only the system defaults we inserted
    await queryInterface.bulkDelete('categories', { systemDefault: true });
  }
};
