import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/lib/db';
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

    const db = await getDb();
    
    if (isProd) {
      // Production: PostgreSQL
      const client = await db.connect();
      
      try {
        // Build query parts
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        // Add user condition
        if (session.user.role !== 'ADMIN') {
          conditions.push(`reports.user_id = $${paramIndex}`);
          params.push(session.user.id);
          paramIndex++;
        }

        // Add search condition if provided
        if (search) {
          conditions.push(`(title ILIKE $${paramIndex} OR findings ILIKE $${paramIndex} OR report ILIKE $${paramIndex})`);
          params.push(`%${search}%`);
          paramIndex++;
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `
          SELECT COUNT(*) as total 
          FROM reports 
          ${whereClause}
        `;
        
        const countResult = await client.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].total);

        // Get paginated reports
        const reportsQuery = `
          SELECT 
            reports.*, 
            users.email as user_email
          FROM reports 
          LEFT JOIN users ON reports.user_id = users.id
          ${whereClause}
          ORDER BY reports.${sortBy} ${sortOrder}
          LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const reportsResult = await client.query(
          reportsQuery,
          [...params, limit, offset]
        );

        return NextResponse.json({
          reports: reportsResult.rows,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
            itemsPerPage: limit
          }
        });

      } finally {
        client.release();
      }
    } else {
      // Development: SQLite
      const conditions = [];
      const params = [];

      // Add user condition
      if (session.user.role !== 'ADMIN') {
        conditions.push('reports.user_id = ?');
        params.push(session.user.id);
      }

      if (search) {
        conditions.push('(title LIKE ? OR findings LIKE ? OR report LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countResult = await db.get(
        `SELECT COUNT(*) as total FROM reports ${whereClause}`,
        params
      );
      
      const totalCount = countResult.total;

      // Get paginated reports
      const reports = await db.all(
        `SELECT 
          reports.*, 
          users.email as user_email
        FROM reports 
        LEFT JOIN users ON reports.user_id = users.id
        ${whereClause}
        ORDER BY reports.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      return NextResponse.json({
        reports,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          itemsPerPage: limit
        }
      });
    }
  } catch (error) {
    console.error('Error in GET /api/reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports: ' + error.message },
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

    const { title, content, specialty, patientInfo, systemPrompt } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    console.log('Creating report:', {
      id,
      title,
      content: content.substring(0, 100) + '...',
      user_id: session.user.id
    });

    if (isProd) {
      const client = await db.connect();
      
      try {
        await client.query(
          `INSERT INTO reports (
            id, title, content, specialty, patient_info, system_prompt,
            user_id, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            title,
            content,
            specialty || null,
            patientInfo || null,
            systemPrompt || null,
            session.user.id,
            now,
            now
          ]
        );

        const report = await client.query(
          'SELECT * FROM reports WHERE id = $1',
          [id]
        );

        return NextResponse.json(
          { message: 'Report created successfully', report: report.rows[0] },
          { status: 201 }
        );
      } finally {
        client.release();
      }
    } else {
      // Development: SQLite
      const report = {
        id,
        title,
        content,
        specialty,
        patientInfo,
        systemPrompt,
        user_id: session.user.id,
        user_email: session.user.email,
        created_at: now,
        updated_at: now
      };

      await db.run(
        `INSERT INTO reports (
          id, title, content, specialty, patient_info, system_prompt,
          user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          title,
          content,
          specialty || null,
          patientInfo || null,
          systemPrompt || null,
          session.user.id,
          now,
          now
        ]
      );

      return NextResponse.json(
        { message: 'Report created successfully', report },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Error creating report' },
      { status: 500 }
    );
  }
}
