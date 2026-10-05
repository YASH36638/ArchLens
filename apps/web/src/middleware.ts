import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: { signIn: '/login' },
  callbacks: {
    authorized: ({ token }) =>
      Boolean(token?.archlens?.accessToken) && token?.archlens?.error !== 'RefreshFailed',
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/projects/:path*',
    '/glossary/:path*',
    '/metrics/:path*',
    '/smells/:path*',
    '/repos/:path*',
    '/integrations/:path*',
    '/account/:path*',
  ],
};
