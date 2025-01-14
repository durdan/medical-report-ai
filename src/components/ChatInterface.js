'use client';

import { useState, useRef, useEffect } from 'react';
import { FiSend, FiCheck, FiMaximize2, FiMinimize2, FiCopy, FiSave } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { marked } from 'marked';
import { copyFormattedContent } from '@/utils/clipboardUtils';

// Configure marked for security
marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
  headerPrefix: 'user-content-',
  sanitize: true, // Enable built-in sanitizer
});

export default function ChatInterface({ onSubmit, onApprove }) {
  const [input, setInput] = useState('');
  const [hint, setHint] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input, hint]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    setCurrentStreamingMessage('');

    setMessages(prev => [...prev, {
      type: 'user',
      content: currentInput,
      timestamp: new Date().toISOString()
    }]);

    try {
      const streamCallback = (chunk) => {
        setCurrentStreamingMessage(prev => prev + chunk);
      };

      const result = await onSubmit(currentInput, streamCallback);
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: result,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'Error generating response. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
      setCurrentStreamingMessage('');
    }
  };

  const handleHintSubmit = async () => {
    if (!hint.trim() || isLoading) return;
    
    const currentHint = hint;
    setHint('');
    setIsLoading(true);
    setCurrentStreamingMessage('');

    setMessages(prev => [...prev, {
      type: 'user',
      content: `Redraft with hint: ${currentHint}`,
      timestamp: new Date().toISOString()
    }]);

    try {
      const streamCallback = (chunk) => {
        setCurrentStreamingMessage(prev => prev + chunk);
      };

      const result = await onSubmit(messages[messages.length - 2].content, currentHint, streamCallback);
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: result,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'Error generating response. Please try again.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
      setCurrentStreamingMessage('');
    }
  };

  const handleCopy = async (content) => {
    try {
      await copyFormattedContent(content);
      toast.success('Copied to clipboard with formatting!');
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleSave = async (content) => {
    if (!content || isSaving) return;
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/reports/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          findings: messages.find(m => m.type === 'user')?.content || '',
          report: content,
          specialty: 'General'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save report');
      }

      toast.success('Report saved successfully!');
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const renderMarkdown = (content) => {
    try {
      const html = marked(content);
      return { __html: html };
    } catch (error) {
      console.error('Error rendering markdown:', error);
      return { __html: content };
    }
  };

  return (
    <div className="flex h-full">
      <div className={`flex-1 flex flex-col ${showHistory ? 'mr-4' : ''}`}>
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 relative group ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.type === 'error'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {message.type === 'assistant' ? (
                  <div 
                    className="markdown-content prose prose-sm max-w-none dark:prose-invert prose-headings:mt-2 prose-headings:mb-1"
                    dangerouslySetInnerHTML={renderMarkdown(message.content)}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{message.content}</div>
                )}
                {message.type === 'assistant' && (
                  <div className="absolute top-2 right-2 flex space-x-1 bg-white rounded-lg p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopy(message.content)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Copy to clipboard"
                    >
                      <FiCopy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSave(message.content)}
                      className={`p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded ${
                        isSaving ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Save report"
                      disabled={isSaving}
                    >
                      <FiSave className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onApprove(message.content)}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      title="Approve"
                    >
                      <FiCheck className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {currentStreamingMessage && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-4 bg-gray-100 text-gray-900">
                <div 
                  className="markdown-content prose prose-sm max-w-none dark:prose-invert prose-headings:mt-2 prose-headings:mb-1"
                  dangerouslySetInnerHTML={renderMarkdown(currentStreamingMessage)}
                />
                <span className="inline-block animate-pulse">▊</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t bg-white">
          <div className="relative mb-4">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Enter your text here..."
              className="w-full p-4 pr-12 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors ${
                input.trim() && !isLoading
                  ? 'text-blue-600 hover:bg-blue-50'
                  : 'text-gray-400'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <FiSend className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="relative">
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleHintSubmit();
                }
              }}
              placeholder="Redraft with hint..."
              className="w-full p-4 pr-12 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleHintSubmit}
              disabled={!hint.trim() || isLoading}
              className={`absolute right-3 bottom-3 p-2 rounded-full transition-colors ${
                hint.trim() && !isLoading
                  ? 'text-blue-600 hover:bg-blue-50'
                  : 'text-gray-400'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-gray-400 border-t-blue-600 rounded-full animate-spin" />
              ) : (
                <FiSend className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowHistory(!showHistory)}
        className="fixed right-4 top-4 p-2 bg-white text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title={showHistory ? 'Hide History' : 'Show History'}
      >
        {showHistory ? <FiMinimize2 className="w-5 h-5" /> : <FiMaximize2 className="w-5 h-5" />}
      </button>

      {showHistory && (
        <div className="w-80 overflow-y-auto border-l bg-gray-50 p-4">
          <h3 className="text-lg font-medium mb-4">History</h3>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                <div className="text-sm text-gray-500 mb-2">
                  {new Date(message.timestamp).toLocaleString()}
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
