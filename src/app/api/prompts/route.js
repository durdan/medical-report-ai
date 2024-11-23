import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';
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

    if (isProd) {
      const result = await db.query(
        'SELECT id, title as name, content as promptText, specialty, is_system as isDefault, created_at as createdAt FROM prompts WHERE is_system = true OR user_id = $1 ORDER BY created_at DESC',
        [session.user.id]
      );
      console.log('Production prompts:', result.rows);
      return NextResponse.json({ prompts: result.rows || [] });
    } 
    
    // In development, initialize and return mock data
    await initializeDefaultPrompts();
    
    // Read all prompt files
    const files = await fs.readdir(PROMPTS_DIR);
    const prompts = await Promise.all(
      files.map(async file => {
        const content = await fs.readFile(path.join(PROMPTS_DIR, file), 'utf-8');
        return JSON.parse(content);
      })
    );
    
    return NextResponse.json({ prompts });
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

    const { name, promptText, specialty, isDefault = false } = await request.json();

    if (!name || !promptText || !specialty) {
      return NextResponse.json(
        { error: 'Name, prompt text, and specialty are required' },
        { status: 400 }
      );
    }

    if (isProd) {
      const result = await db.query(
        `INSERT INTO prompts (
          id, title, content, specialty, is_system, user_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [generateId(), name, promptText, specialty, isDefault, session.user.id]
      );
      return NextResponse.json({ prompt: result.rows[0] });
    } else {
      const prompt = {
        id: generateId(),
        name,
        promptText,
        specialty,
        isDefault,
        createdAt: new Date().toISOString(),
      };

      await fs.writeFile(
        path.join(PROMPTS_DIR, `${prompt.id}.json`),
        JSON.stringify(prompt, null, 2)
      );

      return NextResponse.json({ prompt });
    }
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}
