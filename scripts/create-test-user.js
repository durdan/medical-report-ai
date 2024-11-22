const { createUser, initializeDatabase } = require('../src/lib/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

async function createTestUser() {
  try {
    // Initialize the database first
    await initializeDatabase();
    
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await createUser({
      id: generateId(),
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    });
    console.log('Test user created successfully');
  } catch (error) {
    console.error('Error creating test user:', error);
  }
  process.exit(0);
}

createTestUser();
