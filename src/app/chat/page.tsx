"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { subjects } from '@/utils/subjects';
import { Send, Image as ImageIcon, Paperclip, Hash, Users, X, Download, ChevronDown } from 'lucide-react';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auth check
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.username) setUsername(profile.username);

      setLoading(false);
    }
    init();
  }, [router, supabase]);

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

    // Realtime — unique channel name, no server-side filter for reliability
    const channelName = `chat-room-${activeRoom}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.room === activeRoom) {
            setMessages(prev => {
              // Deduplicate (skip if already present from optimistic insert)
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, activeRoom, supabase]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !userId) return;

    const optimisticId = crypto.randomUUID();
    const now = new Date().toISOString();
    const content = newMessage.trim();

    // Optimistic update — show immediately
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

    // Insert to DB, get the real row back
    const { data } = await supabase
      .from('chat_messages')
      .insert({ user_id: userId, username, room: activeRoom, content })
      .select()
      .single();

    // Replace optimistic message with the real server row
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

      const { error } = await supabase.storage
        .from('chat-uploads')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('chat-uploads')
        .getPublicUrl(filePath);

      const isImage = file.type.startsWith('image/');

      const { data } = await supabase.from('chat_messages').insert({
        user_id: userId,
        username,
        room: activeRoom,
        content: isImage ? '' : `📎 ${file.name}`,
        file_url: urlData.publicUrl,
        file_type: isImage ? 'image' : 'file',
        file_name: file.name,
      }).select().single();

      // Optimistically add file message too
      if (data) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const activeSubject = subjects.find(s => s.slug === activeRoom);

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading Chat...</p>
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

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
      {/* Sidebar — Room List */}
      <aside className={`${showSidebar ? 'w-64' : 'w-0 overflow-hidden'} flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-200`}>
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <Hash size={14} className="text-blue-500" />
            Subject Rooms
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          {subjects.map(s => (
            <button
              key={s.slug}
              onClick={() => setActiveRoom(s.slug)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                activeRoom === s.slug
                  ? 'bg-zinc-100 dark:bg-zinc-800'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="text-sm">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold truncate ${
                  activeRoom === s.slug ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'
                }`}>
                  {s.name}
                </p>
                <p className="text-[9px] text-zinc-400 font-medium">{s.level}</p>
              </div>
              {activeRoom === s.slug && (
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              )}
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
            <Users size={12} />
            <span>Logged in as <strong className="text-zinc-600 dark:text-zinc-300">{username}</strong></span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer md:hidden"
            >
              <Hash size={16} />
            </button>
            <span className="text-lg">{activeSubject?.icon}</span>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{activeSubject?.name}</h3>
              <p className="text-[10px] text-zinc-400">Edexcel {activeSubject?.level} • Study Room</p>
            </div>
          </div>
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: activeSubject?.color }}
          />
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-4xl mb-3">{activeSubject?.icon}</div>
                <p className="text-sm font-bold text-zinc-500">No messages yet</p>
                <p className="text-[11px] text-zinc-400">Be the first to start the conversation in {activeSubject?.name}!</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isOwn = msg.user_id === userId;
            const showDateSep = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at);

            return (
              <React.Fragment key={msg.id}>
                {showDateSep && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{formatDate(msg.created_at)}</span>
                    <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                )}
                <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                    {!isOwn && (
                      <span className="text-[10px] font-bold text-zinc-500 mb-0.5 ml-1">{msg.username}</span>
                    )}
                    <div className={`rounded-2xl px-4 py-2.5 ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/60 dark:border-zinc-700/60 rounded-bl-md'
                    }`}>
                      {msg.file_type === 'image' && msg.file_url && (
                        <img src={msg.file_url} alt="shared" className="max-w-full max-h-60 rounded-lg mb-2" />
                      )}
                      {msg.file_type === 'file' && msg.file_url && (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 text-[11px] font-semibold underline ${isOwn ? 'text-blue-100' : 'text-blue-500'}`}
                        >
                          <Download size={12} />
                          {msg.file_name || 'Download File'}
                        </a>
                      )}
                      {msg.content && (
                        <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                    <span className={`text-[9px] mt-0.5 mx-1 text-zinc-400`}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-3 py-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              title="Upload file"
            >
              <Paperclip size={16} />
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
              className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              title="Upload image"
            >
              <ImageIcon size={16} />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
              placeholder={`Message #${activeSubject?.name?.toLowerCase() || 'general'}...`}
              className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none border-0"
            />
            {uploading && (
              <span className="text-[10px] text-zinc-400 font-bold animate-pulse">Uploading...</span>
            )}
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white rounded-lg transition-colors cursor-pointer"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
