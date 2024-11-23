'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';

export default function ReportViewer({ params }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchReport();
  }, [session, params.id]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/reports/${params.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error fetching report');
      }

      setReport(data.report);
    } catch (error) {
      console.error('Error fetching report:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const reportText = `
Title: ${report.title}
Specialty: ${report.specialty}
Date: ${new Date(report.created_at).toLocaleDateString()}

Findings:
${report.findings}

Report:
${report.content}
      `;

      await navigator.clipboard.writeText(reportText);
      setCopySuccess('Report copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      setCopySuccess('Failed to copy to clipboard');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const lineHeight = 10;
      let y = 20;

      // Add title
      doc.setFontSize(16);
      doc.text(report.title, 20, y);
      y += lineHeight * 2;

      // Add metadata
      doc.setFontSize(12);
      doc.text(`Specialty: ${report.specialty}`, 20, y);
      y += lineHeight;
      doc.text(`Date: ${new Date(report.created_at).toLocaleDateString()}`, 20, y);
      y += lineHeight * 2;

      // Add findings
      doc.setFontSize(14);
      doc.text('Findings:', 20, y);
      y += lineHeight;
      doc.setFontSize(12);
      
      const findingsLines = doc.splitTextToSize(report.findings, 170);
      findingsLines.forEach(line => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += lineHeight;
      });

      y += lineHeight;

      // Add report content
      doc.setFontSize(14);
      doc.text('Report:', 20, y);
      y += lineHeight;
      doc.setFontSize(12);

      const contentLines = doc.splitTextToSize(report.content, 170);
      contentLines.forEach(line => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, 20, y);
        y += lineHeight;
      });

      doc.save(`${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setError('Failed to export PDF');
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">Loading report...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && !error && report && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{report.title}</h1>
              <p className="text-gray-600">
                {new Date(report.created_at).toLocaleDateString()} - {report.specialty}
              </p>
            </div>
            <div className="space-x-4">
              <button
                onClick={copyToClipboard}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={exportToPDF}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Export PDF
              </button>
            </div>
          </div>

          {copySuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {copySuccess}
            </div>
          )}

          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">Findings</h2>
              <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
                {report.findings}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Report</h2>
              <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap">
                {report.content}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
