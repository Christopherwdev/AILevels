"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Bold, Italic, Underline, MoreVertical, Copy, Plus, FileText, Trash2 } from 'lucide-react';

interface NoteEditorProps {
  noteId: string;
  onDelete?: () => void;
  toolbarPrefix?: React.ReactNode;
  toolbarSuffix?: React.ReactNode;
}

export default function NoteEditor({ noteId, onDelete, toolbarPrefix, toolbarSuffix }: NoteEditorProps) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarScrollRef = useRef<HTMLDivElement>(null);

  // Native capture-phase touch and mouse drag scroll for the toolbar
  useEffect(() => {
    const el = toolbarScrollRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onStart = (clientX: number) => {
      isDown = true;
      startX = clientX;
      startScrollLeft = el.scrollLeft;
    };

    const onMove = (clientX: number, e: Event) => {
      if (!isDown) return;
      const walk = startX - clientX;
      if (Math.abs(walk) > 2) {
        el.scrollLeft = startScrollLeft + walk;
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const onEnd = () => {
      isDown = false;
    };

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      onStart(e.touches[0].clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      onMove(e.touches[0].clientX, e);
    };

    // Mouse events
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Left click only
      onStart(e.clientX);
    };
    const handleMouseMove = (e: MouseEvent) => {
      onMove(e.clientX, e);
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    el.addEventListener('touchend', onEnd, { capture: true });
    el.addEventListener('touchcancel', onEnd, { capture: true });

    el.addEventListener('mousedown', handleMouseDown, { capture: true });
    window.addEventListener('mousemove', handleMouseMove, { capture: true });
    window.addEventListener('mouseup', onEnd, { capture: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart, { capture: true } as EventListenerOptions);
      el.removeEventListener('touchmove', handleTouchMove, { capture: true } as EventListenerOptions);
      el.removeEventListener('touchend', onEnd, { capture: true } as EventListenerOptions);
      el.removeEventListener('touchcancel', onEnd, { capture: true } as EventListenerOptions);

      el.removeEventListener('mousedown', handleMouseDown, { capture: true } as EventListenerOptions);
      window.removeEventListener('mousemove', handleMouseMove, { capture: true } as EventListenerOptions);
      window.removeEventListener('mouseup', onEnd, { capture: true } as EventListenerOptions);
    };
  }, []);

  // Authenticate user
  useEffect(() => {
    async function getSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    }
    getSession();
  }, [supabase]);

  // Load note content when noteId changes
  useEffect(() => {
    async function loadNote() {
      if (!noteId) return;
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .maybeSingle();

      if (data) {
        setEditorTitle(data.title || '');
        setEditorContent(data.content || '');
        if (editorRef.current) {
          editorRef.current.innerHTML = data.content || '';
        }
      }
    }
    loadNote();
  }, [noteId, supabase]);

  // Broadcast updates on local state change (real-time cross-tab/panel sync)
  const broadcastUpdate = (title: string, content: string) => {
    if (typeof window !== 'undefined') {
      try {
        const channel = new BroadcastChannel('notes-sync-channel');
        channel.postMessage({
          type: 'NOTE_UPDATED',
          noteId,
          title,
          content,
          updated_at: new Date().toISOString()
        });
        channel.close();
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    if (!noteId) return;
    broadcastUpdate(editorTitle, editorContent);
  }, [editorTitle, editorContent, noteId]);

  // Listen for broadcast sync updates from other sessions/components
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('notes-sync-channel');

    channel.onmessage = (event) => {
      if (!event.data) return;
      const { type, noteId: msgNoteId, title, content } = event.data;

      if (type === 'NOTE_UPDATED' && msgNoteId === noteId) {
        setEditorTitle(title);
        setEditorContent(content);
        if (editorRef.current && document.activeElement !== editorRef.current) {
          editorRef.current.innerHTML = content || '';
        }
      }
    };

    return () => channel.close();
  }, [noteId]);

  // Auto-save debounced logic
  useEffect(() => {
    if (!noteId || !userId) return;

    const delayDebounce = setTimeout(async () => {
      // First check if actual changes were made to avoid redundant saves
      const { data: current } = await supabase
        .from('notes')
        .select('title, content')
        .eq('id', noteId)
        .maybeSingle();

      if (current && current.title === editorTitle && current.content === editorContent) {
        return;
      }

      setIsSaving(true);
      const updatedFields = {
        title: editorTitle.trim(),
        content: editorContent
      };

      const { error } = await supabase
        .from('notes')
        .update(updatedFields)
        .eq('id', noteId);

      if (error) {
        console.error('Failed to auto-save:', error);
      }
      setIsSaving(false);
    }, 1000);

    return () => clearTimeout(delayDebounce);
  }, [editorTitle, editorContent, noteId, userId, supabase]);

  const handleEditorInput = () => {
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
    }
  };

  const applyTextFormat = (formatType: 'bold' | 'italic' | 'underline' | 'h1' | 'h2' | 'h3' | 'normal') => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    switch (formatType) {
      case 'bold': document.execCommand('bold', false); break;
      case 'italic': document.execCommand('italic', false); break;
      case 'underline': document.execCommand('underline', false); break;
      case 'h1': document.execCommand('formatBlock', false, 'H1'); break;
      case 'h2': document.execCommand('formatBlock', false, 'H2'); break;
      case 'h3': document.execCommand('formatBlock', false, 'H3'); break;
      case 'normal': document.execCommand('formatBlock', false, 'P'); break;
    }
    handleEditorInput();
  };

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
    document.execCommand('backColor', false, hexColor);
    handleEditorInput();
  };

  const handleCopyNoteContent = async () => {
    try {
      await navigator.clipboard.writeText(editorContent.replace(/<[^>]*>/g, ''));
      alert('Text content copied to clipboard!');
    } catch (err) {
      console.error(err);
    }
    setOptionsMenuOpen(false);
  };

  const handleDuplicateNote = async () => {
    if (!userId) return;
    const duplicatedNote = {
      user_id: userId,
      title: `${editorTitle} (Copy)`,
      content: editorContent,
      color: 'grey'
    };

    const { error } = await supabase
      .from('notes')
      .insert(duplicatedNote);

    if (error) {
      alert('Failed to duplicate note.');
    } else {
      alert('Note duplicated successfully!');
    }
    setOptionsMenuOpen(false);
  };

  const handleClearNoteContent = () => {
    if (!confirm('Are you sure you want to clear this note\'s content?')) return;
    setEditorContent('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
    }
    setOptionsMenuOpen(false);
  };

  const handleDeleteNote = async () => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      alert('Failed to delete note.');
    } else {
      if (onDelete) onDelete();
    }
    setOptionsMenuOpen(false);
  };

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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-950 h-full">
      {/* Editor Toolbar Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex items-center bg-zinc-50/50 dark:bg-zinc-900/10 z-10 min-w-0">

        {/* ── Scrollable region: prefix + tools + options ── */}
        <div
          ref={toolbarScrollRef}
          className="flex items-center gap-2 px-3 py-2 overflow-x-auto flex-nowrap flex-1 min-w-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >

          {/* Optional prefix slot (e.g. note picker dropdown from overlay) */}
          {toolbarPrefix && (
            <div className="shrink-0 flex items-center">{toolbarPrefix}</div>
          )}

          {/* Style Controls (B, I, U) */}
          <div className="shrink-0 flex items-center rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('bold')}
              className="p-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer font-bold"
              title="Bold"
            >
              <Bold size={13} />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('italic')}
              className="p-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition cursor-pointer"
              title="Italic"
            >
              <Italic size={13} />
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('underline')}
              className="p-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition cursor-pointer"
              title="Underline"
            >
              <Underline size={13} />
            </button>
          </div>

          {/* Highlighter Color Options */}
          <div className="shrink-0 flex items-center gap-1.5 px-2">
            {(['grey', 'gold', 'green', 'red', 'blue'] as const).map(color => (
              <button
                key={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyTextHighlight(color)}
                className={`w-6 h-6 rounded cursor-pointer transition-all hover:scale-110 ${getNoteCircleClass(color)}`}
                title={`Highlight ${color}`}
              />
            ))}
          </div>

          {/* Heading controls */}
          <div className="shrink-0 flex items-center rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden text-[10px] font-extrabold uppercase">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('h1')}
              className="px-2 py-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              H1
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('h2')}
              className="px-2 py-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition cursor-pointer"
            >
              H2
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('h3')}
              className="px-2 py-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition cursor-pointer"
            >
              H3
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyTextFormat('normal')}
              className="px-2 py-1.5 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-l border-zinc-100 dark:border-zinc-800 transition cursor-pointer"
            >
              Normal
            </button>
          </div>

        </div>{/* end scrollable region */}

        {/* Options Dropdown Menu (moved outside scrollable region to prevent clipping) */}
        <div className="shrink-0 relative mr-2">
          <button
            onClick={() => setOptionsMenuOpen(!optionsMenuOpen)}
            className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-555 cursor-pointer"
            title="More Options"
          >
            <MoreVertical size={16} />
          </button>

          {optionsMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOptionsMenuOpen(false)} />
              <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  onClick={handleCopyNoteContent}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-350 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
                >
                  <Copy size={13} />
                  Copy Content
                </button>
                <button
                  onClick={handleDuplicateNote}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-355 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors cursor-pointer"
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
                  onClick={handleDeleteNote}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-655 hover:bg-red-50 dark:hover:bg-red-955/20 text-left transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  Delete Note
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Fixed suffix: always visible on the right ── */}
        {toolbarSuffix && (
          <div className="shrink-0 flex items-center pr-1">{toolbarSuffix}</div>
        )}

      </div>

      {/* Note Editor Workspace */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 min-h-0 overflow-y-auto">
        <style dangerouslySetInnerHTML={{
          __html: `
          .editor-content:empty:before {
            content: attr(placeholder);
            color: #a1a1aa;
            pointer-events: none;
            display: block;
          }
          .editor-content h1 { font-size: 1.5rem; font-weight: 900; color: #18181b; margin-top: 1.25rem; margin-bottom: 0.5rem; }
          .editor-content h2 { font-size: 1.25rem; font-weight: 800; color: #18181b; margin-top: 1rem; margin-bottom: 0.375rem; }
          .editor-content h3 { font-size: 1.1rem; font-weight: 700; color: #18181b; margin-top: 0.75rem; margin-bottom: 0.25rem; }
          .dark .editor-content h1, .dark .editor-content h2, .dark .editor-content h3 { color: #f4f4f5; }
          .editor-content p { margin-top: 0.25rem; margin-bottom: 0.25rem; line-height: 1.6; }
        `}} />

        <input
          type="text"
          placeholder="Note Title"
          value={editorTitle}
          onChange={(e) => setEditorTitle(e.target.value)}
          className="w-full text-xl sm:text-2xl font-black tracking-tight border-0 outline-none bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 focus:ring-0 focus:outline-none"
        />

        <div className="w-full h-[1px] bg-zinc-100 dark:bg-zinc-800 shrink-0" />

        <div
          ref={editorRef}
          contentEditable={true}
          onInput={handleEditorInput}
          {...{ placeholder: "Start drafting your study notes here..." }}
          className="w-full flex-1 border-0 outline-none bg-transparent text-zinc-800 dark:text-zinc-200 text-sm focus:ring-0 focus:outline-none placeholder-zinc-300 dark:placeholder-zinc-650 min-h-[200px] prose dark:prose-invert max-w-none editor-content"
        />
      </div>
    </div>
  );
}
