"use client";

import React, { useState, useEffect } from 'react';
import { useOverlay } from '@/context/OverlayContext';
import { createClient } from '@/utils/supabase/client';
import { X, ChevronDown, FileText, Minus } from 'lucide-react';
import NoteEditor from './NoteEditor';

export default function OverlayWindow() {
  const supabase = createClient();
  const {
    isOpen,
    isMinimized,
    activeNoteId,
    dockingEnabled,
    closeNote,
    setMinimized,
    setActiveNoteId
  } = useOverlay();

  // Dropdown list
  const [notesList, setNotesList] = useState<{ id: string; title: string }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user notes to populate the dropdown selection
  useEffect(() => {
    async function fetchNotes() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from('notes')
        .select('id, title')
        .order('updated_at', { ascending: false });
      if (data) {
        setNotesList(data);
      }
    }
    if (isOpen) {
      fetchNotes();
    }
  }, [isOpen, activeNoteId]);

  const handleDropdownChange = async (val: string) => {
    if (val === 'create_new') {
      if (!userId) return;
      const newNote = {
        user_id: userId,
        title: '',
        content: '',
        color: 'grey'
      };
      const { data, error } = await supabase
        .from('notes')
        .insert(newNote)
        .select('id, title')
        .single();
      if (error) {
        console.error(error);
        return;
      }
      if (data) {
        setNotesList(prev => [data, ...prev]);
        setActiveNoteId(data.id);
        
        try {
          const channel = new BroadcastChannel('notes-sync-channel');
          channel.postMessage({
            type: 'NOTE_CREATED',
            note: {
              ...data,
              content: '',
              color: 'grey',
              updated_at: new Date().toISOString()
            }
          });
          channel.close();
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      setActiveNoteId(val || null);
    }
  };

  const handleNoteDeleted = () => {
    if (!activeNoteId) return;
    const deletedIndex = notesList.findIndex(n => n.id === activeNoteId);
    const remaining = notesList.filter(n => n.id !== activeNoteId);
    setNotesList(remaining);
    
    if (remaining.length > 0) {
      const nextIndex = Math.min(deletedIndex, remaining.length - 1);
      setActiveNoteId(remaining[nextIndex].id);
    } else {
      setActiveNoteId(null);
    }

    try {
      const channel = new BroadcastChannel('notes-sync-channel');
      channel.postMessage({
        type: 'NOTE_DELETED',
        noteId: activeNoteId
      });
      channel.close();
    } catch (e) {
      console.error(e);
    }
  };

  // Sync with BroadcastChannel to update notes list in real time
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('notes-sync-channel');
    
    channel.onmessage = (event) => {
      if (!event.data) return;
      const { type, noteId, title, note } = event.data;
      
      if (type === 'NOTE_UPDATED') {
        setNotesList(prev =>
          prev.map(n => n.id === noteId ? { ...n, title } : n)
        );
      } else if (type === 'NOTE_CREATED' && note) {
        setNotesList(prev => [note, ...prev]);
      } else if (type === 'NOTE_DELETED') {
        setNotesList(prev => {
          const deletedIndex = prev.findIndex(n => n.id === noteId);
          const remaining = prev.filter(n => n.id !== noteId);
          
          if (activeNoteId === noteId) {
            if (remaining.length > 0) {
              const nextIndex = Math.min(deletedIndex, remaining.length - 1);
              setActiveNoteId(remaining[nextIndex].id);
            } else {
              setActiveNoteId(null);
            }
          }
          return remaining;
        });
      }
    };
    
    return () => channel.close();
  }, [activeNoteId]);

  if (!isOpen || !dockingEnabled || isMinimized) return null;

  // Expanded state
  return (
    <div className="fixed bottom-6 right-6 z-[90] w-full max-w-[90vw] sm:max-w-md md:max-w-[480px] h-[550px] md:h-[600px] max-h-[calc(100vh-100px)] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-in-out animate-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="h-12 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
          <FileText size={16} className="text-zinc-500 shrink-0" />
          <div className="relative flex-1 min-w-0 max-w-[240px]">
            <select
              value={activeNoteId || ''}
              onChange={(e) => handleDropdownChange(e.target.value)}
              className="w-full pl-2 pr-6 py-1 border border-zinc-200/50 dark:border-zinc-800 rounded-lg text-xs font-bold bg-white dark:bg-zinc-900 outline-none text-zinc-700 dark:text-zinc-300 appearance-none cursor-pointer truncate"
            >
              <option value="">Select Note...</option>
              <option value="create_new" className="text-emerald-600 dark:text-emerald-455 font-bold">+ Create New Note...</option>
              {notesList.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title || 'Untitled Note'}
                </option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-2 top-2 pointer-events-none text-zinc-400" />
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setMinimized(true)}
            className="p-1.5 rounded-lg hover:bg-zinc-150 dark:hover:bg-zinc-800 transition-colors text-zinc-550 dark:text-zinc-400"
            title="Collapse Editor"
          >
            <Minus size={15} />
          </button>
          <button
            onClick={closeNote}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-955/20 transition-colors text-zinc-400 hover:text-red-500"
            title="Close Editor"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Systematic Editor */}
      <div className="flex-1 bg-white dark:bg-zinc-950 relative min-h-0">
        {activeNoteId ? (
          <NoteEditor noteId={activeNoteId} onDelete={handleNoteDeleted} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-450 p-6 text-center select-none bg-zinc-50/50 dark:bg-zinc-900/5">
            <FileText size={40} className="mb-2 opacity-30 text-zinc-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-350">No Note Selected</span>
            <p className="text-[10px] text-zinc-405 mt-1 max-w-xs leading-normal">
              Select an existing study note from the header dropdown to start drafting.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
