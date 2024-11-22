import { NextResponse } from 'next/server';
import { generateMedicalReport } from '@/lib/openai';

export async function POST(request) {
  try {
    const { findings, specialty, promptText } = await request.json();

    if (!findings) {
      return NextResponse.json(
        { error: 'Findings are required' },
        { status: 400 }
      );
    }

    const reportText = await generateMedicalReport(findings, specialty, promptText);
    
    return NextResponse.json({ report: reportText });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
