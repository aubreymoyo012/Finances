// utils/seedDemo.js
module.exports = async (db) => {
  const [user] = await db.User.findOrCreate({
    where: { email: 'demo@user.com' },
    defaults: { name: 'Demo User', password: 'hashedpassword' }
  });
  const [hh] = await db.Household.findOrCreate({ where: { name: 'Demo household' } });
  await user.setHousehold(hh);
};
