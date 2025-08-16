// backend/src/index.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const db = require('./models');
const logger = require('./utils/logger');

// Validate config early (throws on fatal issues)
require('./utils/configValidator')();

const app = express();

// Security
app.use(helmet());

// CORS
const FRONTEND_URLS = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(',').map(s => s.trim()).filter(Boolean)
  : ['http://localhost:3000'];
app.use(cors({ origin: FRONTEND_URLS, credentials: true }));

// Logs
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
  stream: logger.stream
}));

// Rate limit (basic)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later'
});

// Body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Auth
app.use(passport.initialize());
require('./config/passport');

// Static uploads (serve /uploads/*)
app.use('/uploads', express.static(path.resolve('uploads')));

// API
const apiRouter = express.Router();
apiRouter.use(apiLimiter);

// NOTE: Mount auth router at root to avoid /auth/auth/* if your router includes /auth/* paths.
apiRouter.use('/', require('./routes/auth'));
apiRouter.use('/transactions', require('./routes/transactions'));
apiRouter.use('/categories', require('./routes/categories'));
apiRouter.use('/budgets', require('./routes/budgets'));

// If your file was accidentally named "reciepts.js", please rename it to "receipts.js".
apiRouter.use('/receipts', require('./routes/receipts'));
apiRouter.use('/users', require('./routes/users'));

// Health
apiRouter.get('/health', (req, res) => res.json({ status: 'healthy' }));

// Versioned mount
app.use('/api/v1', apiRouter);

// 404 + error handlers (last)
app.use(require('./middlewares/notFoundHandler'));
app.use(require('./middlewares/errorHandler'));

// --- boot ---
async function start() {
  try {
    await db.sequelize.authenticate();
    logger.info('Database connection established');

    // Do NOT sync here if you’re using migrations
    // await db.sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });

    const PORT = Number(process.env.PORT) || 4000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} on :${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down...');
      server.close(() => {
        db.sequelize.close().then(() => {
          logger.info('Server and DB connections closed');
          process.exit(0);
        });
      });
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') start();

module.exports = app;
