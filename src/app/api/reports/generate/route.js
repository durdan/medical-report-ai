import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/openai';
import { dbPool } from '@/lib/db';

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

    let systemPrompt, userPrompt;

    if (process.env.NODE_ENV === 'production') {
      // Get system prompt from PostgreSQL
      const systemResult = await dbPool.query(
        'SELECT prompt_text FROM prompts WHERE is_system = true AND (specialty = $1 OR specialty = $2) ORDER BY specialty = $2 LIMIT 1',
        [specialty, 'General']
      );
      systemPrompt = systemResult.rows[0];

      // Get user prompt if promptId is provided
      if (promptId) {
        const userResult = await dbPool.query(
          'SELECT prompt_text FROM prompts WHERE id = $1',
          [promptId]
        );
        userPrompt = userResult.rows[0];
      }
    } else {
      // Development mock data
      systemPrompt = {
        prompt_text: 'You are a medical report assistant. Generate accurate and professional medical reports.'
      };
      
      userPrompt = {
        prompt_text: 'Generate a detailed medical report based on the following findings, focusing on clarity and medical accuracy.'
      };
    }

    const openaiClient = await getOpenAIClient();

    const messages = [
      {
        role: 'system',
        content: systemPrompt?.prompt_text || 'You are a medical report assistant. Generate accurate and professional medical reports.'
      },
      {
        role: 'user',
        content: `${userPrompt?.prompt_text || 'Please generate a detailed medical report based on these findings:'}\n\nFindings:\n${findings}`
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
