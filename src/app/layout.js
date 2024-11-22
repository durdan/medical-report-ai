import './globals.css';

export const metadata = {
  title: 'Medical Report AI Generator',
  description: 'AI-powered medical report generation for all specialties',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen bg-gray-100">
          {children}
        </main>
      </body>
    </html>
  );
}
