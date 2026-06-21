"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { FileText, Plus, Search, Trash2, Bold, Italic, Underline, MoreVertical, Copy } from 'lucide-react';

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
  
  // Notes states
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Editor states
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Auth & Initial Fetch
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.id);
      
      // Load notes
      const { data } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (data) {
        setNotes(data);
        if (data.length > 0) {
          const firstNote = data[0];
          setActiveNoteId(firstNote.id);
          setEditorTitle(firstNote.title);
          setEditorContent(firstNote.content || '');
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.innerHTML = firstNote.content || '';
            }
          }, 100);
        }
      }
      setLoading(false);
    }
    init();
  }, [router, supabase]);

  // Sync editor when active note changes
  const handleSelectNote = (note: Note) => {
    setActiveNoteId(note.id);
    setEditorTitle(note.title);
    setEditorContent(note.content || '');
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content || '';
    }
  };

  // Create new note
  const handleCreateNote = async () => {
    if (!userId) return;
    const newNote = {
      user_id: userId,
      title: 'Untitled Note',
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
      handleSelectNote(data);
    }
  };

  // Auto-save logic
  useEffect(() => {
    if (!activeNoteId || !userId) return;

    // Find the note in our local state to see if it actually changed
    const currentNote = notes.find(n => n.id === activeNoteId);
    if (!currentNote) return;

    const hasChanged = 
      editorTitle !== currentNote.title ||
      editorContent !== (currentNote.content || '');

    if (!hasChanged) return;

    setIsSaving(true);

    const delayDebounce = setTimeout(async () => {
      const updatedFields = {
        title: editorTitle.trim() || 'Untitled Note',
        content: editorContent
      };

      const { error } = await supabase
        .from('notes')
        .update(updatedFields)
        .eq('id', activeNoteId);

      if (error) {
        console.error('Failed to auto-save note:', error);
      } else {
        // Update local state list but keep order stable while typing
        setNotes(prev =>
          prev.map(note =>
            note.id === activeNoteId
              ? { ...note, ...updatedFields, updated_at: new Date().toISOString() }
              : note
          )
        );
      }
      setIsSaving(false);
    }, 1000); // 1-second debounce

    return () => clearTimeout(delayDebounce);
  }, [editorTitle, editorContent, activeNoteId, userId, supabase, notes]);

  // Delete active note
  const handleDeleteNote = async () => {
    if (!activeNoteId) return;
    const proceed = confirm('Are you sure you want to delete this note?');
    if (!proceed) return;

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', activeNoteId);

    if (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note.');
      return;
    }

    const remaining = notes.filter(n => n.id !== activeNoteId);
    setNotes(remaining);

    if (remaining.length > 0) {
      handleSelectNote(remaining[0]);
    } else {
      setActiveNoteId(null);
      setEditorTitle('');
      setEditorContent('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  };

  // Option Menu functions
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  // Copy Note content to clipboard
  const handleCopyNoteContent = async () => {
    if (!activeNoteId) return;
    try {
      await navigator.clipboard.writeText(editorContent);
      alert('Note content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy note:', err);
    }
    setOptionsMenuOpen(false);
  };

  // Duplicate current active note
  const handleDuplicateNote = async () => {
    if (!activeNoteId || !userId) return;
    const currentNote = notes.find(n => n.id === activeNoteId);
    if (!currentNote) return;

    const duplicatedNote = {
      user_id: userId,
      title: `${currentNote.title} (Copy)`,
      content: editorContent,
      color: 'grey'
    };

    const { data, error } = await supabase
      .from('notes')
      .insert(duplicatedNote)
      .select()
      .single();

    if (error) {
      console.error('Failed to duplicate note:', error);
      alert('Failed to duplicate note.');
      return;
    }

    if (data) {
      setNotes(prev => [data, ...prev]);
      handleSelectNote(data);
    }
    setOptionsMenuOpen(false);
  };

  // Clear current active note content
  const handleClearNoteContent = () => {
    if (!activeNoteId) return;
    const proceed = confirm('Are you sure you want to clear this note\'s content?');
    if (!proceed) return;
    setEditorContent('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setOptionsMenuOpen(false);
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  };

  // Apply rich text formatting directly on contentEditable div
  const applyTextFormat = (formatType: 'bold' | 'italic' | 'underline' | 'h1' | 'h2' | 'h3' | 'normal') => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    switch (formatType) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'h1':
        document.execCommand('formatBlock', false, 'H1');
        break;
      case 'h2':
        document.execCommand('formatBlock', false, 'H2');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, 'H3');
        break;
      case 'normal':
        document.execCommand('formatBlock', false, 'P');
        break;
    }

    // Sync HTML to React state
    handleEditorInput();
  };

  // Apply rich text highlighting directly on contentEditable div using colors
  const applyTextHighlight = (color: 'grey' | 'gold' | 'green' | 'red' | 'blue') => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    let hexColor = '#e4e4e7';
    switch (color) {
      case 'grey': hexColor = '#e4e4e7'; break;
      case 'gold': hexColor = '#fef08a'; break;
      case 'green': hexColor = '#bbf7d0'; break;
      case 'red': hexColor = '#fecaca'; break;
      case 'blue': hexColor = '#bfdbfe'; break;
    }

    const currentBg = document.queryCommandValue('backColor');
    const rgbColors: Record<string, string> = {
      grey: 'rgb(228, 228, 231)',
      gold: 'rgb(254, 240, 138)',
      green: 'rgb(187, 247, 208)',
      red: 'rgb(254, 202, 202)',
      blue: 'rgb(191, 219, 254)',
    };

    if (currentBg === rgbColors[color]) {
      document.execCommand('backColor', false, 'transparent');
    } else {
      document.execCommand('backColor', false, hexColor);
    }

    handleEditorInput();
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => {
    const titleMatch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const contentMatch = note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || contentMatch;
  });



  const getNoteCircleClass = (color: string) => {
    switch (color) {
      case 'grey': return 'bg-zinc-400';
      case 'gold': return 'bg-amber-500';
      case 'green': return 'bg-emerald-500';
      case 'red': return 'bg-rose-500';
      case 'blue': return 'bg-blue-500';
      default: return 'bg-zinc-400';
    }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100 animate-spin" />
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Loading notes...</p>
        </div>
      </div>
    );
  }

  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-white dark:bg-zinc-950 overflow-hidden font-sans">
      
      {/* LEFT PANEL: LIST OF NOTES */}
      <aside className="w-full md:w-80 shrink-0 flex flex-col mt-4 px-0 ">
        {/* Header with "+ New Note" */}
        <div className="p-0 pb-4 ml-4 flex justify-between items-center gap-3">
          <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Study Notes</h2>
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-bold rounded-md hover:opacity-90 transition cursor-pointer"
          >
            <Plus size={14} />
            <span>New</span>
          </button>
        </div>

        {/* Search Notes */}
        <div className="p-0 m-0  ml-4 mb-4 relative">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs bg-white dark:bg-zinc-900/50 dark:text-zinc-100 outline-none focus:border-zinc-400"
          />
          <Search className="absolute left-[12px] top-2 text-zinc-400" size={14} />
        </div>

        {/* Notes list */}
        <div className="flex md:flex-col flex-row overflow-x-auto md:overflow-y-auto  gap-2 md:space-y-1.5 md:gap-0 no-scrollbar">
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs w-full">No notes found.</div>
          ) : (
            filteredNotes.map(n => (
              <button
                key={n.id}
                onClick={() => handleSelectNote(n)}
                className={`w-44 md:w-full shrink-0 flex flex-col p-4 py-2 text-left transition-all border border-transparent cursor-pointer rounded-r-lg ${
                  activeNoteId === n.id
                    ? 'bg-[#00000010] dark:bg-zinc-900 font-extrabold'
                    : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-900/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1 w-full">
                  <span className="font-extrabold text-md text-zinc-900 dark:text-zinc-100 truncate flex-1">
                    {n.title || 'Untitled Note'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate w-full">
                  {n.content ? n.content.substring(0, 60) : 'No content'}
                </p>
                <span className="text-[9px] text-zinc-400 font-semibold mt-2.5 uppercase tracking-wide select-none">
                  {new Date(n.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* RIGHT PANEL: EDITOR */}
      <div className="flex-1 flex mx-4 mb-4 md:m-4 md:mb-0 shadow-lg border border-zinc-200 rounded flex-col min-w-0 bg-white dark:bg-zinc-950">
        
        {/* Editor Toolbar Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center gap-2 bg-zinc-50/50 dark:bg-zinc-900/10 z-10">

          {/* Style Controls (B, I, U) */}
          <div className="flex items-center rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('bold')}
              disabled={!activeNoteId}
              className="p-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer font-bold"
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('italic')}
              disabled={!activeNoteId}
              className="p-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition cursor-pointer"
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('underline')}
              disabled={!activeNoteId}
              className="p-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition cursor-pointer"
              title="Underline"
            >
              <Underline size={13} />
            </button>
          </div>

          {/* Highlighter Color Options (grey, gold, green, red, blue) */}
          <div className="flex items-center gap-1.5 px-2">
            {(['grey', 'gold', 'green', 'red', 'blue'] as const).map(color => (
              <button
                key={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextHighlight(color)}
                disabled={!activeNoteId}
                className={`w-4.5 h-4.5 rounded-full cursor-pointer transition-all hover:scale-110 ${getNoteCircleClass(color)}`}
                title={`Highlight ${color}`}
              />
            ))}
          </div>

          {/* Heading controls */}
          <div className="flex items-center rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden text-[10px] font-extrabold uppercase">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('h1')}
              disabled={!activeNoteId}
              className="px-2 py-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              H1
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('h2')}
              disabled={!activeNoteId}
              className="px-2 py-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition cursor-pointer"
            >
              H2
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('h3')}
              disabled={!activeNoteId}
              className="px-2 py-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition cursor-pointer"
            >
              H3
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('normal')}
              disabled={!activeNoteId}
              className="px-2 py-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition cursor-pointer"
            >
              Normal
            </button>
          </div>

          <div className="flex-1" />

          {/* Options Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setOptionsMenuOpen(!optionsMenuOpen)}
              disabled={!activeNoteId}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-550 cursor-pointer disabled:opacity-40"
              title="More Options"
            >
              <MoreVertical size={16} />
            </button>

            {optionsMenuOpen && (
              <>
                {/* Click backdrop to close */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setOptionsMenuOpen(false)}
                />
                
                {/* Dropdown Items */}
                <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    onClick={handleCopyNoteContent}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                    Copy Content
                  </button>
                  <button
                    onClick={handleDuplicateNote}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                  >
                    <Plus size={13} />
                    Duplicate Note
                  </button>
                  <button
                    onClick={handleClearNoteContent}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                  >
                    <FileText size={13} />
                    Clear Content
                  </button>
                  
                  <div className="h-px bg-zinc-150 dark:bg-zinc-800 my-1" />
                  
                  <button
                    onClick={() => {
                      setOptionsMenuOpen(false);
                      handleDeleteNote();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-655 hover:bg-red-50 dark:hover:bg-red-955/20 text-left transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Delete Note
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Note Editor Workspace */}
        {activeNoteId ? (
          <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 min-h-0">
            {/* Inject direct WYSIWYG element styles safely */}
            <style dangerouslySetInnerHTML={{ __html: `
              .editor-content:empty:before {
                content: attr(placeholder);
                color: #a1a1aa;
                pointer-events: none;
                display: block;
              }
              .editor-content h1 {
                font-size: 1.5rem;
                font-weight: 900;
                color: #18181b;
                margin-top: 1.25rem;
                margin-bottom: 0.5rem;
              }
              .editor-content h2 {
                font-size: 1.25rem;
                font-weight: 800;
                color: #18181b;
                margin-top: 1rem;
                margin-bottom: 0.375rem;
              }
              .editor-content h3 {
                font-size: 1.1rem;
                font-weight: 700;
                color: #18181b;
                margin-top: 0.75rem;
                margin-bottom: 0.25rem;
              }
              .dark .editor-content h1, 
              .dark .editor-content h2, 
              .dark .editor-content h3 {
                color: #f4f4f5;
              }
              .editor-content p {
                margin-top: 0.25rem;
                margin-bottom: 0.25rem;
                line-height: 1.6;
              }
            `}} />

            {/* Title field */}
            <input
              type="text"
              placeholder="Note Title"
              value={editorTitle}
              onChange={(e) => setEditorTitle(e.target.value)}
              className="w-full text-xl sm:text-2xl font-black tracking-tight border-0 outline-none bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 focus:ring-0 focus:outline-none"
            />
            
            {/* Divider line */}
            <div className="w-full h-px bg-zinc-150 dark:bg-zinc-800 shrink-0" />
            
            {/* Content text area (contentEditable div for direct WYSIWYG rendering) */}
            <div
              ref={editorRef}
              contentEditable={true}
              onInput={handleEditorInput}
              {...{ placeholder: "Start drafting your study notes here..." }}
              className="w-full flex-1 border-0 outline-none bg-transparent text-zinc-800 dark:text-zinc-200 text-sm overflow-y-auto focus:ring-0 focus:outline-none placeholder-zinc-300 dark:placeholder-zinc-650 min-h-[200px] prose dark:prose-invert max-w-none editor-content"
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-zinc-400 select-none">
            <FileText size={48} className="mb-3 opacity-30" />
            <h3 className="font-extrabold text-sm uppercase tracking-wide mb-1">No Active Note</h3>
            <p className="text-xs text-center max-w-xs">Create a new study note or select one from the sidebar directory to begin editing.</p>
          </div>
        )}
      </div>

    </div>
  );
}
