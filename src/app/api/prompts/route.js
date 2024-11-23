import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getPrompts, initializeDefaultPrompts, createPrompt } from '@/lib/db';

export async function GET(request) {
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize default prompts if needed
    await initializeDefaultPrompts();
    
    // Get all prompts
    const prompts = await getPrompts();
    
    return NextResponse.json({ prompts });
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

    const prompt = await createPrompt({
      title: name,
      content: promptText,
      category: specialty,
      is_system: isDefault,
      user_id: session.user.id
    });

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Error creating prompt:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt: ' + error.message },
      { status: 500 }
    );
  }
}
