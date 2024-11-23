import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// Create a Supabase client with the service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET() {
  try {
    // Test password hashing
    const testPass = 'admin123';
    const testHash = await bcrypt.hash(testPass, 10);
    console.log('Test password:', testPass);
    console.log('Test hash:', testHash);
    const testValid = await bcrypt.compare(testPass, testHash);
    console.log('Test validation:', testValid);

    // Hash passwords for admin users
    const password1 = await bcrypt.hash('SecureAdminPass123!', 10);
    const password2 = await bcrypt.hash('admin123', 10);

    console.log('Admin1 hash:', password1);
    console.log('Admin2 hash:', password2);

    // Create admin users
    const adminUsers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Medical Admin',
        email: 'admin@medical-ai.com',
        password: password1,
        role: 'ADMIN'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Example Admin',
        email: 'admin@example.com',
        password: password2,
        role: 'ADMIN'
      }
    ];

    for (const user of adminUsers) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .upsert(user, { onConflict: 'email' })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', user.email, error);
        throw error;
      }
      console.log('Created/updated user:', user.email);
      console.log('Stored password hash:', data.password);
      
      // Verify the stored hash
      const verifyValid = await bcrypt.compare(
        user.email === 'admin@example.com' ? 'admin123' : 'SecureAdminPass123!',
        data.password
      );
      console.log('Verification after storage:', verifyValid);
    }

    return NextResponse.json({ success: true, message: 'Admin users initialized' });
  } catch (error) {
    console.error('Error initializing admin users:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
