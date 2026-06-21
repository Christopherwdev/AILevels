"use client";

import React, { useEffect, useState } from 'react';
import { useOverlay } from '@/context/OverlayContext';
import { createClient } from '@/utils/supabase/client';
import { NotebookText } from 'lucide-react';

export default function Dock() {
  const supabase = createClient();
  const { isOpen, isMinimized, activeNoteId, dockingEnabled, openNote } = useOverlay();
  const [mostRecentNoteId, setMostRecentNoteId] = useState<string | null>(null);

  // Fetch the most recent note to open by default if none is active
  useEffect(() => {
    async function fetchMostRecent() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('notes')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setMostRecentNoteId(data.id);
      }
    }
    if (dockingEnabled && !isOpen) {
      fetchMostRecent();
    }
  }, [dockingEnabled, isOpen]);

  // Only render if docking is enabled and the overlay is either closed or minimized
  if (!dockingEnabled || (isOpen && !isMinimized)) return null;

  const handleOpen = () => {
    const targetId = activeNoteId || mostRecentNoteId || '';
    openNote(targetId);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[80] flex items-center justify-end pointer-events-auto">
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 p-3 px-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-2xl hover:scale-105 hover:-translate-y-0.5 transition-all cursor-pointer font-bold text-xs uppercase tracking-wider hover:opacity-90 active:scale-95"
        title="Open Note Editor"
      >
        <NotebookText size={15} />
        <span>Quick Note</span>
      </button>
    </div>
  );
}
