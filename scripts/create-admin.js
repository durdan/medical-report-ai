const { createPool } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function createAdmin() {
  try {
    // Use Vercel Postgres connection
    const pool = createPool({
      connectionString: process.env.POSTGRES_URL_NON_POOLING
    });

    // Create tables if they don't exist
    await pool.sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'USER',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Hash the password
    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'adminpassword123',
      10
    );

    // Create admin user
    const id = crypto.randomUUID();
    const name = process.env.ADMIN_NAME || 'Admin User';
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';

    // Insert the admin user
    await pool.sql`
      INSERT INTO users (id, name, email, password, role)
      VALUES (${id}, ${name}, ${email}, ${hashedPassword}, 'ADMIN')
    `;

    console.log('Admin user created successfully:', {
      name,
      email,
      role: 'ADMIN'
    });

    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin user:', error);
    process.exit(1);
  }
}

createAdmin();