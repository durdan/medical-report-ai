import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a single supabase client for interacting with your database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Export database interface
export const db = {
  query: async (text, params) => {
    try {
      // Convert SQL query to Supabase query
      // This is a basic example - you'll need to adapt this based on your actual queries
      const { data, error } = await supabase
        .from('your_table')
        .select('*')
        // Add any additional query parameters here
        
      if (error) throw error;
      return { rows: data };
      
    } catch (error) {
      console.error('Query error:', {
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
  }
};

export const createUser = async (email, password, name) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const { data, error } = await supabase
    .from('users')
    .insert([{ email, password: hashedPassword, name, role: 'USER' }])
    .select('id, email, name, role');
  
  if (error) throw error;
  return data[0];
};

export const getUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email);
  
  if (error) throw error;
  return data[0];
};

export const getUserById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id);
  
  if (error) throw error;
  return data[0];
};

export const verifyPassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

export const createReport = async (userId, title, findings, report, specialty, promptId) => {
  const { data, error } = await supabase
    .from('reports')
    .insert([{ user_id: userId, title, findings, report, specialty, prompt_id: promptId }])
    .select('*');
  
  if (error) throw error;
  return data[0];
};

export const updateReport = async (reportId, userId, title, findings, report, specialty, promptId) => {
  const { data, error } = await supabase
    .from('reports')
    .update([{ title, findings, report, specialty, prompt_id: promptId, updated_at: new Date().toISOString() }])
    .eq('id', reportId)
    .eq('user_id', userId)
    .select('*');
  
  if (error) throw error;
  return data[0];
};

export const deleteReport = async (reportId, userId) => {
  const { data, error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId)
    .eq('user_id', userId)
    .select('*');
  
  if (error) throw error;
  return data[0];
};

export const getReportById = async (reportId, userId) => {
  const { data, error } = await supabase
    .from('reports')
    .select('*, prompts(title, specialty) as prompt_title, prompts(specialty) as prompt_specialty')
    .eq('id', reportId)
    .eq('user_id', userId);
  
  if (error) throw error;
  return data[0];
};

export const listReports = async (userId) => {
  const { data, error } = await supabase
    .from('reports')
    .select('*, prompts(title) as prompt_title')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const createPrompt = async (title, content, specialty) => {
  const { data, error } = await supabase
    .from('prompts')
    .insert([{ title, content, specialty }])
    .select('*');
  
  if (error) throw error;
  return data[0];
};

export const updatePrompt = async (id, title, content, specialty) => {
  const { data, error } = await supabase
    .from('prompts')
    .update([{ title, content, specialty }])
    .eq('id', id)
    .select('*');
  
  if (error) throw error;
  return data[0];
};

export const deletePrompt = async (id) => {
  const { data, error } = await supabase
    .from('prompts')
    .delete()
    .eq('id', id)
    .select('*');
  
  if (error) throw error;
  return data[0];
};

export const getPromptById = async (id) => {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', id);
  
  if (error) throw error;
  return data[0];
};

export const listPrompts = async () => {
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};
