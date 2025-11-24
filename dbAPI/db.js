// db.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function createConnection() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log(`Connected to MySQL database: ${process.env.DB_NAME}`);
    return connection;
  } catch (error) {
    console.error('Failed to connect to MySQL:', error.message);
    throw error;
  }
}

module.exports = { createConnection };
