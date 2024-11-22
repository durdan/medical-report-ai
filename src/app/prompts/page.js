'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { MEDICAL_SPECIALTIES } from '@/lib/constants';

export default function PromptsPage() {
  const { data: session } = useSession();
  const [prompts, setPrompts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // New prompt form state
  const [newPrompt, setNewPrompt] = useState({
    name: '',
    specialty: 'General',
    promptText: '',
    isSystem: false,
  });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/prompts');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch prompts');
      }
      
      setPrompts(data.prompts);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load prompts');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPrompt),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create prompt');
      }

      setSuccess('Prompt created successfully!');
      setNewPrompt({
        name: '',
        specialty: 'General',
        promptText: '',
        isSystem: false,
      });
      fetchPrompts();
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (promptId) => {
    if (!confirm('Are you sure you want to delete this prompt?')) {
      return;
    }

    try {
      const response = await fetch(`/api/prompts/${promptId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete prompt');
      }

      setSuccess('Prompt deleted successfully!');
      fetchPrompts();
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    }
  };

  if (!session) {
    return <div className="p-4">Please sign in to manage prompts.</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Prompt Management</h1>

      {/* Error and Success Messages */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-md mb-4">
          {success}
        </div>
      )}

      {/* Create New Prompt Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Prompt</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              value={newPrompt.name}
              onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialty
            </label>
            <select
              value={newPrompt.specialty}
              onChange={(e) => setNewPrompt({ ...newPrompt, specialty: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {MEDICAL_SPECIALTIES.map(specialty => (
                <option key={specialty} value={specialty}>{specialty}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prompt Text
            </label>
            <textarea
              value={newPrompt.promptText}
              onChange={(e) => setNewPrompt({ ...newPrompt, promptText: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows="4"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isSystem"
              checked={newPrompt.isSystem}
              onChange={(e) => setNewPrompt({ ...newPrompt, isSystem: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isSystem" className="ml-2 block text-sm text-gray-900">
              System Prompt
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Creating...' : 'Create Prompt'}
          </button>
        </form>
      </div>

      {/* Existing Prompts List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Existing Prompts</h2>
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{prompt.name}</h3>
                  <p className="text-sm text-gray-500">
                    Specialty: {prompt.specialty}
                    {prompt.isSystem && ' • System Prompt'}
                    {prompt.isDefault && ' • Default'}
                  </p>
                  <p className="mt-2 text-sm text-gray-700">{prompt.promptText}</p>
                </div>
                {session?.user?.role === 'ADMIN' && !prompt.isDefault && (
                  <button
                    onClick={() => handleDelete(prompt.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
