"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface OverlayContextType {
  isOpen: boolean;
  isMinimized: boolean;
  activeNoteId: string | null;
  dockingEnabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
  setDockingEnabled: (enabled: boolean) => void;
  openNote: (noteId: string) => void;
  closeNote: () => void;
  setMinimized: (minimized: boolean) => void;
  setMaximized: (maximized: boolean) => void;
  updatePosition: (x: number, y: number) => void;
  updateSize: (w: number, h: number) => void;
  setActiveNoteId: (id: string | null) => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [dockingEnabled, setDockingEnabled] = useState(true);
  const [maximized, setMaximized] = useState(false);
  
  // Position and size states
  const [x, setX] = useState(100);
  const [y, setY] = useState(100);
  const [width, setWidth] = useState(750);
  const [height, setHeight] = useState(550);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('single_note_overlay');
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          setIsOpen(parsed.isOpen ?? false);
          setIsMinimized(parsed.isMinimized ?? false);
          setActiveNoteId(parsed.activeNoteId ?? null);
          setX(parsed.x ?? 100);
          setY(parsed.y ?? 100);
          setWidth(parsed.width ?? 750);
          setHeight(parsed.height ?? 550);
          setMaximized(parsed.maximized ?? false);
        } catch (e) {
          console.error(e);
        }
      }
      const savedDocking = localStorage.getItem('docking_enabled');
      if (savedDocking !== null) {
        setDockingEnabled(savedDocking === 'true');
      }
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      const stateToSave = { isOpen, isMinimized, activeNoteId, x, y, width, height, maximized };
      localStorage.setItem('single_note_overlay', JSON.stringify(stateToSave));
    }
  }, [isOpen, isMinimized, activeNoteId, x, y, width, height, maximized, isLoaded]);

  // Save dockingEnabled to localStorage
  useEffect(() => {
    if (isLoaded && typeof window !== 'undefined') {
      localStorage.setItem('docking_enabled', String(dockingEnabled));
    }
  }, [dockingEnabled, isLoaded]);

  const openNote = (noteId: string) => {
    setActiveNoteId(noteId);
    setIsOpen(true);
    setIsMinimized(false);
  };

  const closeNote = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const updatePosition = (newX: number, newY: number) => {
    setX(newX);
    setY(newY);
  };

  const updateSize = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;
      const { type, noteId } = event.data;
      if (type === 'OPEN_NOTE') {
        openNote(noteId);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <OverlayContext.Provider value={{
      isOpen,
      isMinimized,
      activeNoteId,
      dockingEnabled,
      x,
      y,
      width,
      height,
      maximized,
      setDockingEnabled,
      openNote,
      closeNote,
      setMinimized: setIsMinimized,
      setMaximized,
      updatePosition,
      updateSize,
      setActiveNoteId
    }}>
      {children}
    </OverlayContext.Provider>
  );
}

export function useOverlay() {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
}
