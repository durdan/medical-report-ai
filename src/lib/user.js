import bcrypt from 'bcryptjs';
import { db } from './db';
import crypto from 'crypto';

export async function getUserByEmail(email) {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

export async function getUserById(id) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

export async function createUser({ name, email, password, role = 'USER' }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  const result = await db.query(
    'INSERT INTO users (id, name, email, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [id, name, email, hashedPassword, role]
  );
  return result.rows[0];
}
