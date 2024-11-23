import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('No user ID in session:', session?.user);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching reports for user:', session.user.email, 'with ID:', session.user.id);

    // Query reports using admin client with correct column names
    const { data: reports, error } = await supabaseAdmin
      .from('reports')
      .select(`
        id,
        content,
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
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    console.log('Successfully fetched reports:', reports?.length || 0);
    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Error listing reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
