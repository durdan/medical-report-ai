import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';

let db = null;

// SQL statements that work in both SQLite and PostgreSQL
const CREATE_TABLES_SQL = `
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
    is_default BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    findings TEXT NOT NULL,
    report TEXT NOT NULL,
    specialty TEXT NOT NULL,
    prompt_id TEXT,
    user_id TEXT NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
  CREATE INDEX IF NOT EXISTS idx_reports_specialty ON reports(specialty);
  CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
  CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
  CREATE INDEX IF NOT EXISTS idx_prompts_specialty ON prompts(specialty);
`;

async function initializeDatabase() {
  if (db) return db;

  const dbPath = path.join(process.cwd(), 'data', 'dev.db');
  console.log('Initializing database at:', dbPath);

  try {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys and WAL mode for better performance
  await db.exec('PRAGMA foreign_keys = ON;');
  await db.exec('PRAGMA journal_mode = WAL;');

  // Create tables
  await db.exec(CREATE_TABLES_SQL);

  // Check if admin user exists
  const adminUser = await db.get('SELECT * FROM users WHERE email = ?', ['admin@example.com']);
  
  if (!adminUser) {
    console.log('Creating default admin user...');
    const adminId = 'admin-' + Date.now();
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.run(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'Admin User', 'admin@example.com', hashedPassword, 'ADMIN']
    );

    // Create default prompts
    const defaultPrompts = [
      {
        id: 'system-prompt-' + Date.now(),
        name: 'Medical Report System Prompt',
        prompt_text: 'You are a professional medical report assistant. Your role is to help generate accurate, detailed, and well-structured medical reports. Follow these guidelines:\n\n1. Use formal medical terminology\n2. Structure the report clearly with sections\n3. Include all relevant medical findings\n4. Be precise and concise\n5. Maintain professional tone\n6. Follow standard medical report formats\n7. Include relevant measurements and values\n8. Note any significant negative findings\n\nRespond in a structured format appropriate for medical documentation.',
        specialty: 'General',
        is_default: true,
        is_system: true,
        user_id: adminId
      },
      {
        id: 'default-general-' + Date.now(),
        name: 'General Medical Report',
        prompt_text: 'Based on the provided findings, generate a comprehensive medical report that includes:\n- Chief complaint\n- History of present illness\n- Physical examination findings\n- Assessment\n- Plan and recommendations',
        specialty: 'General',
        is_default: true,
        is_system: false,
        user_id: adminId
      },
      {
        id: 'default-radiology-' + Date.now(),
        name: 'Radiology Report',
        prompt_text: 'Generate a detailed radiology report addressing:\n- Type of imaging study\n- Technical quality\n- Relevant findings\n- Anatomical structures\n- Any abnormalities\n- Impression and recommendations',
        specialty: 'Radiology',
        is_default: true,
        is_system: false,
        user_id: adminId
      },
      {
        id: 'default-cardiology-' + Date.now(),
        name: 'Cardiology Report',
        prompt_text: 'Create a comprehensive cardiac report including:\n- Cardiovascular examination\n- Heart rate and rhythm\n- Blood pressure readings\n- Heart sounds and murmurs\n- ECG findings if available\n- Assessment and recommendations',
        specialty: 'Cardiology',
        is_default: true,
        is_system: false,
        user_id: adminId
      },
      {
        id: 'default-orthopedics-' + Date.now(),
        name: 'Orthopedics Report',
        prompt_text: 'Generate a detailed orthopedic report covering:\n- Musculoskeletal examination\n- Range of motion\n- Strength testing\n- Neurological findings\n- Imaging results if available\n- Treatment recommendations',
        specialty: 'Orthopedics',
        is_default: true,
        is_system: false,
        user_id: adminId
      }
    ];

    // Insert prompts with transaction
    await db.run('BEGIN TRANSACTION');
    try {
      for (const prompt of defaultPrompts) {
        await db.run(`
          INSERT INTO prompts (id, name, prompt_text, specialty, is_default, is_system, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [prompt.id, prompt.name, prompt.prompt_text, prompt.specialty, prompt.is_default ? 1 : 0, prompt.is_system ? 1 : 0, prompt.user_id]);
      }
      await db.run('COMMIT');
      console.log('Default prompts created successfully');
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error creating default prompts:', error);
      throw error;
    }
  }

  return db;
}

async function get(query, params = []) {
  if (!db) await initializeDatabase();
  console.log('Executing query:', query, 'with params:', params);
  return db.get(query, params);
}

async function all(query, params = []) {
  if (!db) await initializeDatabase();
  console.log('Executing query:', query, 'with params:', params);
  return db.all(query, params);
}

async function run(query, params = []) {
  if (!db) await initializeDatabase();
  console.log('Executing query:', query, 'with params:', params);
  return db.run(query, params);
}

export default {
  initializeDatabase,
  get,
  all,
  run
};
