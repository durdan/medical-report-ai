import { NextResponse } from 'next/server';
import { createUser, initDb } from '@/lib/db';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    // Initialize database first
    try {
      await initDb();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization error:', error);
      return NextResponse.json(
        { error: 'Failed to initialize database: ' + error.message },
        { status: 500 }
      );
    }

    // Create user
    try {
      const user = await createUser({ name, email, password });
      console.log('User created successfully:', user.email);
      return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
      console.error('User creation error:', error);
      
      if (error.code === '23505') { // Unique violation in PostgreSQL
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create user: ' + error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Signup route error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}
