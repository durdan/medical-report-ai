import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import crypto from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

async function getSession(request) {
  const session = await getServerSession(authOptions);
  return session;
}

export async function GET(request) {
  try {
    const session = await getSession(request);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const offset = (page - 1) * limit;

    if (isProd) {
      // Build query parts
      const conditions = [];
      const params = [limit, offset];
      let paramIndex = 3;

      // Add user condition
      if (session.user.role !== 'ADMIN') {
        conditions.push(`user_id = $${paramIndex}`);
        params.push(session.user.id);
        paramIndex++;
      }

      // Add search condition if provided
      if (search) {
        conditions.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Construct the WHERE clause
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await db.query(
        `SELECT COUNT(*) as total FROM reports ${whereClause}`,
        params.slice(2)
      );
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const result = await db.query(
        `SELECT * FROM reports 
        ${whereClause} 
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $1 OFFSET $2`,
        params
      );

      return NextResponse.json({
        reports: result.rows,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } else {
      // Development: Return mock data
      return NextResponse.json({
        reports: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0
        }
      });
    }
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getSession(request);
    
    if (!session?.user?.id) {
      console.error('Unauthorized access attempt:', session);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, content, specialty, generatedReport } = await request.json();

    if (!title || !content || !generatedReport) {
      return NextResponse.json(
        { error: 'Title, findings content, and generated report are required' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (isProd) {
      // Insert the report
      await db.query(
        `INSERT INTO reports (
          id, title, findings, report, specialty,
          user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          title,
          content, // User's input findings
          generatedReport, // OpenAI generated report
          specialty || null,
          session.user.id,
          now,
          now
        ]
      );

      // Get the created report
      const result = await db.query(
        'SELECT * FROM reports WHERE id = $1',
        [id]
      );

      // Map the response to match the frontend expectations
      const report = result.rows[0];
      return NextResponse.json(
        { 
          message: 'Report created successfully', 
          report: {
            ...report,
            content: report.findings, // Map findings to content for frontend compatibility
            generatedReport: report.report // Include the OpenAI generated report
          }
        },
        { status: 201 }
      );
    } else {
      // Development: Return mock data
      const report = {
        id,
        title,
        content, // Original user input (findings)
        generatedReport, // OpenAI generated report
        specialty,
        user_id: session.user.id,
        created_at: now,
        updated_at: now
      };

      return NextResponse.json(
        { message: 'Report created successfully', report },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report: ' + error.message },
      { status: 500 }
    );
  }
}
