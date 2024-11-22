import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db_operations from '../src/lib/db/index.js';

async function createTestUser() {
  try {
    // Initialize the database
    await db_operations.initializeDatabase();

    // Generate a unique ID
    const id = crypto.randomUUID();
    const name = 'Admin User';
    const email = 'admin@example.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the test user
    await db_operations.run(
      'INSERT OR REPLACE INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, hashedPassword, 'ADMIN']
    );

    console.log('Test user created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();
