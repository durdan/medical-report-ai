import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import db_operations from '@/lib/db';
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
    await db_operations.initializeDatabase();

    // Check if user already exists
    const existingUser = await db_operations.get(
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
    await db_operations.run(
      'INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [id, name, email, hashedPassword, 'USER']
    );

    // Get the created user
    const user = await db_operations.get(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [id]
    );

    return NextResponse.json(
      { message: 'User created successfully', user },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Error creating user' },
      { status: 500 }
    );
  }
}
