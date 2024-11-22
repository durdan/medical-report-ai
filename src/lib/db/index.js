import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';

const isProd = process.env.NODE_ENV === 'production';

// Parse the connection string for production
const getPool = () => {
  if (!isProd) return null;

  const connectionString = process.env.POSTGRES_URL;
  const [protocol, rest] = connectionString.split('://');
  const [credentials, hostPortDb] = rest.split('@');
  const [username, password] = credentials.split(':');
  const [hostPort, database] = hostPortDb.split('/');
  const [host, port] = hostPort.split(':');

  return new Pool({
    user: username,
    password,
    host,
    port: parseInt(port),
    database: database.split('?')[0],
    ssl: true
  });
};

export const dbPool = getPool();

// SQLite connection for development
let sqliteDb = null;

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir);
  }
  return dataDir;
}

export async function getSqliteDb() {
  if (sqliteDb) return sqliteDb;
  
  const dataDir = await ensureDataDir();
  const dbPath = path.join(dataDir, 'dev.db');
  
  sqliteDb = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Initialize tables if they don't exist
  await sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'USER',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      specialty TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      is_system INTEGER DEFAULT 0,
      user_id TEXT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      findings TEXT NOT NULL,
      report TEXT NOT NULL,
      specialty TEXT NOT NULL,
      prompt_id TEXT REFERENCES prompts(id),
      user_id TEXT REFERENCES users(id) NOT NULL,
      is_archived INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
    CREATE INDEX IF NOT EXISTS idx_reports_specialty ON reports(specialty);
    CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
    CREATE INDEX IF NOT EXISTS idx_prompts_specialty ON prompts(specialty);
    CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
  `);

  return sqliteDb;
}

export async function getDb() {
  if (isProd) {
    return dbPool;
  }
  return getSqliteDb();
}

// User operations
export async function getUserByEmail(email) {
  const db = await getDb();
  if (isProd) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  } else {
    return db.get('SELECT * FROM users WHERE email = ?', [email]);
  }
}

export async function getUserById(id) {
  const db = await getDb();
  if (isProd) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  } else {
    return db.get('SELECT * FROM users WHERE id = ?', [id]);
  }
}

export async function createUser({ name, email, password, role = 'USER' }) {
  const db = await getDb();
  if (isProd) {
    const result = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, password, role]
    );
    return result.rows[0];
  } else {
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role]
    );
    return { id: result.lastID, name, email, role };
  }
}

// Initialize database
export async function initDb() {
  const db = await getDb();
  if (isProd) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'USER',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS prompts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        prompt_text TEXT NOT NULL,
        specialty TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        is_system BOOLEAN DEFAULT false,
        user_id UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        findings TEXT NOT NULL,
        report TEXT NOT NULL,
        specialty TEXT NOT NULL,
        prompt_id UUID REFERENCES prompts(id),
        user_id UUID REFERENCES users(id) NOT NULL,
        is_archived BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_reports_specialty ON reports(specialty);
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
      CREATE INDEX IF NOT EXISTS idx_prompts_specialty ON prompts(specialty);
      CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
    `);
  } else {
    // SQLite tables are initialized in getSqliteDb
  }

  // Create default admin user if it doesn't exist
  const adminEmail = 'admin@example.com';
  const existingAdmin = await getUserByEmail(adminEmail);

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await createUser({
      name: 'Admin User',
      email: adminEmail,
      password: hashedPassword,
      role: 'ADMIN'
    });
    console.log('Default admin user created');
  }
}
