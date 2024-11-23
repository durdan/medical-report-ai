import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPromptById } from '@/lib/db';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { findings, promptId, specialty } = await request.json();

    if (!findings) {
      return NextResponse.json({ error: 'Findings are required' }, { status: 400 });
    }

    // Get custom prompt if promptId is provided
    let prompt = null;
    if (promptId && promptId !== 'default') {
      prompt = await getPromptById(promptId);
    }

    // Prepare system prompt
    const defaultPrompt = `You are an expert medical professional specializing in ${specialty}. 
Generate a detailed medical report based on the following findings. 
The report should be professional, accurate, and follow standard medical reporting format.
Include an impression/conclusion section at the end.`;

    const systemPrompt = prompt?.content || defaultPrompt;

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: findings }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      stream: true // Enable streaming
    });

    // Create a custom stream that transforms OpenAI's stream into text
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          let fullReport = '';
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            fullReport += content;
            controller.enqueue(encoder.encode(content));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    // Return streaming response
    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report: ' + error.message },
      { status: 500 }
    );
  }
}
