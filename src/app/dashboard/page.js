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

      setReports(data.reports || []);
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Medical Reports</h1>
        <Link 
          href="/report-generator" 
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Generate New Report
        </Link>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">Loading reports...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">No reports found. Generate your first report!</p>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="grid gap-6">
          {reports.map((report) => (
            <div 
              key={report.id} 
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold mb-2">{report.title || 'Untitled Report'}</h2>
                  <p className="text-gray-600 text-sm">
                    {new Date(report.created_at).toLocaleDateString()} - {report.specialty || 'General'}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/report/${report.id}`)}
                  className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200"
                >
                  View
                </button>
              </div>
              <p className="text-gray-700 line-clamp-3">{report.findings}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
