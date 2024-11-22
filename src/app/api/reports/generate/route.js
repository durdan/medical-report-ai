import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import db_operations from '@/lib/db';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { findings, promptId, specialty } = await req.json();
    
    if (!findings || !specialty) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await db_operations;

    // Get system prompt
    const systemPrompt = await db.get(
      'SELECT prompt_text FROM prompts WHERE is_system = ? AND (specialty = ? OR specialty = "General") ORDER BY specialty = "General" LIMIT 1',
      [1, specialty]
    );

    // Get user prompt
    const userPrompt = await db.get(
      'SELECT prompt_text FROM prompts WHERE id = ?',
      [promptId]
    );

    if (!userPrompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    const openaiClient = await getOpenAIClient();

    const messages = [
      {
        role: 'system',
        content: systemPrompt?.prompt_text || 'You are a medical report assistant. Generate accurate and professional medical reports.'
      },
      {
        role: 'user',
        content: `${userPrompt.prompt_text}\n\nFindings:\n${findings}`
      }
    ];

    const completion = await openaiClient.chat.completions.create({
      messages,
      model: process.env.AI_MODEL || 'gpt-3.5-turbo',
      temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7,
      max_tokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
    });

    const report = completion.choices[0]?.message?.content;

    if (!report) {
      throw new Error('Failed to generate report');
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report: ' + error.message },
      { status: 500 }
    );
  }
}
