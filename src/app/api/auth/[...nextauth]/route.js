import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import '@/lib/db/init';

const handler = NextAuth({
  ...authOptions,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  }
});

export { handler as GET, handler as POST };
