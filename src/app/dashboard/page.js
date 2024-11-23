'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import AdvancedFilters from '@/components/AdvancedFilters';
import EditReportModal from '@/components/EditReportModal';
import EditPromptModal from '@/components/EditPromptModal';
import ExportMenu from '@/components/ExportMenu';
import { jsPDF } from 'jspdf';

const ITEMS_PER_PAGE = 10;

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchReports();
  }, [session]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/reports/list');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error fetching reports');
      }

      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNewReport = () => {
    router.push('/report-generator');
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/delete/${reportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete report');
      }

      // Refresh the reports list
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  const copyToClipboard = async (report) => {
    try {
      const formattedReport = `
Medical Report
=============
Title: ${report.title}
Specialty: ${report.specialty}
Date: ${new Date(report.created_at).toLocaleDateString()}

Findings:
${report.findings}

Report:
${report.report}
`;

      await navigator.clipboard.writeText(formattedReport);
      setCopySuccess('Report copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy report:', err);
      alert('Failed to copy report to clipboard');
    }
  };

  const exportToPDF = (report) => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Medical Report', 20, 20);
      
      // Add metadata
      doc.setFontSize(12);
      doc.text(`Title: ${report.title}`, 20, 35);
      doc.text(`Specialty: ${report.specialty}`, 20, 45);
      doc.text(`Date: ${new Date(report.created_at).toLocaleDateString()}`, 20, 55);
      
      // Add findings
      doc.setFontSize(14);
      doc.text('Findings:', 20, 70);
      doc.setFontSize(12);
      const findingsLines = doc.splitTextToSize(report.findings, 170);
      doc.text(findingsLines, 20, 80);
      
      // Add report
      const yPosition = 80 + (findingsLines.length * 7);
      doc.setFontSize(14);
      doc.text('Report:', 20, yPosition);
      doc.setFontSize(12);
      const reportLines = doc.splitTextToSize(report.report, 170);
      doc.text(reportLines, 20, yPosition + 10);
      
      // Save the PDF
      doc.save(`medical-report-${report.id}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('Failed to export report as PDF');
    }
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600">Welcome, {session.user.email}</p>
              </div>
              <button
                onClick={handleNewReport}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                New Report
              </button>
            </div>
          </div>

          {/* Reports */}
          <div className="mt-6 px-6">
            <h3 className="text-lg font-semibold mb-4">Your Reports</h3>
            {loading ? (
              <p className="text-gray-600">Loading...</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : reports.length === 0 ? (
              <p className="text-gray-600">No reports found. Create your first report!</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <h4 className="text-lg font-medium">{report.title}</h4>
                    <p className="text-gray-600 mt-2">Specialty: {report.specialty}</p>
                    <p className="text-gray-600">Findings: {report.findings}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      Created: {new Date(report.created_at).toLocaleString()}
                    </div>
                    <div className="mt-2 space-x-4">
                      <button
                        onClick={() => router.push(`/report-generator?id=${report.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => copyToClipboard(report)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => exportToPDF(report)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        Export PDF
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                    {copySuccess && (
                      <div className="mt-2 text-sm text-green-600">{copySuccess}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
