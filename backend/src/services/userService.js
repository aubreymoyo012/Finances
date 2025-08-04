const { User, Household, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const { NotFoundError, InvalidInputError, AuthenticationError } = require('../utils/errors');
const jwt = require('jsonwebtoken');

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Register a new user with validation
 * @param {Object} userData
 * @param {string} userData.email
 * @param {string} userData.password
 * @param {string} userData.name
 * @param {string} [userData.householdId]
 * @returns {Promise<Object>}
 */
async function registerUser({ email, password, name, householdId = null }) {
  return sequelize.transaction(async (t) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new InvalidInputError('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new InvalidInputError('Password must be at least 8 characters');
    }

    // Check for existing user
    const existingUser = await User.findOne({ 
      where: { email },
      transaction: t 
    });
    
    if (existingUser) {
      throw new InvalidInputError('Email already in use');
    }

    // Validate household if provided
    if (householdId) {
      const household = await Household.findByPk(householdId, { transaction: t });
      if (!household) {
        throw new InvalidInputError('Invalid household');
      }
    }

    // Hash password
    const hash = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hash,
      name: name.trim(),
      householdId,
      isVerified: false,
      lastLoginAt: null
    }, { transaction: t });

    // Return user without password
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      householdId: user.householdId,
      createdAt: user.createdAt
    };
  });
}

/**
 * Authenticate user and generate tokens
 * @param {Object} credentials
 * @param {string} credentials.email
 * @param {string} credentials.password
 * @returns {Promise<{accessToken: string, refreshToken: string, user: Object}>}
 */
async function authenticateUser({ email, password }) {
  const user = await User.findOne({ 
    where: { email: email.toLowerCase().trim() } 
  });
  
  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Check password
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Check if account is locked
  if (user.lockUntil && user.lockUntil > Date.now()) {
    throw new AuthenticationError('Account temporarily locked');
  }

  // Update last login
  await user.update({ lastLoginAt: new Date() });

  // Generate tokens
  const accessToken = generateToken(user, ACCESS_TOKEN_EXPIRY);
  const refreshToken = generateToken(user, REFRESH_TOKEN_EXPIRY);

  // Return tokens and user info (without sensitive data)
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      householdId: user.householdId,
      role: user.role
    }
  };
}

/**
 * Generate JWT token
 * @param {Object} user 
 * @param {string} expiresIn 
 * @returns {string}
 */
function generateToken(user, expiresIn) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

/**
 * Get user by ID without sensitive information
 * @param {string} id 
 * @returns {Promise<Object>}
 */
async function getUserById(id) {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password', 'resetToken', 'verificationToken'] },
    include: [{
      model: Household,
      as: 'household',
      attributes: ['id', 'name']
    }]
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return user;
}

/**
 * Refresh access token using refresh token
 * @param {string} token 
 * @returns {Promise<{accessToken: string}>}
 */
async function refreshAccessToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.id);
    return {
      accessToken: generateToken(user, ACCESS_TOKEN_EXPIRY)
    };
  } catch (err) {
    throw new AuthenticationError('Invalid refresh token');
  }
}

/**
 * Initiate password reset
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
async function forgotPassword(email) {
  const user = await User.findOne({ where: { email } });
  if (!user) return true; // Don't reveal if user exists

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = Date.now() + 3600000; // 1 hour

  await user.update({
    resetToken,
    resetExpires
  });

  // Send email with reset token (implementation omitted)
  return true;
}

/**
 * Reset password using token
 * @param {string} token 
 * @param {string} newPassword 
 * @returns {Promise<boolean>}
 */
async function resetPassword(token, newPassword) {
  const user = await User.findOne({
    where: {
      resetToken: token,
      resetExpires: { [sequelize.Op.gt]: Date.now() }
    }
  });

  if (!user) {
    throw new InvalidInputError('Invalid or expired token');
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await user.update({
    password: hash,
    resetToken: null,
    resetExpires: null
  });

  return true;
}

module.exports = {
  registerUser,
  authenticateUser,
  getUserById,
  refreshAccessToken,
  forgotPassword,
  resetPassword
};