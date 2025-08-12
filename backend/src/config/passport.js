// backend/src/config/passport.js
const passport = require('passport');
const { Strategy } = require('passport-google-oauth20');
const jwt = require('jsonwebtoken');
const { User, Household, Category } = require('../models');

const DEFAULT_CATEGORY_NAMES = [
  'Housing','Utilities','Groceries','Transportation','Healthcare',
  'Entertainment','Dining Out','Savings','Investments','Salary','Bonus','Freelance'
];

passport.use(new Strategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const [user, created] = await User.findOrCreate({
      where: { googleId: profile.id },
      defaults: {
        email: profile.emails?.[0]?.value,
        name: profile.displayName
      }
    });

    if (created || !user.householdId) {
      const hh = await Household.create({ name: `${user.name}'s household` });
      await user.setHousehold(hh);

      // Seed household-scoped categories
      await Category.bulkCreate(DEFAULT_CATEGORY_NAMES.map((name) => ({
        name,
        type: ['Salary','Bonus','Freelance'].includes(name) ? 'income'
             : ['Savings','Investments'].includes(name) ? 'savings'
             : 'expense',
        householdId: hh.id,
        systemDefault: true,
      })));
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    done(null, token);
  } catch (err) {
    done(err);
  }
}));
