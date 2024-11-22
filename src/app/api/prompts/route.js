import { NextResponse } from 'next/server';
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

export async function GET() {
  try {
    await initializeDefaultPrompts();
    
    const files = await fs.readdir(PROMPTS_DIR);
    const prompts = await Promise.all(
      files.map(async (file) => {
        const content = await fs.readFile(path.join(PROMPTS_DIR, file), 'utf-8');
        return JSON.parse(content);
      })
    );
    
    // Sort prompts by creation date, with default prompts first
    prompts.sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await ensurePromptsDir();
    
    const data = await request.json();
    
    if (!data.promptText || !data.name) {
      return NextResponse.json(
        { error: 'Name and prompt text are required' },
        { status: 400 }
      );
    }

    const newPrompt = {
      id: generateId(),
      name: data.name,
      specialty: data.specialty || 'General',
      promptText: data.promptText,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(PROMPTS_DIR, `${newPrompt.id}.json`),
      JSON.stringify(newPrompt, null, 2)
    );

    return NextResponse.json({ prompt: newPrompt });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}
