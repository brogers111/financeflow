import { withAuth } from 'next-auth/middleware';

// Export the middleware function
export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

// Config for which routes to protect
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/transactions/:path*',
    '/insights/:path*',
    '/upload/:path*',
  ]
};