import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { findings, report, specialty, promptId } = await request.json();
    
    if (!findings || !report || !specialty) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const title = `${specialty} Report - ${new Date().toLocaleDateString()}`;
    const id = process.env.NODE_ENV === 'production' 
      ? crypto.randomUUID()
      : `report-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    if (process.env.NODE_ENV === 'production') {
      const client = await db.connect();
      
      try {
        await client.query('BEGIN');

        const userResult = await client.query(
          'SELECT id FROM users WHERE email = $1',
          [session.user.email]
        );

        if (!userResult.rows[0]) {
          throw new Error('User not found in database');
        }

        const userId = userResult.rows[0].id;

        const reportResult = await client.query(
          `INSERT INTO reports (
            id, title, findings, report, specialty,
            prompt_id, user_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *`,
          [
            id,
            title,
            findings,
            report,
            specialty,
            promptId,
            userId
          ]
        );

        await client.query('COMMIT');
        
        return NextResponse.json({ 
          success: true, 
          report: reportResult.rows[0]
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } else {
      // Development: SQLite
      const user = await db.get(
        'SELECT id FROM users WHERE email = ?',
        [session.user.email]
      );

      if (!user) {
        throw new Error('User not found in database');
      }

      await db.run(
        `INSERT INTO reports (
          id, title, findings, report, specialty,
          prompt_id, user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          id,
          title,
          findings,
          report,
          specialty,
          promptId,
          user.id
        ]
      );

      const savedReport = await db.get(
        'SELECT * FROM reports WHERE id = ?',
        [id]
      );

      return NextResponse.json({ 
        success: true, 
        report: savedReport
      });
    }
  } catch (error) {
    console.error('Error saving report:', error);
    return NextResponse.json(
      { error: 'Failed to save report: ' + error.message },
      { status: 500 }
    );
  }
}
