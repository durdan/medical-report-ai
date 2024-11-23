import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { findings, report: content, specialty = 'General', promptId } = await request.json();
    
    // Validate required fields
    if (!findings) {
      return NextResponse.json({ error: 'Findings are required' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Report content is required' }, { status: 400 });
    }
    if (!specialty) {
      return NextResponse.json({ error: 'Specialty is required' }, { status: 400 });
    }

    // Generate title
    const title = `${specialty} Report - ${new Date().toLocaleDateString()}`;

    // Save report using Supabase
    const { data: savedReport, error } = await supabaseAdmin
      .from('reports')
      .insert([
        {
          title,
          findings,
          content,
          specialty,
          prompt_id: promptId || null,
          user_id: session.user.id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving report:', error);
      return NextResponse.json(
        { error: 'Failed to save report: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      report: {
        id: savedReport.id,
        title: savedReport.title,
        content: savedReport.content,
        findings: savedReport.findings,
        specialty: savedReport.specialty,
        createdAt: savedReport.created_at,
        updatedAt: savedReport.updated_at,
        promptId: savedReport.prompt_id
      }
    });
  } catch (error) {
    console.error('Error in save report endpoint:', error);
    return NextResponse.json(
      { error: 'An error occurred while saving the report: ' + error.message },
      { status: 500 }
    );
  }
}
