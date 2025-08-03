const { User } = require('../models');
const bcrypt = require('bcrypt');

async function registerUser({ email, password, name, householdId }) {
  const hash = await bcrypt.hash(password, 10);
  return User.create({ email, password: hash, name, householdId });
}

async function authenticateUser({ email, password }) {
  const user = await User.findOne({ where: { email } });
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
  return user;
}

async function getUserById(id) {
  return User.findByPk(id);
}

module.exports = { registerUser, authenticateUser, getUserById };
