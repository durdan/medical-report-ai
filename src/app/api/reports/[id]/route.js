import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get the report using Supabase
    const { data: report, error } = await supabaseAdmin
      .from('reports')
      .select(`
        id,
        title,
        findings,
        content,
        specialty,
        created_at,
        updated_at,
        user_id,
        prompt:prompts(
          id,
          title,
          content,
          category,
          is_active
        )
      `)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching report:', error);
      return NextResponse.json(
        { error: 'Failed to fetch report: ' + error.message },
        { status: 500 }
      );
    }

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { findings, report: content, specialty, promptId } = await request.json();

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

    // Update the report using Supabase
    const { data: updatedReport, error } = await supabaseAdmin
      .from('reports')
      .update({
        title,
        findings,
        content,
        specialty,
        prompt_id: promptId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating report:', error);
      return NextResponse.json(
        { error: 'Failed to update report: ' + error.message },
        { status: 500 }
      );
    }

    if (!updatedReport) {
      return NextResponse.json(
        { error: 'Report not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({ report: updatedReport });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Failed to update report: ' + error.message },
      { status: 500 }
    );
  }
}
