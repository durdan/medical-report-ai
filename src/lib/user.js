import bcrypt from 'bcryptjs';
import supabase from './db';

export async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

export async function createUser({ name, email, password, role = 'USER' }) {
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
  
  if (error) throw error;
  return data;
}
