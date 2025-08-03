const router = require('express').Router();
const passport = require('passport');

const isAuth = require('../middlewares/auth');
const { asyncHandler } = require('../utils/aysncHandler');
router.post('/', isAuth(), asyncHandler(txController.createTransaction));

// Initiate Google login
router.get('/google', passport.authenticate('google', { scope: ['email','profile'] }));

// Google callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    res.json({ token: req.user });
  }
);

// Local register/login (optional)
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;
