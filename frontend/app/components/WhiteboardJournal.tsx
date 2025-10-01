"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Trash2, GripVertical, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '../contexts/AuthModalContext';
import { getApiUrl } from '../config/api';

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  tags?: string;
  created_at: string;
  updated_at?: string;
  position_x?: number;
  position_y?: number;
  width?: number;
  height?: number;
}

interface NoteProps {
  entry: JournalEntry;
  onEdit: (entry: JournalEntry) => void;
  onDelete: (entryId: number) => void;
  onPositionChange: (entryId: number, x: number, y: number) => void;
  onSizeChange: (entryId: number, width: number, height: number) => void;
}

const Note: React.FC<NoteProps> = ({ entry, onEdit, onDelete, onPositionChange, onSizeChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const noteRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't start dragging if clicking on buttons or resize handle
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.resize-handle')) {
      return;
    }
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - (entry.position_x || 0),
      y: e.clientY - (entry.position_y || 0)
    });
  };

  const handleNoteClick = (e: React.MouseEvent) => {
    // Don't trigger edit if we just finished dragging or clicking on buttons
    if (isDragging || (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Small delay to distinguish between click and drag
    setTimeout(() => {
      if (!isDragging) {
        onEdit(entry);
      }
    }, 100);
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: entry.width || 200,
      height: entry.height || 150
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      onPositionChange(entry.id, Math.max(0, newX), Math.max(0, newY));
    } else if (isResizing) {
      const newWidth = Math.max(150, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(100, resizeStart.height + (e.clientY - resizeStart.y));
      onSizeChange(entry.id, newWidth, newHeight);
    }
  }, [isDragging, isResizing, dragStart, resizeStart, entry.id, onPositionChange, onSizeChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      ref={noteRef}
      className={`absolute bg-white dark:bg-gray-100 border-2 border-gray-300 dark:border-gray-400 rounded-lg shadow-lg cursor-move select-none ${
        isDragging ? 'z-50 shadow-2xl' : 'z-10 hover:shadow-xl'
      } transition-shadow duration-200`}
      style={{
        left: entry.position_x || 0,
        top: entry.position_y || 0,
        width: entry.width || 200,
        height: entry.height || 150,
      }}
      onMouseDown={handleMouseDown}
      onClick={handleNoteClick}
    >
      {/* Note Header */}
      <div className="flex items-center justify-between p-2 border-b border-gray-300 dark:border-gray-400 bg-gray-50 dark:bg-gray-200 rounded-t-lg">
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <GripVertical className="h-3 w-3 text-gray-600 dark:text-gray-700 flex-shrink-0" />
          <span className="text-xs font-medium text-gray-800 dark:text-gray-800 truncate">
            {entry.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-600 dark:text-gray-600">
            {formatDate(entry.updated_at || entry.created_at)}
          </span>
          <button
            onClick={() => onEdit(entry)}
            className="p-0.5 text-gray-600 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-600 transition-colors"
            title="Edit note"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="p-0.5 text-gray-600 dark:text-gray-600 hover:text-red-600 dark:hover:text-red-600 transition-colors"
            title="Delete note"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Note Content */}
      <div className="note-content p-2 h-full overflow-hidden">
        <div className="text-xs text-gray-800 dark:text-gray-800 leading-relaxed overflow-y-auto h-full">
          {entry.content}
        </div>
        {entry.tags && (
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.tags.split(',').map((tag, index) => (
              <span
                key={index}
                className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-300 text-gray-700 dark:text-gray-700 text-[10px] rounded-full"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        className="resize-handle absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-gray-400 dark:bg-gray-500 rounded-tl-lg"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
};

export default function WhiteboardJournal() {
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { showAuthModal } = useAuthModal();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const whiteboardRef = useRef<HTMLDivElement>(null);

  // Load journal entries when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadEntries();
    } else {
      setEntries([]);
      setIsLoadingEntries(false);
    }
  }, [isAuthenticated, token]);

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
        console.log('Failed to load journal entries');
      }
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setIsLoadingEntries(false);
    }
  };

  const handleAddNote = async () => {
    if (!isAuthenticated) {
      showAuthModal();
      return;
    }
    
    if (!token) return;
    
    // Calculate position for new note (avoid overlapping)
    const existingPositions = entries.map(e => ({ x: e.position_x || 0, y: e.position_y || 0 }));
    let newX = 50;
    let newY = 50;
    
    // Find a non-overlapping position
    while (existingPositions.some(pos => 
      Math.abs(pos.x - newX) < 220 && Math.abs(pos.y - newY) < 170
    )) {
      newX += 30;
      newY += 30;
      if (newX > 800) {
        newX = 50;
        newY += 200;
      }
    }
    
    setIsLoading(true);
    try {
      // Create new entry with default content
      const response = await fetch(getApiUrl('/api/journal'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: 'New Note',
          content: 'Click to edit...',
          tags: '',
          position_x: newX,
          position_y: newY,
          width: 200,
          height: 150
        })
      });
      
      if (response.ok) {
        await loadEntries();
      } else {
        alert('Failed to add journal entry. Please try again.');
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
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
    setShowAddModal(true);
  };

  const handleDelete = async (entryId: number) => {
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

  const handlePositionChange = async (entryId: number, x: number, y: number) => {
    // Update local state immediately for smooth dragging
    setEntries(prev => prev.map(entry => 
      entry.id === entryId ? { ...entry, position_x: x, position_y: y } : entry
    ));

    // Save to backend
    if (token) {
      try {
        await fetch(getApiUrl(`/api/journal/${entryId}/position`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ position_x: x, position_y: y })
        });
      } catch (error) {
        console.error('Error updating note position:', error);
      }
    }
  };

  const handleSizeChange = async (entryId: number, width: number, height: number) => {
    // Update local state immediately for smooth resizing
    setEntries(prev => prev.map(entry => 
      entry.id === entryId ? { ...entry, width, height } : entry
    ));

    // Save to backend
    if (token) {
      try {
        await fetch(getApiUrl(`/api/journal/${entryId}/size`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ width, height })
        });
      } catch (error) {
        console.error('Error updating note size:', error);
      }
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
        // Create new entry with position
        // Compute a non-overlapping default position for the new note
        const existingPositions = entries.map(e => ({ x: e.position_x || 0, y: e.position_y || 0 }));
        let newX = 50;
        let newY = 50;
        while (existingPositions.some(pos =>
          Math.abs(pos.x - newX) < 220 && Math.abs(pos.y - newY) < 170
        )) {
          newX += 30;
          newY += 30;
          if (newX > 800) {
            newX = 50;
            newY += 200;
          }
        }
        const response = await fetch(getApiUrl('/api/journal'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...entryData,
            position_x: newX,
            position_y: newY,
            width: 200,
            height: 150
          })
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
      setShowAddModal(false);
      setEditingEntry(null);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingEntry(null);
  };

  if (isAuthLoading || isLoadingEntries) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xs sm:text-sm 2xl:text-base text-black dark:text-white font-medium">
            {isAuthLoading ? 'Checking authentication...' : 'Loading whiteboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">

      {/* Whiteboard Canvas */}
      <div
        ref={whiteboardRef}
        className="relative w-full h-screen bg-white dark:bg-black overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle, #b7b7bcff 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px'
        }}
      >
        {/* Dark mode grid overlay */}
        <div 
          className="absolute inset-0 pointer-events-none dark:block hidden"
          style={{
            backgroundImage: `
              radial-gradient(circle, #282b2fff 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 10px 10px'
          }}
        />
        {entries.map((entry) => (
          <Note
            key={entry.id}
            entry={entry}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPositionChange={handlePositionChange}
            onSizeChange={handleSizeChange}
          />
        ))}
        
        {/* Floating Add Button */}
        <button
          onClick={handleAddNote}
          className="fixed bottom-6 right-6 z-30 w-8 h-8 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center group"
        >
          <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-black rounded-lg shadow-2xl p-6 w-full max-w-md border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-black dark:text-white">
                Edit Note
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleSaveEntry({
                title: formData.get('title') as string,
                content: formData.get('content') as string,
                tags: formData.get('tags') as string || undefined
              });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">
                  Title *
                </label>
                <input
                  name="title"
                  defaultValue={editingEntry?.title || ''}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-black dark:text-white"
                  placeholder="Note title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">
                  Content *
                </label>
                <textarea
                  name="content"
                  defaultValue={editingEntry?.content || ''}
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-black dark:text-white resize-none"
                  placeholder="Write your thoughts..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-1">
                  Tags (Optional)
                </label>
                <input
                  name="tags"
                  defaultValue={editingEntry?.tags || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-black dark:text-white"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 text-black dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
