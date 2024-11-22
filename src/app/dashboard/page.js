'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import AdvancedFilters from '@/components/AdvancedFilters';
import EditReportModal from '@/components/EditReportModal';
import EditPromptModal from '@/components/EditPromptModal';
import ExportMenu from '@/components/ExportMenu';

const ITEMS_PER_PAGE = 5;

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingReport, setEditingReport] = useState(null);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [sortBy, setSortBy] = useState('date-desc');

  useEffect(() => {
    fetchReports();
    fetchPrompts();

    // Handle tab from URL
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'prompts' || tabParam === 'reports') {
      setActiveTab(tabParam);
    }
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/reports/list');
      const data = await response.json();
      setReports(data.reports);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      setPrompts(data.prompts);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };

  const handleFilterChange = (type, value) => {
    switch (type) {
      case 'specialty':
        const { specialty, checked } = value;
        setSelectedSpecialties(prev => 
          checked 
            ? [...prev, specialty]
            : prev.filter(s => s !== specialty)
        );
        break;
      case 'sortBy':
        setSortBy(value);
        break;
    }
    setCurrentPage(1);
  };

  const filteredReports = reports
    .filter(report => {
      const matchesSearch = (
        report.findings?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.report?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const matchesSpecialty = selectedSpecialties.length === 0 || 
        selectedSpecialties.includes(report.specialty);
      
      const matchesDateRange = (!dateRange.from || new Date(report.timestamp) >= new Date(dateRange.from)) &&
        (!dateRange.to || new Date(report.timestamp) <= new Date(dateRange.to));
      
      return matchesSearch && matchesSpecialty && matchesDateRange;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'date-desc':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'specialty':
          return a.specialty.localeCompare(b.specialty);
        default:
          return 0;
      }
    });

  const filteredPrompts = prompts.filter(prompt =>
    prompt.promptText.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredReports.length / ITEMS_PER_PAGE);

  const handleReportSave = (updatedReport) => {
    setReports(reports.map(report => 
      report.id === updatedReport.id ? updatedReport : report
    ));
  };

  const handlePromptSave = async (updatedPrompt) => {
    // Refresh the prompts list after saving
    await fetchPrompts();
    setEditingPrompt(null);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <div className="flex space-x-4">
              {activeTab === 'reports' ? (
                <Link
                  href="/"
                  className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Report
                </Link>
              ) : (
                <button
                  onClick={() => setEditingPrompt({ isNew: true })}
                  className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  New Prompt
                </button>
              )}
              <Link 
                href={activeTab === 'reports' ? '/dashboard?tab=prompts' : '/dashboard?tab=reports'}
                className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors duration-200 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  {activeTab === 'reports' ? (
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  ) : (
                    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586L7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                  )}
                </svg>
                {activeTab === 'reports' ? 'View Prompts' : 'View Reports'}
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => handleTabChange('reports')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reports'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reports
              </button>
              <button
                onClick={() => handleTabChange('prompts')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'prompts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                System Prompts
              </button>
            </nav>
          </div>

          {/* Search and Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {activeTab === 'reports' && (
                <AdvancedFilters
                  onFilterChange={handleFilterChange}
                  specialties={Array.from(new Set(reports.map(r => r.specialty)))}
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                />
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading...</p>
              </div>
            ) : activeTab === 'reports' ? (
              <div className="space-y-6">
                {paginatedReports.length === 0 ? (
                  <p className="text-center text-gray-500 py-12">No reports found</p>
                ) : (
                  <>
                    {paginatedReports.map(report => (
                      <div key={report.id} className="bg-gray-50 rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">{report.specialty}</h3>
                            <p className="text-sm text-gray-500">{formatDate(report.timestamp)}</p>
                          </div>
                          <div className="flex space-x-2">
                            <ExportMenu report={report} />
                            <button
                              onClick={() => setEditingReport(report)}
                              className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteReport(report.id)}
                              className="text-red-600 hover:text-red-800 px-3 py-2"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="prose max-w-none">
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Findings</h4>
                            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-3 rounded">
                              {typeof report.findings === 'string' ? report.findings : JSON.stringify(report.findings, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Report</h4>
                            <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-3 rounded">
                              {typeof report.report === 'string' ? report.report : 
                               typeof report.generatedReport === 'string' ? report.generatedReport :
                               JSON.stringify(report.report || report.generatedReport, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredPrompts.length === 0 ? (
                  <p className="text-center text-gray-500 py-12">No prompts found</p>
                ) : (
                  filteredPrompts.map(prompt => (
                    <div key={prompt.id} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {prompt.name || (prompt.isDefault ? 'Default Prompt' : `Custom Prompt ${prompt.id}`)}
                          </h3>
                          {prompt.specialty && (
                            <p className="text-sm text-gray-500">Specialty: {prompt.specialty}</p>
                          )}
                        </div>
                        {!prompt.isDefault && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingPrompt(prompt)}
                              className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deletePrompt(prompt.id)}
                              className="text-red-600 hover:text-red-800 px-3 py-2"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      <pre className="whitespace-pre-wrap text-sm bg-white p-4 rounded-md border border-gray-200">
                        {prompt.promptText}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {editingReport && (
        <EditReportModal
          report={editingReport}
          onClose={() => setEditingReport(null)}
          onSave={handleReportSave}
        />
      )}
      
      {editingPrompt && (
        <EditPromptModal
          prompt={editingPrompt}
          onClose={() => setEditingPrompt(null)}
          onSave={handlePromptSave}
          isNew={editingPrompt.isNew}
        />
      )}
    </div>
  );
}
