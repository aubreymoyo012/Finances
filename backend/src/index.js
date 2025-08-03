// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const passport = require('passport');
const db = require('./models');
const seedCategories = require('./utils/seedCategories');
const seedDemo = require('./utils/seedDemo'); // optional

// Import route modules
const authRoutes = require('./routes/auth');
const txRoutes = require('./routes/transactions');
const catRoutes = require('./routes/categories');
const budgetRoutes = require('./routes/budgets');
const receiptRoutes = require('./routes/receipts');

// Initialize Express app
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(passport.initialize());
require('./config/passport'); // Google OAuth config

// Mount API routes
app.use('/auth', authRoutes);
app.use('/transactions', txRoutes);
app.use('/categories', catRoutes);
app.use('/budgets', budgetRoutes);
app.use('/receipts', receiptRoutes);

// Global error handler (should be last after all routes)
app.use(require('./middlewares/errorHandler'));

async function startServer() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected...');

    await db.sequelize.sync({ alter: true });
    console.log('Models synced.');

    await seedCategories(db.Category);
    console.log('Categories seeded.');

    // Optionally seed demo user and household
    if (process.env.SEED_DEMO === 'true') {
      await seedDemo(db);
      console.log('Demo data seeded.');
    }

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

startServer();
