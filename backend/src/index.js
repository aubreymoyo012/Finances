// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const db = require('./models');
const { seedCategories } = require('./utils/seeders');
const { seedDemoData } = require('./utils/demoSeeder');
const logger = require('./utils/logger');

// Configuration validation
require('./utils/configValidator')();

// Initialize Express app
const app = express();

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URLS?.split(',') || 'http://localhost:3000',
  credentials: true
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', { 
  stream: logger.stream 
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many requests from this IP, please try again later'
});

// Body parsing with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Passport initialization
app.use(passport.initialize());
require('./config/passportStrategies'); // All auth strategies

// API Routes
const apiRouter = express.Router();
apiRouter.use(apiLimiter);

// Mount route modules
apiRouter.use('/auth', require('./routes/auth'));
apiRouter.use('/transactions', require('./routes/transactions'));
apiRouter.use('/categories', require('./routes/categories'));
apiRouter.use('/budgets', require('./routes/budgets'));
apiRouter.use('/receipts', require('./routes/receipts'));
apiRouter.use('/users', require('./routes/users'));

// Health check endpoint
apiRouter.get('/health', (req, res) => res.json({ status: 'healthy' }));

// Versioned API
app.use('/api/v1', apiRouter);

// Static files (if serving any)
if (process.env.SERVE_STATIC === 'true') {
  app.use(express.static('public'));
}

// Global error handlers (must be last)
app.use(require('./middlewares/notFoundHandler'));
app.use(require('./middlewares/errorHandler'));

async function initializeDatabase() {
  try {
    await db.sequelize.authenticate();
    logger.info('Database connection established');

    const syncOptions = {
      alter: process.env.NODE_ENV !== 'production',
      logging: logger.info
    };
    // await db.sequelize.sync(syncOptions);
    // logger.info('Database models synchronized');

    await seedCategories(db.Category);
    logger.info('Default categories seeded');

    if (process.env.SEED_DEMO_DATA === 'true') {
      await seedDemoData(db);
      logger.info('Demo data initialized');
    }
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

async function startServer() {
  try {
    await initializeDatabase();

    const PORT = process.env.PORT || 4000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Handle shutdown gracefully
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        db.sequelize.close().then(() => {
          logger.info('Server and database connections closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app; // For testing