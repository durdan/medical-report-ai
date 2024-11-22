import { useState } from 'react';

export default function AdvancedFilters({ onFilterChange, specialties, dateRange, setDateRange }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateRangeChange = (type, value) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value
    }));
  };

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-blue-600 hover:text-blue-800 flex items-center"
      >
        <svg
          className={`w-4 h-4 mr-2 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Advanced Filters
      </button>

      {isOpen && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">From</label>
                  <input
                    type="date"
                    value={dateRange.from}
                    onChange={(e) => handleDateRangeChange('from', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">To</label>
                  <input
                    type="date"
                    value={dateRange.to}
                    onChange={(e) => handleDateRangeChange('to', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                onChange={(e) => onFilterChange('sortBy', e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="specialty">Specialty</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {specialties.map(specialty => (
                <label key={specialty} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    onChange={(e) => onFilterChange('specialty', { specialty, checked: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{specialty}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
