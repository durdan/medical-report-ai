import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
};

Object.entries(requiredEnvVars).forEach(([name, value]) => {
  if (!value) {
    throw new Error(`Missing ${name} environment variable`);
  }
});

// Create Supabase client for general operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Create admin client for privileged operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Database helper functions
export async function getUserByEmail(email) {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error) {
    console.error('Error fetching user:', error);
    throw error;
  }

  return user;
}

// Initialize default prompts in the database
export async function initializeDefaultPrompts() {
  const defaultPrompts = [
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      title: 'General Medical Report',
      content: 'You are a professional medical report generator. Generate a clear, concise, and accurate medical report based on the provided findings.',
      category: 'General',
      is_active: true,
      user_id: '550e8400-e29b-41d4-a716-446655440000'
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      title: 'Radiology Report',
      content: 'You are a specialized radiologist. Generate a detailed radiology report based on the provided imaging findings.',
      category: 'Radiology',
      is_active: true,
      user_id: '550e8400-e29b-41d4-a716-446655440000'
    }
  ];

  for (const prompt of defaultPrompts) {
    const { error } = await supabaseAdmin
      .from('prompts')
      .upsert([prompt], { onConflict: 'id' });

    if (error) {
      console.error('Error initializing prompt:', error);
      throw error;
    }
  }
}

// Get available prompts
export async function getPrompts() {
  const { data: prompts, error } = await supabaseAdmin
    .from('prompts')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching prompts:', error);
    throw error;
  }

  return prompts.map(prompt => ({
    id: prompt.id,
    name: prompt.title,
    promptText: prompt.content,
    specialty: prompt.category,
    isDefault: prompt.is_system,
    createdAt: prompt.created_at
  }));
}

// Get prompt by ID
export async function getPromptById(id) {
  const { data: prompt, error } = await supabaseAdmin
    .from('prompts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching prompt:', error);
    throw error;
  }

  if (!prompt) {
    return null;
  }

  return {
    id: prompt.id,
    name: prompt.title,
    content: prompt.content,
    specialty: prompt.category,
    isDefault: prompt.is_system,
    createdAt: prompt.created_at
  };
}

export async function createReport({ title, findings, content, specialty, promptId, userId }) {
  console.log('Creating report with:', { title, findings, content, specialty, promptId, userId });

  if (!title || !findings || !content || !specialty || !userId) {
    throw new Error('Missing required fields: title, findings, content, specialty, and userId are required');
  }

  const reportData = {
    title,
    findings,
    content,
    specialty,
    user_id: userId,
    prompt_id: promptId || null
  };

  const { data: report, error } = await supabaseAdmin
    .from('reports')
    .insert([reportData])
    .select('*, prompt:prompts(*)')
    .single();

  if (error) {
    console.error('Error creating report:', error);
    throw error;
  }

  console.log('Created report:', report);
  return report;
}

// Create a new prompt
export async function createPrompt({ title, content, category, is_system = false, user_id }) {
  const { data: prompt, error } = await supabaseAdmin
    .from('prompts')
    .insert([
      {
        title,
        content,
        category,
        is_system,
        user_id,
        is_active: true
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating prompt:', error);
    throw error;
  }

  return {
    id: prompt.id,
    name: prompt.title,
    promptText: prompt.content,
    specialty: prompt.category,
    isDefault: prompt.is_system,
    createdAt: prompt.created_at
  };
}

export { supabase as db, supabaseAdmin };
