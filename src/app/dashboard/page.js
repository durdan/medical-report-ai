'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Pagination from '@/components/Pagination';
import AdvancedFilters from '@/components/AdvancedFilters';
import EditReportModal from '@/components/EditReportModal';
import EditPromptModal from '@/components/EditPromptModal';
import ExportMenu from '@/components/ExportMenu';

const ITEMS_PER_PAGE = 10;

export default function Dashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingReport, setEditingReport] = useState(null);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    fetchReports();
  }, [session, currentPage, searchTerm, sortBy, sortOrder]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/reports?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error fetching reports');
      }

      setReports(data.reports);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewReport = () => {
    router.push('/report-generator');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
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
                <p className="text-gray-600">Role: {session.user.role}</p>
              </div>
              <button
                onClick={handleNewReport}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                New Report
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={handleSearch}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Reports */}
          <div className="mt-6 px-6">
            <h3 className="text-lg font-semibold mb-4">
              {session.user.role === 'admin' ? 'All Reports' : 'Your Reports'}
            </h3>
            {loading ? (
              <p className="text-gray-600">Loading...</p>
            ) : reports.length === 0 ? (
              <p className="text-gray-600">No reports found. Create your first report!</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <h4 className="text-lg font-medium">{report.title}</h4>
                    <p className="text-gray-600 mt-2">{report.content}</p>
                    <div className="mt-2 text-sm text-gray-500">
                      Created: {new Date(report.created_at).toLocaleString()}
                      {session.user.role === 'admin' && (
                        <span className="ml-4">By: {report.user_email}</span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <button
                        onClick={() => setEditingReport(report)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && reports.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {editingReport && (
        <EditReportModal
          report={editingReport}
          onClose={() => setEditingReport(null)}
          onSave={() => {
            setEditingReport(null);
            fetchReports();
          }}
        />
      )}
    </div>
  );
}
