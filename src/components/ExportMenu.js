import { useState, useRef, useEffect } from 'react';
import { exportToPDF, exportToJSON } from '@/lib/exportReport';

export default function ExportMenu({ report }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format) => {
    switch (format) {
      case 'pdf':
        exportToPDF(report);
        break;
      case 'json':
        exportToJSON(report);
        break;
    }
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors duration-200"
      >
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu">
            <button
              onClick={() => handleExport('pdf')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              Export as Text
            </button>
            <button
              onClick={() => handleExport('json')}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              Export as JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
