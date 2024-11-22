import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import db_operations from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching prompts for user:', session.user);

    let prompts;
    if (session.user.role === 'ADMIN') {
      // Admin sees all prompts
      prompts = await db_operations.all(`
        SELECT * FROM prompts 
        ORDER BY is_default DESC, created_at DESC
      `);
    } else {
      // Regular users see their prompts and default prompts
      prompts = await db_operations.all(`
        SELECT * FROM prompts 
        WHERE user_id = ? OR is_default = 1
        ORDER BY is_default DESC, created_at DESC
      `, [session.user.id]);
    }

    console.log('Found prompts:', prompts);

    // Format the response
    const formattedPrompts = prompts.map(prompt => ({
      id: prompt.id,
      name: prompt.name,
      promptText: prompt.prompt_text,
      specialty: prompt.specialty,
      isDefault: Boolean(prompt.is_default),
      userId: prompt.user_id,
      createdAt: prompt.created_at,
      updatedAt: prompt.updated_at
    }));

    return NextResponse.json({ prompts: formattedPrompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, promptText, specialty } = await request.json();

    // Validate required fields
    if (!name || !promptText || !specialty) {
      return NextResponse.json(
        { error: 'Name, prompt text, and specialty are required' },
        { status: 400 }
      );
    }

    const promptId = `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    await db_operations.run(`
      INSERT INTO prompts (id, name, prompt_text, specialty, user_id, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [promptId, name, promptText, specialty, session.user.id, 0]);

    return NextResponse.json({ 
      success: true,
      prompt: {
        id: promptId,
        name,
        promptText,
        specialty,
        userId: session.user.id,
        isDefault: false
      }
    });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt: ' + error.message },
      { status: 500 }
    );
  }
}
