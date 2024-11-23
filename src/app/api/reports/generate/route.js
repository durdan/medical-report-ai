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
    const { findings, promptId, specialty = 'General' } = await request.json();

    if (!findings) {
      return NextResponse.json(
        { error: 'Findings are required' },
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
    const generatedReport = await generateReportWithAI(findings, prompt, specialty);
    const title = `${specialty} Report - ${new Date().toLocaleDateString()}`;

    // Create the report in the database
    const report = await createReport({
      title,
      findings,
      content: generatedReport,
      specialty,
      promptId,
      userId: session.user.id
    });
    
    // Format the response
    return NextResponse.json({
      report: generatedReport,
      savedReport: {
        id: report.id,
        title: report.title,
        content: report.content,
        findings: report.findings,
        specialty: report.specialty,
        createdAt: report.created_at,
        updatedAt: report.updated_at
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
