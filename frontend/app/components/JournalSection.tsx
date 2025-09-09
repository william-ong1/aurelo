"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, BookOpen, ChevronUp, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import JournalModal from './JournalModal';
import { getApiUrl } from '../config/api';

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  tags?: string;
  created_at: string;
  updated_at?: string;
}

type SortField = 'title' | 'updated_at';
type SortDirection = 'asc' | 'desc';

export default function JournalSection() {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { showAuthModal } = useAuthModal();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Load journal entries when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadEntries();
    } else {
      setEntries([]);
      setIsLoadingEntries(false);
    }
  }, [isAuthenticated, token]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'updated_at':
          // Use updated_at if available, otherwise fall back to created_at
          const aDate = a.updated_at || a.created_at;
          const bDate = b.updated_at || b.created_at;
          aValue = new Date(aDate).getTime();
          bValue = new Date(bDate).getTime();
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [entries, sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-3 w-3 opacity-30" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-3 w-3" /> : 
      <ChevronDown className="h-3 w-3" />;
  };

  const loadEntries = async () => {
    if (!token) return;
    
    setIsLoadingEntries(true);
    try {
      const response = await fetch(getApiUrl('/api/journal'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
      } else {
        console.error('Failed to load journal entries');
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  const handleSaveEntry = async (entryData: { title: string; content: string; tags?: string }) => {
    if (!token) {
      showAuthModal();
      return;
    }
    
    setIsLoading(true);
    try {
      if (editingEntry) {
        // Update existing entry
        const response = await fetch(getApiUrl(`/api/journal/${editingEntry.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(entryData)
        });
        
        if (response.ok) {
          await loadEntries();
        } else {
          alert('Failed to update journal entry. Please try again.');
        }
      } else {
        // Create new entry
        const response = await fetch(getApiUrl('/api/journal'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(entryData)
        });
        
        if (response.ok) {
          await loadEntries();
        } else {
          alert('Failed to add journal entry. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      closeModal();
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
    if (!token) return;
    
    if (!window.confirm('Confirm deletion of this journal entry?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(getApiUrl(`/api/journal/${entryId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        await loadEntries();
      } else {
        alert('Failed to delete journal entry. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (entry: JournalEntry) => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    setEditingEntry(entry);
    setShowModal(true);
  };

  const handleAdd = () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    setEditingEntry(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEntry(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };



  return (
    <div>
      {/* Loading State for Authentication or Entries - Centered without background */}
      {(isAuthLoading || isLoadingEntries) && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-xs sm:text-sm 2xl:text-base text-black dark:text-white font-medium">
              {isAuthLoading ? 'Checking authentication...' : 'Loading journal...'}
            </p>
            <p className="text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 mt-1">
              {isAuthLoading ? 'Verifying your login status' : 'Retrieving your journal entries'}
            </p>
          </div>
        </div>
      )}

      {/* Content - Only show after authentication and entries are loaded */}
      {!isAuthLoading && !isLoadingEntries && (
        <div className="py-9">
          <div className="bg-white dark:bg-black rounded-lg p-4 shadow-sm border border-slate-200 dark:border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white uppercase tracking-wide">Journal</h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleAdd}
                  className="p-0.5 pr-1.5 rounded-md transition-colors text-gray-400 hover:text-black dark:text-white dark:hover:text-white transition-all cursor-pointer"
                  title="Add Journal Entry"
                >
                  <Plus className='w-3 h-3 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5' />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="sticky top-0 bg-white dark:bg-black select-none">
                  <tr className="border-b border-slate-200 dark:border-gray-800/80">
                    <th 
                      className="text-left py-2 sm:py-2 pl-0 pr-2 sm:pr-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors select-none w-1/8"
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center gap-1">
                        Title
                        {getSortIcon('title')}
                      </div>
                    </th>
                    <th className="text-left py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white select-none w-2/5">Content</th>
                    <th className="text-left py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white select-none w-1/8">Tags</th>
                    <th 
                      className="text-left py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 transition-colors select-none w-1/6"
                      onClick={() => handleSort('updated_at')}
                    >
                      <div className="flex items-center gap-1">
                        <span className="whitespace-nowrap">Modified</span>
                        {getSortIcon('updated_at')}
                      </div>
                    </th>
                    <th className="text-center py-2 sm:py-2 px-0 text-[10px] sm:text-xs 2xl:text-sm font-medium text-black dark:text-white select-none w-1/20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.length > 0 ? (
                    sortedEntries.map((entry) => (
                      <tr key={entry.id} className="border-b border-slate-200 dark:border-gray-800/80">
                        <td className="py-2 sm:py-2 pl-0 pr-2 sm:pr-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 w-1/8">
                          <span className="font-semibold">{entry.title}</span>
                        </td>
                        <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-black dark:text-white w-3/5">
                          <div className="break-words whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                            {entry.content}
                          </div>
                        </td>
                        <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 w-1/8">
                          {entry.tags ? (
                            <div className="flex flex-wrap gap-1 max-w-full overflow-hidden max-h-20 overflow-y-auto">
                              {entry.tags.split(',').map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 text-[8px] sm:text-[10px] rounded-full whitespace-nowrap flex-shrink-0"
                                >
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 sm:py-2 px-2 sm:px-4 text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100 w-1/6">
                          {formatDate(entry.updated_at || entry.created_at)}
                        </td>
                        <td className="py-2 sm:py-2 px-2 sm:px-4 text-center w-1/20">
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <button
                              onClick={() => handleEdit(entry)}
                              className="p-0.5 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit entry"
                            >
                              <Edit2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="p-0.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete entry"
                            >
                              <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 px-3 sm:px-6 text-center text-[10px] sm:text-xs 2xl:text-sm text-gray-900 dark:text-gray-100">
                        No journal entries yet. Click the + button to add your first entry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Journal Modal */}
      <JournalModal
        isOpen={showModal}
        onClose={closeModal}
        onSave={handleSaveEntry}
        editingEntry={editingEntry}
        isLoading={isLoading}
      />
    </div>
  );
}
