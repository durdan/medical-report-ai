import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import db_operations from '@/lib/db';

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Session user:', session.user);

    const requestData = await request.json();
    const { findings, report, specialty } = requestData;
    let { promptId } = requestData;
    
    // Get the database user ID
    const dbUser = await db_operations.get(
      'SELECT id FROM users WHERE email = ?',
      [session.user.email]
    );

    if (!dbUser) {
      console.error('User not found in database');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate a timestamp-based ID
    const timestamp = new Date().toISOString();
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // If promptId is provided, verify it exists
    if (promptId) {
      console.log('Checking prompt:', promptId);
      const prompt = await db_operations.get('SELECT id FROM prompts WHERE id = ?', [promptId]);
      if (!prompt) {
        console.log('Prompt not found:', promptId);
        // Try to get default prompt
        const defaultPrompt = await db_operations.get(
          'SELECT id FROM prompts WHERE specialty = ? AND is_default = ? LIMIT 1',
          [specialty, 1]
        );
        if (defaultPrompt) {
          console.log('Using default prompt:', defaultPrompt.id);
          promptId = defaultPrompt.id;
        } else {
          console.log('No default prompt found for specialty:', specialty);
          promptId = null;
        }
      }
    }

    const title = `${specialty} Report - ${new Date().toLocaleDateString()}`;

    // Save to database with explicit transaction
    await db_operations.run('BEGIN TRANSACTION');
    
    try {
      console.log('Saving report with prompt:', promptId);
      await db_operations.run(
        `INSERT INTO reports (
          id, title, findings, report, specialty,
          prompt_id, user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reportId,
          title,
          findings,
          report,
          specialty,
          promptId,
          dbUser.id, // Use the database user ID instead of session user ID
          timestamp,
          timestamp
        ]
      );
      
      await db_operations.run('COMMIT');
      console.log('Report saved successfully:', reportId);
      
      return NextResponse.json({ success: true, id: reportId });
    } catch (error) {
      console.error('Transaction error:', error);
      await db_operations.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error saving report:', error);
    return NextResponse.json(
      { error: 'Failed to save report: ' + error.message },
      { status: 500 }
    );
  }
}
