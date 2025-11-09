import NextAuth, { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';

// Create a single Prisma instance to avoid connection issues
const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  
  session: {
    strategy: 'jwt',
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  callbacks: {
    // Runs whenever a session is checked
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.email = token.email!;
      }
      return session;
    },
    
    // Runs when JWT is created or updated
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.sub = user.id;
        token.email = user.email;
      }
            
      return token;
    },
    
    // Redirect after sign in
    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return baseUrl + '/dashboard';
    },
  },
  
  // Enable debug in development
  debug: process.env.NODE_ENV === 'development',
};

// Export handlers for Next.js App Router
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };