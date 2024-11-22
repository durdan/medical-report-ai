const { Pool } = require('pg');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let db = null;
let isDevelopment = process.env.NODE_ENV === 'development';

// Convert "?" placeholders to "$1" style for PostgreSQL
function convertPlaceholders(sql) {
  if (!isDevelopment) {
    let index = 0;
    return sql.replace(/\?/g, () => `$${++index}`);
  }
  return sql;
}

async function initializeDatabase() {
  if (isDevelopment) {
    // SQLite for local development
    db = await open({
      filename: './dev.db',
      driver: sqlite3.Database
    });

    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'USER',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        expires DATETIME,
        session_token TEXT UNIQUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
  } else {
    // PostgreSQL for production
    db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for some hosting providers
      }
    });

    // Create tables if they don't exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'USER',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMP WITH TIME ZONE,
        session_token TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  return db;
}

async function getDb() {
  if (!db) {
    db = await initializeDatabase();
  }
  return db;
}

async function query(sql, params = []) {
  const database = await getDb();
  sql = convertPlaceholders(sql);

  try {
    if (isDevelopment) {
      // SQLite
      return await database.all(sql, params);
    } else {
      // PostgreSQL
      const result = await database.query(sql, params);
      return result.rows;
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function findUserByEmail(email) {
  const users = await query('SELECT * FROM users WHERE email = ?', [email]);
  return users[0];
}

async function createUser({ id, name, email, password, role = 'USER' }) {
  await query(
    'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
    [id, name, email, password, role]
  );
}

async function createSession({ id, userId, expires, sessionToken }) {
  await query(
    'INSERT INTO sessions (id, user_id, expires, session_token) VALUES (?, ?, ?, ?)',
    [id, userId, expires, sessionToken]
  );
}

async function getSession(sessionToken) {
  const sessions = await query(
    'SELECT s.*, u.* FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_token = ? AND s.expires > CURRENT_TIMESTAMP',
    [sessionToken]
  );
  return sessions[0];
}

async function deleteSession(sessionToken) {
  await query('DELETE FROM sessions WHERE session_token = ?', [sessionToken]);
}

async function createReport({ id, title, content, userId }) {
  await query(
    'INSERT INTO reports (id, title, content, user_id) VALUES (?, ?, ?, ?)',
    [id, title, content, userId]
  );
}

async function getReportsByUser(userId) {
  return await query('SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

module.exports = {
  initializeDatabase,
  getDb,
  query,
  findUserByEmail,
  createUser,
  createSession,
  getSession,
  deleteSession,
  createReport,
  getReportsByUser
};
