import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import db_operations from './db';

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        try {
          // Initialize database if needed
          await db_operations.initializeDatabase();

          // Debug: Log the email being searched
          console.log('Searching for user with email:', credentials.email);

          // Find user by email
          const user = await db_operations.get(
            'SELECT * FROM users WHERE email = ?',
            [credentials.email]
          );

          // Debug: Log the user object (without password)
          console.log('Found user:', user ? { ...user, password: '[REDACTED]' } : null);

          if (!user) {
            throw new Error('No user found with this email');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);
          
          // Debug: Log password validation result
          console.log('Password validation result:', isValid);

          if (!isValid) {
            throw new Error('Invalid password');
          }

          // Return user object without password
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role.toUpperCase() // Ensure role is uppercase
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.toUpperCase() // Ensure role is uppercase
        };
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id,
          email: token.email,
          name: token.name,
          role: token.role.toUpperCase() // Ensure role is uppercase
        };
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development'
};
