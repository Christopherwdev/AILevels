"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { Plus, Search, FileText, NotebookText, Settings } from 'lucide-react';
import NoteEditor from '@/components/NoteEditor';

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  updated_at: string;
}

export default function NotesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('Anonymous');
  
  // Notes states
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auth & Initial Fetch
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.username) {
        setUsername(profile.username);
      }

      // Load notes
      const { data } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (data) {
        setNotes(data);
        const params = new URLSearchParams(window.location.search);
        const noteIdFromUrl = params.get('noteId');
        const initialNoteId = noteIdFromUrl || (data.length > 0 ? data[0].id : null);
        
        if (initialNoteId) {
          setActiveNoteId(initialNoteId);
        }
      }
      setLoading(false);
    }
    init();
  }, [router, supabase]);

  // Sync sidebar notes list with broadcast updates from overlay or other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('notes-sync-channel');
    
    channel.onmessage = (event) => {
      if (!event.data) return;
      const { type, noteId, title, content, updated_at, note } = event.data;
      
      if (type === 'NOTE_UPDATED') {
        setNotes(prev =>
          prev.map(n =>
            n.id === noteId
              ? { ...n, title, content, updated_at: updated_at || n.updated_at }
              : n
          )
        );
      } else if (type === 'NOTE_CREATED' && note) {
        setNotes(prev => [note, ...prev]);
      } else if (type === 'NOTE_DELETED') {
        setNotes(prev => {
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

  // Create new note
  const handleCreateNote = async () => {
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
      .select()
      .single();

    if (error) {
      console.error('Failed to create note:', error);
      return;
    }

    if (data) {
      setNotes(prev => [data, ...prev]);
      setActiveNoteId(data.id);
      setIsSidebarOpen(false); // close sidebar after creating on mobile
    }
  };

  // Callback when a note is deleted in the editor
  const handleNoteDeleted = () => {
    if (!activeNoteId) return;
    const deletedIndex = notes.findIndex(n => n.id === activeNoteId);
    const remaining = notes.filter(n => n.id !== activeNoteId);
    setNotes(remaining);
    
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

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => {
    const titleMatch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const contentMatch = note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || contentMatch;
  });

  return (
    <div className="h-[calc(100vh-4rem)] mobile-h-dvh flex bg-white dark:bg-black overflow-hidden font-sans relative">

      {/* ── MOBILE: Backdrop ── */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── MOBILE: Slide-in Sidebar ── */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 z-40 w-72 flex flex-col
          bg-white dark:bg-black border-r border-zinc-100 dark:border-zinc-900
          shadow-2xl transition-transform duration-300 ease-in-out
          md:hidden
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header */}
        <div className="p-5 border-b border-zinc-50 dark:border-zinc-950 flex flex-col gap-4 select-none">
          <div className="flex justify-between items-center w-full">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Study Notes</h2>
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[10px] font-black rounded hover:opacity-90 transition cursor-pointer uppercase tracking-wider"
            >
              <Plus size={12} />
              <span>New</span>
            </button>
          </div>
          {/* Search Notes */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-grey-bg dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs w-full select-none">No notes found.</div>
          ) : (
            filteredNotes.map(n => (
              <button
                key={n.id}
                onClick={() => {
                  setActiveNoteId(n.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex flex-col px-5 py-3 text-left transition-all border-b border-zinc-50 dark:border-zinc-950/65 cursor-pointer ${
                  activeNoteId === n.id
                    ? 'bg-grey-bg dark:bg-zinc-900/60 font-extrabold'
                    : 'hover:bg-grey-hover dark:hover:bg-zinc-900/20 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate w-full">
                  {n.title || 'Untitled Note'}
                </span>
                <p className="text-[10px] text-zinc-405 dark:text-zinc-500 truncate w-full mt-0.5">
                  {n.content ? n.content.replace(/<[^>]*>/g, '').substring(0, 50) : 'No content'}
                </p>
                <span className="text-[9px] text-zinc-400 font-semibold mt-1.5 uppercase tracking-wide select-none">
                  {new Date(n.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Mobile footer user profile */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between gap-3 bg-white dark:bg-black select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full border-2 border-rose-500 bg-white flex items-center justify-center shrink-0">
              <span className="text-rose-500 font-bold text-sm uppercase">
                {username.charAt(0)}
              </span>
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <p className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                {username}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-550 font-medium mt-0.5">
                Logged in
              </p>
            </div>
          </div>
          <Link
            href="/account"
            className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors"
            title="User Settings"
          >
            <Settings size={14} />
          </Link>
        </div>
      </aside>

      {/* ── MOBILE: Toggle Button (hidden when sidebar is open) ── */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="md:hidden fixed bottom-6 left-6 z-50 w-10 h-10 flex items-center justify-center bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-2xl hover:scale-105 hover:-translate-y-0.5 transition-all cursor-pointer hover:opacity-90 active:scale-95"
          title="Open notes list"
        >
          <NotebookText size={20} />
        </button>
      )}

      {/* ── DESKTOP: Left Panel (Styled exactly like Chat page sidebar) ── */}
      <aside className="hidden md:flex w-80 shrink-0 flex-col border-r border-zinc-100 dark:border-zinc-900 bg-white dark:bg-black">
        {/* Header with "+ New Note" */}
        <div className="p-5 border-b border-zinc-50 dark:border-zinc-950 flex flex-col gap-4 select-none">
          <div className="flex justify-between items-center w-full">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Study Notes</h2>
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-[10px] font-black rounded hover:opacity-90 transition cursor-pointer uppercase tracking-wider"
            >
              <Plus size={12} />
              <span>New</span>
            </button>
          </div>
          {/* Search Notes */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-grey-bg dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 text-zinc-900 dark:text-zinc-100"
            />
          </div>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs w-full select-none">No notes found.</div>
          ) : (
            filteredNotes.map(n => (
              <div key={n.id} className="relative group/card">
                <button
                  onClick={() => setActiveNoteId(n.id)}
                  className={`w-full flex flex-col px-5 py-3 text-left transition-all border-b border-zinc-50 dark:border-zinc-950/65 cursor-pointer ${
                    activeNoteId === n.id
                      ? 'bg-grey-bg dark:bg-zinc-900/60 font-extrabold'
                      : 'hover:bg-grey-hover dark:hover:bg-zinc-900/20 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 w-full">
                    <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate flex-1">
                      {n.title || 'Untitled Note'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mb-1 truncate w-full">
                    {n.content ? n.content.replace(/<[^>]*>/g, '').substring(0, 60) : 'No content'}
                  </p>
                  <span className="text-[9px] text-zinc-400 font-semibold mt-0.5 uppercase tracking-wide select-none">
                    {new Date(n.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Desktop footer user profile */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between gap-3 bg-white dark:bg-black select-none">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full border-2 border-rose-500 bg-white flex items-center justify-center shrink-0">
              <span className="text-rose-500 font-bold text-sm uppercase">
                {username.charAt(0)}
              </span>
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <p className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                {username}
              </p>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-550 font-medium mt-0.5">
                Logged in
              </p>
            </div>
          </div>
          <Link
            href="/account"
            className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors"
            title="User Settings"
          >
            <Settings size={14} />
          </Link>
        </div>
      </aside>

      {/* RIGHT PANEL: FLAT EDITOR (Styled exactly like Chat main view) */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black overflow-hidden">
        {activeNoteId ? (
          <NoteEditor noteId={activeNoteId} onDelete={handleNoteDeleted} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-400 select-none bg-zinc-50/10 dark:bg-zinc-900/5">
            <FileText size={48} className="mb-3 opacity-30 text-zinc-500" />
            <h3 className="font-extrabold text-sm uppercase tracking-wide mb-1 text-zinc-800 dark:text-zinc-200">Notes Workspace</h3>
            <p className="text-xs text-center max-w-sm text-zinc-400 dark:text-zinc-550 leading-relaxed">
              Select a study note from the left sidebar to begin editing here.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
