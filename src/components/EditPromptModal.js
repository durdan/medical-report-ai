import { useState } from 'react';
import { MEDICAL_SPECIALTIES } from '@/lib/constants';

export default function EditPromptModal({ prompt, onClose, onSave, isNew = false }) {
  const [promptText, setPromptText] = useState(prompt?.promptText || '');
  const [name, setName] = useState(prompt?.name || '');
  const [specialty, setSpecialty] = useState(prompt?.specialty || 'General');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!promptText.trim() || !name.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    setError('');
    
    try {
      const url = isNew ? '/api/prompts' : `/api/prompts/${prompt.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptText,
          name,
          specialty,
          isDefault: false
        })
      });

      const data = await response.json();
      if (response.ok) {
        await onSave(data.prompt);
        onClose();
      } else {
        throw new Error(data.error || 'Failed to save prompt');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      setError(error.message || 'Failed to save prompt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600">
          <h2 className="text-xl font-bold text-white">
            {isNew ? 'Create New Prompt' : 'Edit Prompt'}
          </h2>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter prompt name"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialty <span className="text-red-500">*</span>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt Text <span className="text-red-500">*</span>
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Enter the system prompt..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
              rows={10}
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              isNew ? 'Create Prompt' : 'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
