'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { MEDICAL_SPECIALTIES } from '@/lib/constants';

export default function MedicalReportGenerator() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id');
  
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState({ id: 'default', name: 'Default Prompt' });
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
  const [successMessage, setSuccessMessage] = useState('');
  const [isManualPromptSelection, setIsManualPromptSelection] = useState(false);

  // Load existing report if editing
  useEffect(() => {
    if (reportId) {
      fetchReport();
    }
  }, [reportId]);

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (prompts.length > 0 && !isManualPromptSelection) {
      // Only auto-select default prompt if user hasn't manually chosen one
      const defaultPrompt = prompts.find(p => p.isDefault && p.specialty === specialty);
      if (defaultPrompt) {
        setSelectedPrompt(defaultPrompt);
      } else {
        setSelectedPrompt({ id: 'default', name: 'Default Prompt' });
      }
    }
  }, [specialty, prompts, isManualPromptSelection]);

  useEffect(() => {
    if (prompts.length > 0 && selectedPrompt.id && selectedPrompt.id !== 'default') {
      const promptData = prompts.find(p => p.id === selectedPrompt.id);
      console.log('Selected prompt data:', promptData);
      setSelectedPromptData(promptData);
    } else {
      setSelectedPromptData(null);
    }
  }, [selectedPrompt, prompts]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/${reportId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report');
      }

      // Set report data
      setFindings(data.findings);
      setReport(data.report);
      setSpecialty(data.specialty);
      setOriginalFindings(data.findings);
      
      // Set prompt if it exists
      if (data.prompt_id) {
        setSelectedPrompt({ id: data.prompt_id });
      }
    } catch (error) {
      console.error('Error fetching report:', error);
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrompts = async () => {
    setError('');
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch prompts');
      }
      
      console.log('Fetched prompts:', data.prompts);
      // Map the fields to ensure consistent casing
      const mappedPrompts = data.prompts.map(prompt => ({
        ...prompt,
        promptText: prompt.prompttext || prompt.promptText, // handle both cases
        isDefault: prompt.isdefault || prompt.isDefault,
        createdAt: prompt.createdat || prompt.createdAt
      }));
      console.log('Mapped prompts:', mappedPrompts);
      setPrompts(mappedPrompts);
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

  const handleGenerateReport = async () => {
    if (!findings) {
      setError('Please enter medical findings');
      return;
    }

    setLoading(true);
    setError('');
    setSaveSuccess(false);
    setReport(''); // Clear existing report

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findings: findings,
          promptId: selectedPrompt?.id === 'default' ? null : selectedPrompt?.id,
          specialty: specialty || 'General'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate report');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullReport = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        fullReport += text;
        setReport(fullReport); // Update UI incrementally
      }

    } catch (error) {
      console.error('Error generating report:', error);
      setError(error.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (!report) {
      setError('Please generate a report first');
      return;
    }

    setIsSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const url = reportId ? `/api/reports/${reportId}` : '/api/reports/save';
      const response = await fetch(url, {
        method: reportId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findings: findings,
          report: report, // Changed from content to report to match the API expectation
          specialty: specialty || 'General',
          promptId: selectedPrompt?.id === 'default' ? null : selectedPrompt?.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save report');
      }

      // Update report ID if this is a new report
      if (!reportId && data.report?.id) {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('id', data.report.id);
        window.history.pushState({}, '', newUrl);
      }

      setSuccessMessage('Report saved successfully!');
      setSaveSuccess(true);
      setTimeout(() => {
        setSuccessMessage('');
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefine = async () => {
    setIsRefining(true);
    setError('');

    try {
      const selectedPromptData = prompts.find(p => p.id === selectedPrompt.id);
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

  const handleSpecialtyChange = (e) => {
    const newSpecialty = e.target.value;
    setSpecialty(newSpecialty);
    
    // Find default prompt for new specialty
    const defaultPrompt = prompts.find(p => p.isDefault && p.specialty === newSpecialty);
    if (defaultPrompt) {
      setSelectedPrompt(defaultPrompt);
    }
  };

  const handlePromptChange = (prompt) => {
    setSelectedPrompt(prompt);
    setIsManualPromptSelection(true); // Mark that user has manually selected a prompt
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
            {successMessage && (
              <div className="px-4 py-3 rounded-md bg-green-50 text-green-600 border border-green-200">
                {successMessage}
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
                      value={selectedPrompt?.id || 'default'}
                      onChange={(e) => {
                        const selected = prompts.find(p => p.id === e.target.value) || { id: 'default', name: 'Default Prompt' };
                        handlePromptChange(selected);
                      }}
                      className="w-full p-2 border rounded"
                    >
                      <option value="default">Default Prompt</option>
                      {prompts && prompts.length > 0 ? (
                        prompts.map(prompt => (
                          <option key={prompt.id} value={prompt.id}>
                            {prompt.name} ({prompt.specialty})
                          </option>
                        ))
                      ) : null}
                    </select>
                  </div>
                </div>

                {selectedPromptData && (
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedPromptData.name}
                      </h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {selectedPromptData.specialty}
                      </span>
                    </div>
                    <div className="prose prose-blue max-w-none">
                      <pre className="text-base text-gray-700 whitespace-pre-wrap leading-relaxed bg-transparent border-none p-0">
                        {selectedPromptData.promptText}
                      </pre>
                      {!selectedPromptData.promptText && (
                        <p className="text-red-600">No prompt content available</p>
                      )}
                    </div>
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
                      onChange={handleSpecialtyChange}
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
                      onClick={handleGenerateReport}
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
                      onClick={handleSaveReport}
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
