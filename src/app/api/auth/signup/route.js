import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize database if needed
    await initDb();
    const db = await getDb();

    // Check if user already exists
    const existingUser = await db.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique ID
    const id = crypto.randomUUID();

    // Create user
    await db.run(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, hashedPassword, 'USER']
    );

    // Get the created user
    const user = await db.get(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create user: ' + error.message },
      { status: 500 }
    );
  }
}
