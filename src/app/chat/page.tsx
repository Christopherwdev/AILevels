"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { subjects } from '@/utils/subjects';
import { Send, Image as ImageIcon, Paperclip, Hash, Users, ChevronLeft, Info, Smile, Mic, Heart } from 'lucide-react';

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
        .select('username, avatar_url')
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

    // Subscribe to INSERT events for the table
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
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-white dark:bg-zinc-950">
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

  // Generate fallback avatar background color based on name string hash
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
    <div className="h-[calc(100vh-4rem)] flex bg-white dark:bg-black overflow-hidden font-sans">
      {/* Sidebar — Room List */}
      <aside className={`${showSidebar ? 'w-80' : 'w-0 overflow-hidden'} flex-shrink-0 border-r border-zinc-100 dark:border-zinc-900 flex flex-col transition-all duration-300 bg-white dark:bg-black`}>
        <div className="p-5 border-b border-zinc-50 dark:border-zinc-950">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Messages
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          {subjects.map(s => (
            <button
              key={s.slug}
              onClick={() => setActiveRoom(s.slug)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors cursor-pointer ${
                activeRoom === s.slug
                  ? 'bg-zinc-50 dark:bg-zinc-900/50'
                  : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20'
              }`}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner select-none relative"
                style={{ background: `linear-gradient(135deg, ${s.color}20, ${s.color}40)` }}
              >
                {s.icon}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-black bg-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {s.name}
                </p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">{s.level} Room</p>
              </div>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center gap-3 bg-zinc-50/30 dark:bg-zinc-950/20">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 p-0.5">
            <div className="w-full h-full bg-white dark:bg-black rounded-full flex items-center justify-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {username.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{username}</p>
            <p className="text-[10px] text-zinc-400 font-medium">Logged in</p>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-black">
        {/* Chat Header (Instagram Style) */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-100 dark:border-zinc-900 bg-white dark:bg-black flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors cursor-pointer"
            >
              <ChevronLeft size={22} className="text-zinc-700 dark:text-zinc-300" />
            </button>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-base"
              style={{ background: `linear-gradient(135deg, ${activeSubject?.color}15, ${activeSubject?.color}35)` }}
            >
              {activeSubject?.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{activeSubject?.name}</h3>
              <p className="text-[11px] text-emerald-500 font-medium">Active in room</p>
            </div>
          </div>
          <button className="p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors text-zinc-700 dark:text-zinc-300 cursor-pointer">
            <Info size={20} />
          </button>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar bg-white dark:bg-black">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center max-w-xl mx-auto">
              <div className="text-center space-y-2">
                <div
                  className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-4xl shadow-inner select-none mb-4"
                  style={{ background: `linear-gradient(135deg, ${activeSubject?.color}15, ${activeSubject?.color}35)` }}
                >
                  {activeSubject?.icon}
                </div>
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">No Messages Yet</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mx-auto">
                  Start the conversation in the #{activeSubject?.name?.toLowerCase()} study group.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full min-h-full flex flex-col justify-end space-y-1">
              {messages.map((msg, i) => {
                const isOwn = msg.user_id === userId;
                const prevMsg = i > 0 ? messages[i - 1] : null;
                const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

                // Date separator check
                const showDateSep = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at);

                // Grouping checks (consecutive messages from same user within 5 minutes)
                const isSameSenderAsPrev = prevMsg && prevMsg.user_id === msg.user_id && 
                  (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000);

                const isSameSenderAsNext = nextMsg && nextMsg.user_id === msg.user_id && 
                  (new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime() < 5 * 60 * 1000);

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
                    
                    <div className={`flex items-end gap-2.5 ${isOwn ? 'justify-end' : 'justify-start'} ${isSameSenderAsPrev ? 'mt-0.5' : 'mt-3'}`}>
                      
                      {/* Avatar left side (only for other users, and only for the LAST message in a consecutive group) */}
                      {!isOwn && (
                        <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                          {!isSameSenderAsNext ? (
                            senderProfile.avatar_url ? (
                              <img
                                src={senderProfile.avatar_url}
                                alt={senderProfile.username}
                                className="w-7 h-7 rounded-full object-cover border border-zinc-100 dark:border-zinc-900"
                              />
                            ) : (
                              <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getAvatarBg(senderProfile.username)} text-[10px] font-bold text-white flex items-center justify-center uppercase shadow-sm`}>
                                {senderProfile.username.charAt(0)}
                              </div>
                            )
                          ) : (
                            <div className="w-7" /> // Spacer to preserve alignment
                          )}
                        </div>
                      )}

                      {/* Message bubble block */}
                      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                        
                        {/* Username (only for other users, and only on the FIRST message of a group) */}
                        {!isOwn && !isSameSenderAsPrev && (
                          <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mb-1 ml-1 select-none">
                            {senderProfile.username}
                          </span>
                        )}

                        {/* Bubble */}
                        <div
                          className={`rounded-2xl px-4 py-2.5 ${
                            isOwn
                              ? `bg-blue-500 dark:bg-blue-600 text-white ${isSameSenderAsPrev ? 'rounded-r-md' : 'rounded-tr-md'} ${isSameSenderAsNext ? 'rounded-br-md' : 'rounded-br-2xl'}`
                              : `bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-50 dark:border-zinc-900/50 ${isSameSenderAsPrev ? 'rounded-l-md' : 'rounded-tl-md'} ${isSameSenderAsNext ? 'rounded-bl-md' : 'rounded-bl-2xl'}`
                          }`}
                        >
                          {msg.file_type === 'image' && msg.file_url && (
                            <img src={msg.file_url} alt="shared file" className="max-w-full max-h-64 rounded-lg object-contain my-1 select-none" />
                          )}
                          {msg.file_type === 'file' && msg.file_url && (
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-xs font-semibold underline py-1 ${isOwn ? 'text-blue-100' : 'text-blue-500'}`}
                            >
                              📎 {msg.file_name || 'Attached File'}
                            </a>
                          )}
                          {msg.content && (
                            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          )}
                        </div>

                        {/* Time (Only show if NOT followed by another message from same sender within 5 mins) */}
                        {!isSameSenderAsNext && (
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 mx-1 select-none font-medium">
                            {formatTime(msg.created_at)}
                          </span>
                        )}
                      </div>

                      {/* Avatar right side (optional/skipped for own user, Instagram doesn't show own avatar next to bubble) */}
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message Input (Instagram Capsule Style) */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 bg-white dark:bg-black flex-shrink-0 z-10">
          <div className="max-w-4xl mx-auto flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-2 bg-white dark:bg-black">
            
            {/* Attachment Inputs */}
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
              className="p-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors cursor-pointer text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
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
              className="p-1 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors cursor-pointer text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 mr-1"
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
              placeholder="Message..."
              className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 outline-none border-0 py-1"
            />

            {uploading && (
              <span className="text-[10px] text-zinc-400 font-bold animate-pulse mr-2 select-none">Sending file...</span>
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
                  className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 cursor-pointer"
                  title="Voice Message"
                >
                  <Mic size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewMessage("❤️");
                  }}
                  className="p-1 text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer"
                  title="Send Love"
                >
                  <Heart size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
