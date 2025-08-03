const express = require('express');
const db = require('./models');
const seedCategories = require('./utils/seedCategories');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());

async function startServer() {
  try {
    // Connect to DB
    await db.sequelize.authenticate();
    console.log('Database connected...');

    // Sync models
    await db.sequelize.sync({ alter: true }); // Use { force: true } if you want to reset tables
    console.log('Models synced.');

    // Seed initial data
    await seedCategories(db.Category);
    console.log('Categories seeded.');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error starting server:', err);
  }
}

startServer();