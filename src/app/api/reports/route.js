import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db_operations from '@/lib/db';
import crypto from 'crypto';

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

    // Initialize database if needed
    await db_operations.initializeDatabase();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';
    const offset = (page - 1) * limit;

    console.log('Session user:', session.user);

    // Base queries
    let countQuery = 'SELECT COUNT(*) as total FROM reports';
    let query = `
      SELECT reports.*, users.email as user_email 
      FROM reports 
      LEFT JOIN users ON reports.user_id = users.id
    `;

    const params = [];
    
    // Add WHERE clause based on user role
    if (session.user.role !== 'ADMIN') {
      countQuery += ' WHERE user_id = ?';
      query += ' WHERE reports.user_id = ?';
      params.push(session.user.id);
    }

    // Add search condition if provided
    if (search) {
      const whereOrAnd = params.length === 0 ? ' WHERE' : ' AND';
      const searchCondition = `${whereOrAnd} (title LIKE ? OR content LIKE ?)`;
      countQuery += searchCondition;
      query += searchCondition;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add sorting and pagination
    query += ` ORDER BY ${sortBy} ${sortOrder}`;
    
    // Execute count query
    console.log('Count Query:', countQuery, 'Params:', params);
    const totalCount = await db_operations.get(countQuery, params);
    
    // Add pagination to main query
    query += ' LIMIT ? OFFSET ?';
    const queryParams = [...params, limit, offset];
    
    // Execute main query
    console.log('Main Query:', query, 'Params:', queryParams);
    const reports = await db_operations.all(query, queryParams);

    console.log('Total count:', totalCount);
    console.log('Reports found:', reports);

    return NextResponse.json({
      reports,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount.total / limit),
        totalItems: totalCount.total,
        itemsPerPage: limit
      }
    });

  } catch (error) {
    console.error('Error in GET /api/reports:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
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

    // Initialize database
    await db_operations.initializeDatabase();

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    console.log('Creating report:', {
      id,
      title,
      content: content.substring(0, 100) + '...',
      user_id: session.user.id
    });

    await db_operations.run(
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

    const report = await db_operations.get(
      'SELECT * FROM reports WHERE id = ?',
      [id]
    );

    console.log('Created report:', report);

    return NextResponse.json(
      { message: 'Report created successfully', report },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Error creating report' },
      { status: 500 }
    );
  }
}
