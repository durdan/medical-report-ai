import { NextResponse } from 'next/server';
import { refineReport } from '@/lib/openai';

export async function POST(request) {
  try {
    const { findings, originalReport, userEdits, promptText } = await request.json();

    if (!findings || !originalReport || !userEdits) {
      return NextResponse.json(
        { error: 'Findings, original report, and user edits are required' },
        { status: 400 }
      );
    }

    const reportText = await refineReport(
      findings,
      originalReport,
      userEdits,
      promptText
    );
    
    return NextResponse.json({ report: reportText });
  } catch (error) {
    console.error('Error refining report:', error);
    return NextResponse.json(
      { error: 'Failed to refine report' },
      { status: 500 }
    );
  }
}
