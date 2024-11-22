'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MEDICAL_SPECIALTIES } from '@/lib/constants';

export default function MedicalReportGenerator() {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState('default');
  const [selectedPromptData, setSelectedPromptData] = useState(null);
  const [findings, setFindings] = useState('');
  const [report, setReport] = useState('');
  const [specialty, setSpecialty] = useState('General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [originalFindings, setOriginalFindings] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (prompts.length > 0 && selectedPrompt) {
      const promptData = prompts.find(p => p.id === selectedPrompt);
      setSelectedPromptData(promptData);
    }
  }, [selectedPrompt, prompts]);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      setPrompts(data.prompts);
      if (data.prompts.length > 0) {
        setSelectedPrompt(data.prompts[0].id);
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
      setError('Failed to load prompts');
    }
  };

  const safeSetReport = (reportData) => {
    try {
      if (typeof reportData === 'string') {
        setReport(reportData);
      } else if (reportData && typeof reportData === 'object') {
        // If it's an object with originalFindings and generatedReport
        if (reportData.generatedReport) {
          setReport(reportData.generatedReport);
        } else if (reportData.report && typeof reportData.report === 'string') {
          setReport(reportData.report);
        } else {
          // Last resort: try to stringify the object
          setReport(JSON.stringify(reportData));
        }
      } else {
        setReport('');
      }
    } catch (error) {
      console.error('Error setting report:', error);
      setReport('Error: Could not process report data');
    }
  };

  const handleGenerate = async () => {
    if (!findings.trim()) {
      setError('Please enter medical findings');
      return;
    }

    setLoading(true);
    setError('');
    setReport('');

    try {
      const selectedPromptData = prompts.find(p => p.id === selectedPrompt);
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findings,
          specialty,
          promptText: selectedPromptData?.promptText,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      safeSetReport(data.report);
      setOriginalFindings(findings);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    setIsRefining(true);
    setError('');

    try {
      const selectedPromptData = prompts.find(p => p.id === selectedPrompt);
      const response = await fetch('/api/reports/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findings: originalFindings,
          originalReport: report,
          userEdits: report,
          promptText: selectedPromptData?.promptText,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refine report');
      }

      safeSetReport(data.report);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to refine report');
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/reports/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findings,
          report,
          specialty,
          promptId: selectedPrompt,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save report');
      }

      setSaveSuccess(true);
      setError('Report saved successfully! Redirecting to dashboard...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFindings('');
    setReport('');
    setError('');
    setSaveSuccess(false);
    setOriginalFindings('');
    setIsRefining(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report);
    setError('Report copied to clipboard!');
    setTimeout(() => setError(''), 3000);
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">Medical Report Generator</h1>
              <div className="flex space-x-4">
                {saveSuccess && (
                  <button
                    onClick={resetForm}
                    className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors duration-200 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    New Report
                  </button>
                )}
                <Link
                  href="/dashboard"
                  className="bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors duration-200 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Dashboard
                </Link>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className={`px-4 py-3 rounded-md ${
                error.includes('success') ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
              }`}>
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
                <div>
                  <label className="block text-lg font-medium text-gray-900 mb-2">
                    System Prompt
                  </label>
                  <div className="flex items-center space-x-4">
                    <select
                      value={selectedPrompt}
                      onChange={(e) => setSelectedPrompt(e.target.value)}
                      className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {prompts.map(prompt => (
                        <option key={prompt.id} value={prompt.id}>
                          {prompt.name} ({prompt.specialty})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedPromptData && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-medium text-gray-900">
                        {selectedPromptData.name}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {selectedPromptData.specialty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {selectedPromptData.promptText}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialty
                    </label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {MEDICAL_SPECIALTIES.map(spec => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Findings
                  </label>
                  <textarea
                    value={findings}
                    onChange={(e) => setFindings(e.target.value)}
                    rows={12}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                    placeholder="Enter the medical findings here..."
                  />
                  <div className="mt-4">
                    <button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <span>Generate Report</span>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generated Report
                  </label>
                  <textarea
                    value={report}
                    onChange={(e) => setReport(e.target.value)}
                    rows={12}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                    placeholder="AI-generated report will appear here..."
                  />
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      onClick={handleRefine}
                      disabled={isRefining || !report}
                      className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isRefining ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        'Refine'
                      )}
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !report}
                      className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {isSaving ? (
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        'Save'
                      )}
                    </button>
                    <button
                      onClick={copyToClipboard}
                      disabled={!report}
                      className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
