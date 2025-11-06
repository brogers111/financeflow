export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    '/',
    '/upload/:path*',
    '/transactions/:path*',
    '/insights/:path*',
    '/api/graphql'
  ]
};