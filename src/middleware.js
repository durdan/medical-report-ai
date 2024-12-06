import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that require authentication
const protectedPaths = [
  '/api/reports',
];

// Paths that should be accessible without authentication
const publicPaths = [
  '/api/auth',
];

// CORS middleware
function corsMiddleware(request) {
  const origin = request.headers.get('origin') || '*';
  const headers = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
    'Access-Control-Expose-Headers': 'Content-Length',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  return headers;
}

// Middleware function
export async function middleware(request) {
  const { pathname } = new URL(request.url);

  // Add CORS headers to all responses
  const corsHeaders = corsMiddleware(request);
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { 
      status: 200,
      headers: corsHeaders
    });
  }

  // Check if path requires authentication
  const requiresAuth = protectedPaths.some(path => pathname.startsWith(path));
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (!requiresAuth || isPublicPath) {
    return NextResponse.next({
      headers: corsHeaders
    });
  }

  try {
    // Verify authentication
    const token = await getToken({ req: request });
    
    if (!token) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Continue with authenticated request
    return NextResponse.next({
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Middleware error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    '/api/:path*',
  ],
};
