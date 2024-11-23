import { NextResponse } from 'next/server';
import { ensureAdminUsers } from '@/lib/user';

export async function GET() {
  try {
    await ensureAdminUsers();
    return NextResponse.json({ success: true, message: 'Admin users initialized' });
  } catch (error) {
    console.error('Error initializing admin users:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
