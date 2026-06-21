"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { subjects, getSubjectIcon } from '@/utils/subjects';
import Link from 'next/link';
import { Send, Image as ImageIcon, Paperclip, Hash, Users, ChevronLeft, Info, Mic, Heart, StopCircle, Trash2, Settings } from 'lucide-react';
import Avatar from '@/components/Avatar';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  room: string;
  content: string;
  file_url?: string;
  file_type?: string;
  file_name?: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export default function ChatPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('Anonymous');
  const [activeRoom, setActiveRoom] = useState(subjects[0].slug);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  
  // DMs State
  const [activeDMs, setActiveDMs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'group' | 'private'>('group');
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    messageId: string | null;
  }>({ visible: false, x: 0, y: 0, messageId: null });

  // Long press timer ref for mobile
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auth check and DMs loader
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
        .select('username, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      
      let currentUsername = 'Anonymous';
      if (profile?.username) {
        setUsername(profile.username);
        currentUsername = profile.username;
      }

      // Fetch all unique private DM rooms user has participated in
      try {
        const { data: dmRoomsData } = await supabase
          .from('chat_messages')
          .select('room')
          .like('room', `dm:%${currentUsername}%`);

        const uniqueRecipients = new Set<string>();
        if (dmRoomsData) {
          dmRoomsData.forEach((row: any) => {
            const parts = row.room.split(':');
            if (parts[0] === 'dm' && parts.length === 3) {
              const recipientName = parts[1] === currentUsername ? parts[2] : parts[1];
              uniqueRecipients.add(recipientName);
            }
          });
        }

        const savedDMs = localStorage.getItem(`precision_edu_active_dms_${user.id}`);
        const localList: string[] = savedDMs ? JSON.parse(savedDMs) : [];
        const merged = Array.from(new Set([...localList, ...Array.from(uniqueRecipients)]));
        setActiveDMs(merged);
        localStorage.setItem(`precision_edu_active_dms_${user.id}`, JSON.stringify(merged));
      } catch (dmErr) {
        console.error("Failed to load DMs on init:", dmErr);
      }

      setLoading(false);
    }
    init();
  }, [router, supabase]);

  // Synchronize sidebar tab with active room type
  useEffect(() => {
    if (activeRoom.startsWith('dm:')) {
      setSidebarTab('private');
    } else {
      setSidebarTab('group');
    }
  }, [activeRoom]);

  // Load messages + realtime subscription
  useEffect(() => {
    if (!userId) return;

    setMessages([]);

    async function loadMessages() {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room', activeRoom)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) setMessages(data);
    }
    loadMessages();

    // Subscribe to INSERT and DELETE events
    const channelName = `chat-room-${activeRoom}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.room === activeRoom) {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const oldMsg = payload.old as { id: string };
          setMessages(prev => prev.filter(m => m.id !== oldMsg.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeRoom, supabase]);

  // Fetch profiles for users in messages who aren't loaded yet
  useEffect(() => {
    if (messages.length === 0) return;

    const missingUserIds = Array.from(new Set(messages.map(m => m.user_id)))
      .filter(id => id && !profiles[id]);

    if (missingUserIds.length === 0) return;

    async function fetchProfiles() {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', missingUserIds);

      if (data) {
        setProfiles(prev => {
          const next = { ...prev };
          data.forEach(p => {
            next[p.id] = p;
          });
          return next;
        });
      }
    }
    fetchProfiles();
  }, [messages, profiles, supabase]);

  // Close context menu on outside click
  useEffect(() => {
    function handleOutsideClick() {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    }
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [contextMenu.visible]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !userId) return;

    const optimisticId = crypto.randomUUID();
    const now = new Date().toISOString();
    const content = newMessage.trim();

    // Optimistic update
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      user_id: userId,
      username,
      room: activeRoom,
      content,
      created_at: now,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setNewMessage('');

    const { data } = await supabase
      .from('chat_messages')
      .insert({ user_id: userId, username, room: activeRoom, content })
      .select()
      .single();

    if (data) {
      setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
    }
  }, [newMessage, userId, username, activeRoom, supabase]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    try {
      const filePath = `chat/${activeRoom}/${Date.now()}_${file.name}`;

      const { error: storageErr } = await supabase.storage
        .from('chat-uploads')
        .upload(filePath, file);

      if (storageErr) {
        console.error('Storage upload failed details:', storageErr);
        throw new Error(`Upload failed: ${storageErr.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(filePath);

      let fileType = 'file';
      if (file.type.startsWith('image/')) {
        fileType = 'image';
      } else if (file.type.startsWith('audio/')) {
        fileType = 'audio';
      }

      const { data, error: insertErr } = await supabase.from('chat_messages').insert({
        user_id: userId,
        username,
        room: activeRoom,
        content: fileType === 'image' ? '' : fileType === 'audio' ? '🎙️ Audio File' : `📎 ${file.name}`,
        file_url: urlData.publicUrl,
        file_type: fileType,
        file_name: file.name,
      }).select().single();

      if (insertErr) {
        console.error('Database message insert failed details:', insertErr);
        throw new Error(`Db insert failed: ${insertErr.message}`);
      }

      if (data) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    } catch (err: any) {
      console.error('File Upload main routine exception:', err);
      alert(`Upload failed: ${err.message || 'Check storage bucket creation and policy.'}`);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/ogg';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';

      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        
        if (audioChunksRef.current.length === 0) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/wav' });
        const file = new File([audioBlob], `voice-message-${Date.now()}.wav`, { type: audioBlob.type });
        await uploadAudioBlob(file);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      alert('Could not access microphone. Please check site permissions.');
    }
  };

  const stopRecording = (shouldSave: boolean) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (!shouldSave) {
        audioChunksRef.current = []; 
      }
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const uploadAudioBlob = async (file: File) => {
    if (!userId) return;
    setUploading(true);
    try {
      const filePath = `chat/${activeRoom}/${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('chat-uploads')
        .upload(filePath, file);

      if (uploadErr) {
        console.error('Audio upload storage error:', uploadErr);
        throw new Error(`Audio upload failed: ${uploadErr.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(filePath);

      const { data, error: insertErr } = await supabase.from('chat_messages').insert({
        user_id: userId,
        username,
        room: activeRoom,
        content: '🎙️ Voice Message',
        file_url: urlData.publicUrl,
        file_type: 'audio',
        file_name: 'Voice Message.wav',
      }).select().single();

      if (insertErr) {
        console.error('Audio database message insert error:', insertErr);
        throw new Error(`Audio insert failed: ${insertErr.message}`);
      }

      if (data) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    } catch (err: any) {
      console.error('Voice upload routine exception:', err);
      alert(`Voice message failed: ${err.message || 'Check Supabase bucket.'}`);
    }
    setUploading(false);
  };

  // Deletion and Context Menu handlers
  const handleDeleteMessage = async (messageId: string) => {
    // Optimistic update
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setContextMenu(prev => ({ ...prev, visible: false }));

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('Failed to delete message:', error);
      alert('Could not delete message. Please try again.');
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room', activeRoom)
        .order('created_at', { ascending: true })
        .limit(100);
      if (data) setMessages(data);
    }
  };

  const handleMessageContextMenu = (e: React.MouseEvent, msgId: string, isOwnMessage: boolean) => {
    if (!isOwnMessage) return;
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      messageId: msgId
    });
  };

  const handleMessageTouchStart = (e: React.TouchEvent, msgId: string, isOwnMessage: boolean) => {
    if (!isOwnMessage) return;
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        visible: true,
        x: clientX,
        y: clientY,
        messageId: msgId
      });
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleMessageTouchMove = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query.trim()}%`)
        .neq('id', userId)
        .limit(10);

      if (!error && data) {
        setSearchResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleStartDM = (recipient: UserProfile) => {
    if (!userId || !username) return;
    
    const sorted = [username, recipient.username].sort();
    const dmRoom = `dm:${sorted[0]}:${sorted[1]}`;
    
    if (!activeDMs.includes(recipient.username)) {
      const updated = [...activeDMs, recipient.username];
      setActiveDMs(updated);
      localStorage.setItem(`precision_edu_active_dms_${userId}`, JSON.stringify(updated));
    }
    
    setActiveRoom(dmRoom);
    setSearchQuery('');
    setSearchResults([]);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const renderChannelButton = (s: typeof subjects[0]) => {
    const isSelected = activeRoom === s.slug;
    const ChannelIcon = getSubjectIcon(s.iconName);
    
    return (
      <button
        key={s.slug}
        onClick={() => {
          setActiveRoom(s.slug);
          if (window.innerWidth < 768) {
            setShowSidebar(false);
          }
        }}
        className={`w-full flex items-center gap-3.5 px-5 py-2.5 transition-all text-left cursor-pointer border-r-2 border-transparent ${
          isSelected
            ? 'bg-grey-bg dark:bg-zinc-900/60 font-extrabold'
            : 'hover:bg-grey-hover dark:hover:bg-zinc-900/20 text-zinc-700 dark:text-zinc-300'
        }`}
      >
        {/* Circular Icon (Black border, theme color, white icon) */}
        <div 
          className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center relative shrink-0 shadow-inner"
          style={{ backgroundColor: s.color }}
        >
          {ChannelIcon && <ChannelIcon size={16} className="text-white" />}
          {/* Online badge dot */}
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-black rounded-full" />
        </div>

        {/* Room Info */}
        <div className="flex flex-col min-w-0 text-left select-none">
          <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-150 truncate leading-tight">
            {s.name}
          </span>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-medium mt-0.5">
            {s.level || 'IAL'} Room
          </span>
        </div>
      </button>
    );
  };

  const activeSubject = subjects.find(s => s.slug === activeRoom);

  if (loading) {
    return (
      <div className="h-[calc(100dvh-4rem)] flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100 animate-spin" />
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">Loading chat...</p>
        </div>
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}:${remaining.toString().padStart(2, '0')}`;
  };

  const getAvatarBg = (name: string) => {
    const colors = [
      'from-pink-500 to-rose-500',
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-sky-500',
      'from-emerald-500 to-teal-500',
      'from-amber-500 to-orange-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="h-[calc(100dvh-4rem)] flex bg-white dark:bg-black overflow-hidden font-sans">
      {/* Sidebar — Room List */}
      <aside className={`${showSidebar ? 'w-full md:w-80' : 'w-0 overflow-hidden'} flex-shrink-0 border-r border-zinc-100 dark:border-zinc-900 flex flex-col transition-all duration-300 bg-white dark:bg-black`}>
        <div className="p-5 border-b border-zinc-50 dark:border-zinc-950 flex flex-col gap-4 select-none">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Messages
          </h2>
          <div className="flex bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg">
            <button
              onClick={() => setSidebarTab('group')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                sidebarTab === 'group'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => setSidebarTab('private')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                sidebarTab === 'private'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
              }`}
            >
              Private
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
          {sidebarTab === 'group' && (
            <div className="py-2">
              <p className="px-5 text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-550 mb-1.5 select-none">
                Group Chats
              </p>
              {subjects.map(renderChannelButton)}
            </div>
          )}

          {/* PRIVATE CHATS / DMs SECTION */}
          {sidebarTab === 'private' && (
            <>
              <div className="px-5 py-4 bg-zinc-50/20 dark:bg-zinc-900/10">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-550 mb-2 select-none">
                  Private Chats
                </p>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users to chat..."
                    value={searchQuery}
                    onChange={(e) => handleSearchUsers(e.target.value)}
                    className="w-full text-xs bg-grey-bg dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                  {searchLoading && (
                    <span className="absolute right-2.5 top-2 w-3.5 h-3.5 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                
                {/* Search Results dropdown */}
                {searchQuery && searchResults.length > 0 && (
                  <div className="mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded max-h-40 overflow-y-auto shadow-lg z-20 relative">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => handleStartDM(u)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-zinc-55 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-850 last:border-b-0 cursor-pointer"
                      >
                        <Avatar avatarUrl={u.avatar_url} username={u.username} sizeClass="w-6 h-6" textSizeClass="text-[10px] font-bold" />
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">@{u.username}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && !searchLoading && (
                  <p className="text-[10px] text-zinc-400 mt-2 text-left select-none">No users found.</p>
                )}
              </div>

              <div className="flex-1 space-y-0.5 pb-4">
                {activeDMs.map((dmUsername) => {
                  const dmRoom = `dm:${[username, dmUsername].sort().join(':')}`;
                  const isSelected = activeRoom === dmRoom;
                  
                  return (
                    <button
                      key={dmUsername}
                      onClick={() => {
                        setActiveRoom(dmRoom);
                        if (window.innerWidth < 768) {
                          setShowSidebar(false);
                        }
                      }}
                      className={`w-full flex items-center gap-3.5 px-5 py-2.5 transition-all text-left cursor-pointer border-r-2 border-transparent ${
                        isSelected
                          ? 'bg-grey-bg dark:bg-zinc-900/60 font-extrabold'
                          : 'hover:bg-grey-hover/50 dark:hover:bg-zinc-900/20 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <Avatar avatarUrl={null} username={dmUsername} sizeClass="w-10 h-10" textSizeClass="text-sm font-bold" />
                      <div className="flex flex-col min-w-0 text-left select-none">
                        <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-150 truncate leading-tight">
                          @{dmUsername}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-550 font-medium mt-0.5">
                          Direct Message
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between gap-3 bg-white dark:bg-black select-none">
          <div className="flex items-center gap-3 min-w-0">
            {/* Circular Avatar (White background, red border, red letter B) */}
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

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-black ${showSidebar ? 'hidden md:flex' : 'flex'}`}>
        {/* Chat Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-black flex-shrink-0 z-10 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors cursor-pointer mr-1"
            >
              <ChevronLeft size={20} className="text-zinc-700 dark:text-zinc-300" />
            </button>
            <span className="text-zinc-400 dark:text-zinc-500 text-lg font-bold">
              {activeRoom.startsWith('dm:') ? '@' : '#'}
            </span>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {activeRoom.startsWith('dm:') 
                ? activeRoom.split(':').filter(name => name !== 'dm' && name !== username)[0]
                : activeSubject?.slug
              }
            </h3>
            {activeRoom.startsWith('dm:') ? (
              <>
                <div className="hidden sm:block border-l border-zinc-200 dark:border-zinc-800 h-4 mx-3" />
                <p className="hidden sm:block text-[11px] text-zinc-400 dark:text-zinc-500 font-medium truncate max-w-md">
                  Private conversation with @{activeRoom.split(':').filter(name => name !== 'dm' && name !== username)[0]}
                </p>
              </>
            ) : activeSubject ? (
              <>
                <div className="hidden sm:block border-l border-zinc-200 dark:border-zinc-800 h-4 mx-3" />
                <p className="hidden sm:block text-[11px] text-zinc-400 dark:text-zinc-500 font-medium truncate max-w-md">
                  Revision, resource sharing, and exam discussions for {activeSubject.level} {activeSubject.name}.
                </p>
              </>
            ) : null}
          </div>
          <button className="p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <Info size={18} />
          </button>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar bg-white dark:bg-black">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center max-w-xl mx-auto">
              <div className="text-center space-y-2">
                {(() => {
                  if (activeRoom.startsWith('dm:')) {
                    const otherUser = activeRoom.split(':').filter(name => name !== 'dm' && name !== username)[0] || 'User';
                    return (
                      <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2 border-black bg-rose-500 shadow-inner select-none mb-4">
                        <Users size={32} className="text-white" />
                      </div>
                    );
                  }
                  const EmptyIcon = activeSubject ? getSubjectIcon(activeSubject.iconName) : null;
                  return EmptyIcon ? (
                    <div
                      className="w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2 border-black shadow-inner select-none mb-4"
                      style={{ backgroundColor: activeSubject?.color }}
                    >
                      <EmptyIcon size={32} className="text-white" />
                    </div>
                  ) : null;
                })()}
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {activeRoom.startsWith('dm:') ? 'No messages here yet' : 'No Messages Yet'}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto">
                  {activeRoom.startsWith('dm:') 
                    ? `Send a message to start a private conversation with @${activeRoom.split(':').filter(name => name !== 'dm' && name !== username)[0]}.`
                    : `Start the conversation in the #${activeSubject?.name?.toLowerCase()} study group.`
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full min-h-full flex flex-col justify-end">
              {messages.map((msg, i) => {
                const isOwn = msg.user_id === userId;
                const prevMsg = i > 0 ? messages[i - 1] : null;
                const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

                // Date separator check
                const showDateSep = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at);

                // Grouping checks (consecutive messages from same user within 3 minutes)
                const isSameSenderAsPrev = prevMsg && prevMsg.user_id === msg.user_id && 
                  (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 3 * 60 * 1000);

                const isSameSenderAsNext = nextMsg && nextMsg.user_id === msg.user_id && 
                  (new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() < 3 * 60 * 1000);

                const senderProfile = profiles[msg.user_id] || { username: msg.username, avatar_url: null };

                return (
                  <React.Fragment key={msg.id}>
                    {showDateSep && (
                      <div className="flex items-center justify-center py-4 select-none">
                        <span className="text-[10px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                          {formatDate(msg.created_at)}
                        </span>
                      </div>
                    )}
                    
                    {(() => {
                      const showAvatarAndHeader = showDateSep || !isSameSenderAsPrev;
                      return (
                        <div 
                          onContextMenu={(e) => handleMessageContextMenu(e, msg.id, isOwn)}
                          onTouchStart={(e) => handleMessageTouchStart(e, msg.id, isOwn)}
                          onTouchEnd={handleMessageTouchEnd}
                          onTouchMove={handleMessageTouchMove}
                          className="group relative flex items-start gap-4 px-6 py-1 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                        >
                          {/* Left: Avatar or Hover Timestamp */}
                          <div className="w-10 h-10 flex-shrink-0 flex items-start justify-center">
                            {showAvatarAndHeader ? (
                              <Avatar avatarUrl={senderProfile.avatar_url} username={senderProfile.username} sizeClass="w-10 h-10" textSizeClass="text-sm font-bold" />
                            ) : (
                              // Discord style: show timestamp on hover when grouped
                              <span className="hidden group-hover:block text-[9px] text-zinc-400 dark:text-zinc-500 select-none mt-1">
                                {formatTime(msg.created_at)}
                              </span>
                            )}
                          </div>

                          {/* Right: Message Header and Content */}
                          <div className="flex-1 min-w-0 text-left">
                            {showAvatarAndHeader && (
                              <div className="flex items-baseline mb-0.5 select-none">
                                <Link 
                                  href={`/user/${senderProfile.username}`}
                                  className={`text-[13px] font-bold ${isOwn ? 'text-blue-500 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'} hover:underline cursor-pointer mr-2`}
                                >
                                  {senderProfile.username}
                                </Link>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                                  {formatDate(msg.created_at)} {formatTime(msg.created_at)}
                                </span>
                              </div>
                            )}
                            
                            {/* Message content block */}
                            <div className="text-zinc-800 dark:text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.file_type === 'image' && msg.file_url && (
                                <div className="mt-1 max-w-sm rounded overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                                  <img src={msg.file_url} alt="shared file" className="max-w-full max-h-64 object-contain select-none" />
                                </div>
                              )}
                              {msg.file_type === 'audio' && msg.file_url && (
                                <div className="mt-1 py-1 max-w-xs">
                                  <audio 
                                    src={msg.file_url} 
                                    controls 
                                    className="w-full filter dark:invert scale-95 origin-left" 
                                  />
                                </div>
                              )}
                              {msg.file_type === 'file' && msg.file_url && (
                                <div className="mt-1 flex items-center gap-2">
                                  <a
                                    href={msg.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:underline bg-blue-50/50 dark:bg-blue-955/20 px-2.5 py-1 rounded border border-blue-200/50 dark:border-blue-900/30"
                                  >
                                    Public File Attachment: {msg.file_name || 'Attached File'}
                                  </a>
                                </div>
                              )}
                              {msg.content && msg.file_type !== 'audio' && (
                                <p className="text-[13.5px] font-medium leading-relaxed">{msg.content}</p>
                              )}
                            </div>
                          </div>

                          {/* Floating actions menu on hover (Discord style) */}
                          {isOwn && (
                            <div className="absolute right-6 -top-3 hidden group-hover:flex items-center bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-700 rounded shadow-md z-10 transition-all select-none">
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-colors cursor-pointer"
                                title="Delete message"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {/* Message Input (Discord Capsule Style) */}
        <div className="p-4 bg-white dark:bg-black flex-shrink-0 z-10 select-none">
          <div className="max-w-4xl mx-auto flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 bg-zinc-55/40 dark:bg-zinc-900/60">
            {isRecording ? (
              // Audio Recording State layout
              <div className="flex-1 flex items-center justify-between py-1 bg-red-50/50 dark:bg-red-955/10 rounded-full px-2">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-bold text-red-500">
                    Recording ({formatDuration(recordingDuration)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => stopRecording(false)}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 hover:text-red-500 rounded-full cursor-pointer transition-colors"
                    title="Discard recording"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    onClick={() => stopRecording(true)}
                    className="flex items-center gap-1.5 bg-red-500 hover:bg-red-655 text-white text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                    title="Send audio"
                  >
                    <StopCircle size={14} />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            ) : (
              // Normal inputs
              <>
                {/* Attachment Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="p-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors cursor-pointer text-zinc-550 hover:text-zinc-800 dark:hover:text-zinc-300"
                  title="Add file"
                >
                  <Paperclip size={18} />
                </button>
                
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => handleFileUpload(e as any);
                    input.click();
                  }}
                  disabled={uploading}
                  className="p-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors cursor-pointer text-zinc-550 hover:text-zinc-800 dark:hover:text-zinc-300 mr-1"
                  title="Add image"
                >
                  <ImageIcon size={18} />
                </button>

                {/* Input Element */}
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                  placeholder={`Message #${activeSubject?.slug || 'chat'}`}
                  className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-550 outline-none border-0 py-1"
                />

                {uploading && (
                  <span className="text-[10px] text-zinc-400 font-bold animate-pulse mr-2 select-none">Sending...</span>
                )}

                {/* Conditionally show Send text button like Instagram, fallback to icon icons if empty */}
                {newMessage.trim() ? (
                  <button
                    onClick={sendMessage}
                    className="px-3 py-1 text-sm font-bold text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer select-none"
                  >
                    Send
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startRecording}
                      disabled={uploading}
                      className="p-1 text-zinc-550 hover:text-zinc-800 dark:hover:text-zinc-300 cursor-pointer"
                      title="Voice Message"
                    >
                      <Mic size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewMessage("❤️");
                      }}
                      className="p-1 text-zinc-550 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                      title="Send Love"
                    >
                      <Heart size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 w-36 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => contextMenu.messageId && handleDeleteMessage(contextMenu.messageId)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 text-left transition-colors cursor-pointer"
          >
            <Trash2 size={13} />
            Delete Message
          </button>
        </div>
      )}
    </div>
  );
}
