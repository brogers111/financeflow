import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
);

// Protect all routes except login, auth endpoints, and API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login (login page)
     * - /api/auth (NextAuth endpoints)
     * - /api/parse-pdf (PDF parsing - called from GraphQL which is already authenticated)
     * - /api/graphql (GraphQL - has its own auth)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico, /robots.txt (metadata files)
     * - /*.svg, /*.png, /*.jpg (image files)
     */
    '/((?!login|api/auth|api/parse-pdf|api/graphql|_next/static|_next/image|favicon.ico|robots.txt|.*\\.svg|.*\\.png|.*\\.jpg).*)',
  ],
};