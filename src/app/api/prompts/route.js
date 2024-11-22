import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

// Database connection setup
const pool = new Pool({
  connectionString: isProd 
    ? process.env.POSTGRES_URL
    : process.env.DATABASE_URL,
  ssl: isProd ? {
    rejectUnauthorized: false
  } : false
});

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts');

// Generate a UUID-like identifier
function generateId() {
  return crypto.randomBytes(16).toString('hex');
}

// Ensure prompts directory exists
async function ensurePromptsDir() {
  try {
    await fs.access(PROMPTS_DIR);
  } catch {
    await fs.mkdir(PROMPTS_DIR, { recursive: true });
  }
}

// Default prompts to be created if none exist
const defaultPrompts = [
  {
    id: 'default-1',
    name: 'General Medical Report',
    specialty: 'General',
    promptText: 'You are a professional medical report generator. Generate a clear, concise, and accurate medical report based on the provided findings.',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'default-2',
    name: 'Radiology Report',
    specialty: 'Radiology',
    promptText: 'You are a specialized radiologist. Generate a detailed radiology report based on the provided imaging findings.',
    isDefault: true,
    createdAt: new Date().toISOString(),
  },
];

// Initialize default prompts if none exist
async function initializeDefaultPrompts() {
  await ensurePromptsDir();
  
  try {
    const files = await fs.readdir(PROMPTS_DIR);
    if (files.length === 0) {
      await Promise.all(
        defaultPrompts.map(prompt =>
          fs.writeFile(
            path.join(PROMPTS_DIR, `${prompt.id}.json`),
            JSON.stringify(prompt, null, 2)
          )
        )
      );
    }
  } catch (error) {
    console.error('Error initializing default prompts:', error);
  }
}

export async function GET(request) {
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, use PostgreSQL
    if (isProd) {
      const result = await pool.query(
        'SELECT id, title as name, content as promptText, specialty, is_system as isDefault, created_at, updated_at FROM prompts WHERE is_system = true OR user_id = $1 ORDER BY created_at DESC',
        [session.user.id]
      );
      return NextResponse.json({ prompts: result.rows });
    } 
    
    // In development, return mock data
    const mockPrompts = [
      {
        id: 'default-1',
        name: 'General Medical Report',
        promptText: 'Generate a comprehensive medical report based on the following findings...',
        specialty: 'General',
        isDefault: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'default-2',
        name: 'Radiology Report',
        promptText: 'Generate a detailed radiology report based on the provided imaging findings...',
        specialty: 'Radiology',
        isDefault: true,
        createdAt: new Date().toISOString()
      }
    ];
    return NextResponse.json({ prompts: mockPrompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json({ error: 'Failed to fetch prompts' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { name, promptText, specialty, isDefault = false } = data;

    if (!name || !promptText || !specialty) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (isProd) {
      const result = await pool.query(
        `INSERT INTO prompts (name, prompt_text, specialty, is_default, user_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, promptText, specialty, isDefault, session.user.id]
      );
      return NextResponse.json({ prompt: result.rows[0] });
    }

    // In development, return mock response
    const mockPrompt = {
      id: `mock-${Date.now()}`,
      name,
      promptText,
      specialty,
      isDefault,
      userId: session.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return NextResponse.json({ prompt: mockPrompt });

  } catch (error) {
    console.error('Error in POST /api/prompts:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}
