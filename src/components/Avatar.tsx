"use client";

import React, { useState } from 'react';
import { getAvatarGradient } from '@/utils/supabase/profile-helper';

interface AvatarProps {
  avatarUrl: string | null | undefined;
  username: string | null | undefined;
  sizeClass?: string;
  textSizeClass?: string;
}

export default function Avatar({ 
  avatarUrl, 
  username, 
  sizeClass = "h-8 w-8", 
  textSizeClass = "text-xs font-bold" 
}: AvatarProps) {
  const name = username || 'User';
  const firstLetter = name.charAt(0).toUpperCase();
  const [imgFailed, setImgFailed] = useState(false);

  // Check if avatarUrl is a public image url (normally starts with http, https, / or data:image)
  const hasImage = avatarUrl && 
    (avatarUrl.startsWith('http://') || 
     avatarUrl.startsWith('https://') || 
     avatarUrl.startsWith('/') || 
     avatarUrl.startsWith('data:image/'));

  if (hasImage && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={`${name}'s Avatar`}
        className={`${sizeClass} rounded-full object-cover shrink-0 shadow-sm`}
        style={{ boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.18), inset 0 0 0 1.5px rgba(255,255,255,0.08)' }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  // Generate gradient based on the first letter
  const gradient = getAvatarGradient(name);

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white shrink-0 shadow-sm`}
      style={{ background: gradient, boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.18)' }}
    >
      <span className={textSizeClass}>{firstLetter}</span>
    </div>
  );
}
