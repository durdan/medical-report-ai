import './globals.css';
import { Providers } from './providers';
import Navigation from '@/components/Navigation';
import SessionProviders from '@/components/Providers';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'Medical Report AI Generator',
  description: 'AI-powered medical report generation for all specialties',
};

export default async function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProviders>
          <Providers>
            <Navigation />
            <main className="min-h-screen bg-gray-100 pt-4">
              {children}
            </main>
            <Toaster position="top-right" />
          </Providers>
        </SessionProviders>
      </body>
    </html>
  );
}
