const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Parse the connection string
const connectionString = process.env.POSTGRES_URL;
const [protocol, rest] = connectionString.split('://');
const [credentials, hostPortDb] = rest.split('@');
const [username, password] = credentials.split(':');
const [hostPort, database] = hostPortDb.split('/');
const [host, port] = hostPort.split(':');

const pool = new Pool({
  user: username,
  password,
  host,
  port: parseInt(port),
  database: database.split('?')[0],
  ssl: true
});

async function initDb() {
  try {
    // Create tables
    await pool.query(`
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
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_reports_specialty ON reports(specialty);
      CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
      CREATE INDEX IF NOT EXISTS idx_prompts_specialty ON prompts(specialty);
      CREATE INDEX IF NOT EXISTS idx_prompts_user_id ON prompts(user_id);
    `);

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(`
      INSERT INTO users (name, email, password, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['Admin User', 'admin@example.com', hashedPassword, 'ADMIN']);

    // Create default prompts
    const defaultPrompts = [
      {
        name: 'General Medical Report',
        prompt_text: 'You are a professional medical report generator. Generate a clear, concise, and accurate medical report based on the provided findings.',
        specialty: 'General',
        is_default: true,
        is_system: true
      },
      {
        name: 'Radiology Report',
        prompt_text: 'You are a specialized radiologist. Generate a detailed radiology report based on the provided imaging findings.',
        specialty: 'Radiology',
        is_default: true,
        is_system: true
      },
      {
        name: 'Cardiology Report',
        prompt_text: 'You are a specialized cardiologist. Generate a comprehensive cardiac report including examination findings, ECG interpretation, and recommendations.',
        specialty: 'Cardiology',
        is_default: true,
        is_system: true
      }
    ];

    for (const prompt of defaultPrompts) {
      await pool.query(`
        INSERT INTO prompts (name, prompt_text, specialty, is_default, is_system)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [prompt.name, prompt.prompt_text, prompt.specialty, prompt.is_default, prompt.is_system]);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

initDb();
