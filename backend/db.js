const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test de connexion
pool.on('connect', () => {
  console.log('Connecté à PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Erreur de connexion PostgreSQL:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
