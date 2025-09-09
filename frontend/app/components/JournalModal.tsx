"use client";
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { disableBodyScroll, enableBodyScroll } from '../utils/scrollLock';

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  tags?: string;
  created_at: string;
}

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; content: string; tags?: string }) => void;
  editingEntry: JournalEntry | null;
  isLoading?: boolean;
}

export default function JournalModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingEntry, 
  isLoading = false 
}: JournalModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: ''
  });

  // Reset form when editing entry changes
  useEffect(() => {
    if (editingEntry) {
      setFormData({
        title: editingEntry.title,
        content: editingEntry.content,
        tags: editingEntry.tags || ''
      });
    } else {
      setFormData({
        title: '',
        content: '',
        tags: ''
      });
    }
  }, [editingEntry]);

  // Clear form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        title: '',
        content: '',
        tags: ''
      });
    }
  }, [isOpen]);

  // Handle body scroll locking
  useEffect(() => {
    if (isOpen) {
      disableBodyScroll();
    } else {
      enableBodyScroll();
    }

    // Cleanup on unmount
    return () => {
      enableBodyScroll();
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    if (!formData.content.trim()) {
      alert('Please enter content');
      return;
    }

    onSave({
      title: formData.title.trim(),
      content: formData.content.trim(),
      tags: formData.tags.trim() || undefined
    });
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-3 sm:p-4">
      <div className="bg-white dark:bg-black backdrop-blur-sm rounded-lg shadow-2xl p-3 sm:p-6 w-full max-w-sm mx-auto border border-gray-200 dark:border-gray-600 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-lg 2xl:text-lg font-semibold text-black dark:text-white">
            {editingEntry ? 'Edit Journal Entry' : 'Add Journal Entry'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white mb-1">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-sm bg-white dark:bg-black text-black dark:text-white"
              placeholder="e.g., Market Analysis - AAPL"
              maxLength={100}
            />
            <p className="text-[10px] sm:text-[11px] 2xl:text-sm text-gray-900 dark:text-gray-400 mt-1">
              {formData.title.length}/100 characters
            </p>
          </div>

          {/* Content */}
          <div>
            <label htmlFor="content" className="block text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white mb-1">
              Content *
            </label>
            <textarea
              id="content"
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              disabled={isLoading}
              rows={6}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-xs resize-none bg-white dark:bg-black text-black dark:text-white"
              placeholder="Write your thoughts, analysis, or notes here..."
              maxLength={2000}
            />
            <p className="text-[10px] sm:text-[11px] 2xl:text-sm text-gray-900 dark:text-gray-400">
              {formData.content.length}/2000 characters
            </p>
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white mb-1">
              Tags (Optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white hover:border-black dark:hover:border-white transition-all text-xs bg-white dark:bg-black text-black dark:text-white"
              placeholder="e.g., technical-analysis, aapl, support-resistance"
            />
            <p className="text-[10px] sm:text-[11px] 2xl:text-sm text-gray-900 dark:text-gray-400 mt-1">
              Separate multiple tags with commas
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex flex-row gap-2 sm:gap-3 pt-2 sm:pt-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-2 sm:px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-black dark:text-white rounded-lg hover:bg-gray-100 dark:bg-black dark:hover:bg-gray-900 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.title.trim() || !formData.content.trim()}
              className="flex-1 px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors cursor-pointer text-[10px] sm:text-[12px] 2xl:text-sm"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span className="text-[10px] sm:text-xs 2xl:text-sm">{editingEntry ? 'Updating...' : 'Adding...'}</span>
                </div>
              ) : (
                editingEntry ? 'Update Entry' : 'Add Entry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
