"use client";

import React from 'react';
import { OverlayProvider } from '@/context/OverlayContext';
import OverlayWindowsManager from './OverlayWindowsManager';
import Dock from './Dock';

export default function OverlayWrapper({ children }: { children: React.ReactNode }) {
  return (
    <OverlayProvider>
      {children}
      <OverlayWindowsManager />
      <Dock />
    </OverlayProvider>
  );
}
