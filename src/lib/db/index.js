import { Pool } from 'pg';
import bcrypt from 'bcrypt';

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DATABASE,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = {
  query: (text, params) => pool.query(text, params),
};

export const createUser = async (email, password, name) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, name, role',
    [email, hashedPassword, name, 'USER']
  );
  return result.rows[0];
};

export const getUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

export const getUserById = async (id) => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
};

export const verifyPassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

export const createReport = async (userId, title, findings, report, specialty, promptId) => {
  const result = await pool.query(
    'INSERT INTO reports (user_id, title, findings, report, specialty, prompt_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [userId, title, findings, report, specialty, promptId]
  );
  return result.rows[0];
};

export const updateReport = async (reportId, userId, title, findings, report, specialty, promptId) => {
  const result = await pool.query(
    'UPDATE reports SET title = $1, findings = $2, report = $3, specialty = $4, prompt_id = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 AND user_id = $7 RETURNING *',
    [title, findings, report, specialty, promptId, reportId, userId]
  );
  return result.rows[0];
};

export const deleteReport = async (reportId, userId) => {
  const result = await pool.query(
    'DELETE FROM reports WHERE id = $1 AND user_id = $2 RETURNING *',
    [reportId, userId]
  );
  return result.rows[0];
};

export const getReportById = async (reportId, userId) => {
  const result = await pool.query(
    'SELECT r.*, p.title as prompt_title, p.specialty as prompt_specialty FROM reports r LEFT JOIN prompts p ON r.prompt_id = p.id WHERE r.id = $1 AND r.user_id = $2',
    [reportId, userId]
  );
  return result.rows[0];
};

export const listReports = async (userId) => {
  const result = await pool.query(
    'SELECT r.*, p.title as prompt_title FROM reports r LEFT JOIN prompts p ON r.prompt_id = p.id WHERE r.user_id = $1 ORDER BY r.created_at DESC',
    [userId]
  );
  return result.rows;
};

export const createPrompt = async (title, content, specialty) => {
  const result = await pool.query(
    'INSERT INTO prompts (title, content, specialty) VALUES ($1, $2, $3) RETURNING *',
    [title, content, specialty]
  );
  return result.rows[0];
};

export const updatePrompt = async (id, title, content, specialty) => {
  const result = await pool.query(
    'UPDATE prompts SET title = $1, content = $2, specialty = $3 WHERE id = $4 RETURNING *',
    [title, content, specialty, id]
  );
  return result.rows[0];
};

export const deletePrompt = async (id) => {
  const result = await pool.query('DELETE FROM prompts WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};

export const getPromptById = async (id) => {
  const result = await pool.query('SELECT * FROM prompts WHERE id = $1', [id]);
  return result.rows[0];
};

export const listPrompts = async () => {
  const result = await pool.query('SELECT * FROM prompts ORDER BY created_at DESC');
  return result.rows;
};
