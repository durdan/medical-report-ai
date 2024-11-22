import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const PROMPTS_DIR = path.join(process.cwd(), 'data', 'prompts');

export async function GET(request, { params }) {
  try {
    const promptPath = path.join(PROMPTS_DIR, `${params.id}.json`);
    const promptData = await fs.readFile(promptPath, 'utf-8');
    const prompt = JSON.parse(promptData);
    return NextResponse.json({ prompt });
  } catch (error) {
    return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
  }
}

export async function PUT(request, { params }) {
  try {
    const promptPath = path.join(PROMPTS_DIR, `${params.id}.json`);
    const data = await request.json();
    
    // Validate required fields
    if (!data.promptText || !data.name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update prompt
    const prompt = {
      id: params.id,
      promptText: data.promptText,
      name: data.name,
      specialty: data.specialty || 'General',
      isDefault: false,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(promptPath, JSON.stringify(prompt, null, 2));
    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error updating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const promptPath = path.join(PROMPTS_DIR, `${params.id}.json`);
    await fs.unlink(promptPath);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
