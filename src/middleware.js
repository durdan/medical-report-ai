import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    // If the user is authenticated, allow the request
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/auth/signin'
    }
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/report-generator/:path*',
    '/prompts/:path*',
    '/api/reports/:path*',
    '/api/prompts/:path*'
  ]
};
