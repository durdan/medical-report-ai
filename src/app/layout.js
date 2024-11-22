import './globals.css';
import { Providers } from './providers';
import Navigation from '@/components/Navigation';

export const metadata = {
  title: 'Medical Report AI Generator',
  description: 'AI-powered medical report generation for all specialties',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Navigation />
          <main className="min-h-screen bg-gray-100 pt-4">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
