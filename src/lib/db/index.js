import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

let pool = null;
let sqliteDb = null;

export async function getDb() {
  if (isProd) {
    if (!pool) {
      // Remove any existing sslmode from the URL
      const baseUrl = process.env.POSTGRES_URL_NON_POOLING.split('?')[0];
      
      pool = new Pool({
        connectionString: `${baseUrl}?sslmode=no-verify`,
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });

      // Test the connection
      try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        console.log('Successfully connected to PostgreSQL');
      } catch (error) {
        console.error('Database connection error:', error);
        pool = null;
        throw error;
      }
    }
    return pool;
  }
  
  // SQLite for development
  if (!sqliteDb) {
    const dataDir = await ensureDataDir();
    const dbPath = path.join(dataDir, 'dev.db');
    sqliteDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }
  return sqliteDb;
}

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir);
  }
  return dataDir;
}

// User operations
export async function getUserByEmail(email) {
  const db = await getDb();
  
  if (isProd) {
    try {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      throw error;
    }
  } else {
    return db.get('SELECT * FROM users WHERE email = ?', [email]);
  }
}

export async function getUserById(id) {
  const db = await getDb();
  
  if (isProd) {
    try {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  } else {
    return db.get('SELECT * FROM users WHERE id = ?', [id]);
  }
}

export async function createUser({ name, email, password, role = 'USER' }) {
  const db = await getDb();
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  if (isProd) {
    try {
      await db.query(
        'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5)',
        [id, name, email, hashedPassword, role]
      );
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  } else {
    await db.run(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, hashedPassword, role]
    );
  }
  return { id, name, email, role };
}

// Initialize database
export async function initDb() {
  const db = await getDb();
  
  if (isProd) {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'USER',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS prompts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          specialty TEXT,
          is_default BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          findings TEXT NOT NULL,
          report TEXT NOT NULL,
          specialty TEXT,
          prompt_id TEXT,
          user_id TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (prompt_id) REFERENCES prompts(id)
        )
      `);

      // Create indexes for better performance
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
        CREATE INDEX IF NOT EXISTS idx_reports_specialty ON reports(specialty);
        CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
      `);
    } catch (error) {
      console.error('Error initializing PostgreSQL database:', error);
      throw error;
    }
  } else {
    try {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'USER',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.exec(`
        CREATE TABLE IF NOT EXISTS prompts (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          specialty TEXT,
          is_default BOOLEAN DEFAULT false,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.exec(`
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          findings TEXT NOT NULL,
          report TEXT NOT NULL,
          specialty TEXT,
          prompt_id TEXT,
          user_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (prompt_id) REFERENCES prompts(id)
        )
      `);

      // Create indexes for better performance
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
        CREATE INDEX IF NOT EXISTS idx_reports_specialty ON reports(specialty);
        CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
      `);
    } catch (error) {
      console.error('Error initializing SQLite database:', error);
      throw error;
    }
  }
}
