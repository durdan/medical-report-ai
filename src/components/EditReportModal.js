import { useState } from 'react';

const MEDICAL_SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Neurology', 'Oncology', 
  'Pediatrics', 'Orthopedics', 'Radiology', 'Psychiatry',
  'Dermatology', 'Ophthalmology', 'ENT', 'Pulmonology'
];

export default function EditReportModal({ report, onClose, onSave }) {
  const [findings, setFindings] = useState(report.findings);
  const [reportText, setReportText] = useState(report.report);
  const [specialty, setSpecialty] = useState(report.specialty);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/reports/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: report.id,
          findings,
          report: reportText,
          specialty
        })
      });

      const data = await response.json();
      if (response.ok) {
        onSave(data.report);
        onClose();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Failed to save report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
          <h2 className="text-xl font-bold text-white">Edit Report</h2>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-10rem)]">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Findings</label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
              rows={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report</label>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
              rows={10}
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
