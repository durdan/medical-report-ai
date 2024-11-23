import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateReport } from '@/lib/openai';
import { getUserByEmail, createReport } from '@/lib/db';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { prompt, specialty, findings, promptId } = data;

    if (!prompt || !specialty || !findings) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user ID
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate report using OpenAI
    const report = await generateReport(prompt, specialty, findings);

    // Save report to database
    const savedReport = await createReport(
      user.id,
      `${specialty} Report`,
      findings,
      report,
      specialty,
      promptId
    );

    return NextResponse.json({
      success: true,
      report: savedReport
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report: ' + error.message },
      { status: 500 }
    );
  }
}
