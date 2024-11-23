import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createReport, getPromptById } from '@/lib/db';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateReportWithAI(findings, prompt, specialty) {
  const defaultPrompt = `You are an expert medical professional specializing in ${specialty}. 
Generate a detailed medical report based on the following findings. 
The report should be professional, accurate, and follow standard medical reporting format.
Include an impression/conclusion section at the end.`;

  const systemPrompt = prompt?.content || defaultPrompt;
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: systemPrompt
        },
        { 
          role: "user", 
          content: findings
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate report with AI: ' + error.message);
  }
}

export async function POST(request) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('No user ID in session:', session?.user);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { content: findings, promptId, specialty = 'General' } = body;

    if (!findings) {
      return NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      );
    }

    console.log('Generating report for user:', session.user.email);

    // Get prompt if promptId is provided
    let prompt = null;
    if (promptId) {
      prompt = await getPromptById(promptId);
    }

    // Generate report using AI
    const generatedContent = await generateReportWithAI(findings, prompt, specialty);

    // Create the report in the database
    const reportData = {
      content: generatedContent,
      userId: session.user.id
    };

    if (promptId) {
      reportData.promptId = promptId;
    }

    const report = await createReport(reportData);
    
    // Format the response
    return NextResponse.json({
      report: {
        id: report.id,
        content: report.content,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        promptId: report.prompt_id
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report: ' + error.message },
      { status: 500 }
    );
  }
}
