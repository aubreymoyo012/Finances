// backend/src/config/passport.js
const passport = require('passport');
const { Strategy } = require('passport-google-oauth20');
const jwt = require('jsonwebtoken');
const { User, Household, Category } = require('../models');

passport.use(
  new Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let [user] = await User.findOrCreate({
        where: { googleId: profile.id },
        defaults: {
          email: profile.emails?.[0]?.value,
          name: profile.displayName
        }
      });

      // default household if new
      if (user.isNewRecord) {
        const hh = await Household.create({ name: user.name + "'s household" });
        await user.setHousehold(hh);
        await Category.bulkCreate(
          defaults.map(name => ({
            name,
            initial: true,
            householdId: hh.id    // assign to the new household
          }))
        );
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
  })
);

