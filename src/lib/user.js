import bcrypt from 'bcryptjs';
import supabase from './db';

export async function getUserByEmail(email) {
  try {
    console.log('Looking up user with email:', email);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error) {
      console.log('Error looking up user:', error);
      // Handle the case where no user is found
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    console.log('Found user:', data ? 'yes' : 'no');
    return data;
  } catch (error) {
    console.error('Unexpected error in getUserByEmail:', error);
    throw error;
  }
}

export async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    // Handle the case where no user is found
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  return data;
}

export async function createUser({ name, email, password, role = 'USER' }) {
  try {
    console.log('Creating user with email:', email);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ 
        name, 
        email, 
        password: hashedPassword, 
        role 
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user:', error);
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      throw error;
    }
    console.log('User created successfully');
    return data;
  } catch (error) {
    console.error('Unexpected error in createUser:', error);
    throw error;
  }
}

// Helper function to create initial admin users if they don't exist
export async function ensureAdminUsers() {
  try {
    console.log('Checking for admin users...');
    
    // Check if admin users exist
    const admins = [
      {
        email: 'admin@medical-ai.com',
        password: 'SecureAdminPass123!',
        name: 'Medical Admin',
        role: 'ADMIN'
      },
      {
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Example Admin',
        role: 'ADMIN'
      }
    ];

    for (const admin of admins) {
      const existingUser = await getUserByEmail(admin.email);
      if (!existingUser) {
        console.log(`Creating admin user: ${admin.email}`);
        await createUser(admin);
      } else {
        console.log(`Admin user exists: ${admin.email}`);
      }
    }
  } catch (error) {
    console.error('Error ensuring admin users:', error);
    throw error;
  }
}
