import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get user ID
    const userResult = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [session.user.email]
    );

    if (!userResult.rows[0]) {
      throw new Error('User not found in database');
    }

    const userId = userResult.rows[0].id;

    // Get the report
    const reportResult = await db.query(
      `SELECT r.*, p.title as prompt_title, p.specialty as prompt_specialty 
       FROM reports r 
       LEFT JOIN prompts p ON r.prompt_id = p.id 
       WHERE r.id = $1 AND r.user_id = $2`,
      [id, userId]
    );

    if (!reportResult.rows[0]) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      ...reportResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch report: ' + error.message },
      { status: 500 }
    );
  }
}
