import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { findings, report, specialty, promptId } = await request.json();

    if (!findings || !report || !specialty) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user ID
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    );

    if (!userResult.rows[0]) {
      throw new Error('User not found in database');
    }

    const userId = userResult.rows[0].id;

    // Verify report ownership
    const ownershipCheck = await db.query(
      'SELECT id FROM reports WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (!ownershipCheck.rows[0]) {
      return NextResponse.json(
        { error: 'Report not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update the report
    const reportResult = await db.query(
      `UPDATE reports 
       SET findings = $1, report = $2, specialty = $3, prompt_id = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [findings, report, specialty, promptId, id, userId]
    );

    return NextResponse.json({ 
      success: true,
      report: reportResult.rows[0]
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Failed to update report: ' + error.message },
      { status: 500 }
    );
  }
}
