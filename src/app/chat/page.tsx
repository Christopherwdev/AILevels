"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Send, ChevronLeft, Calendar, MessageSquare } from 'lucide-react';
import Avatar from '@/components/Avatar';

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  room: string;
  content: string;
  created_at: string;
}

interface TutorContact {
  id: string;
  name: string;
  avatar: string;
  role: string;
  status: 'pending' | 'approved';
}

const tutorsList = [
  { id: 'tutor-caris', name: 'Caris Ng', avatar: '🧑‍🔬', role: 'Maths & Physics Tutor' },
  { id: 'tutor-toby', name: 'Toby Leung', avatar: '👨‍⚕️', role: 'IELTS & Vet Prep Tutor' }
];

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('Anonymous');
  const [activeRoom, setActiveRoom] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);

  // Booked tutors contacts
  const [contacts, setContacts] = useState<TutorContact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Authentication and contacts fetch (based on tutor_bookings)
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

      // Fetch bookings from Supabase table tutor_bookings
      const { data: bookings } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('user_id', user.id);

      // Merge Supabase bookings and local fallback to determine active tutor DMs
      const bookedTutorsSet = new Set<string>();
      const statuses: Record<string, 'pending' | 'approved'> = {};

      if (bookings) {
        bookings.forEach((b: any) => {
          bookedTutorsSet.add(b.tutor_id);
          statuses[b.tutor_id] = b.status as 'pending' | 'approved';
        });
      }

      // Read local storage booked list in case Supabase setup is pending
      try {
        const savedLocal = localStorage.getItem('precision_edu_booked_tutors');
        if (savedLocal) {
          const parsed = JSON.parse(savedLocal);
          parsed.forEach((p: any) => {
            bookedTutorsSet.add(p.tutorId);
            if (!statuses[p.tutorId]) {
              statuses[p.tutorId] = 'pending';
            }
          });
        }
      } catch (err) {
        console.error(err);
      }

      // Filter global list to only show tutors they reached out to
      const userContacts: TutorContact[] = tutorsList
        .filter(t => bookedTutorsSet.has(t.id))
        .map(t => ({
          ...t,
          status: statuses[t.id] || 'pending'
        }));

      setContacts(userContacts);

      // Set default active room from query parameter or first contact
      const tutorParam = searchParams.get('tutor');
      if (tutorParam && tutorsList.some(t => t.id === tutorParam)) {
        setActiveRoom(tutorParam);
      } else if (userContacts.length > 0) {
        setActiveRoom(userContacts[0].id);
      }

      setLoading(false);
    }
    init();
  }, [supabase, searchParams]);

  // Fetch messages + real-time channel subscription
  useEffect(() => {
    if (!userId || !activeRoom) return;

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

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userId || !activeRoom) return;
    const content = newMessage.trim();
    setNewMessage('');

    const optimisticId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      user_id: userId,
      username,
      room: activeRoom,
      content,
      created_at: now,
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    const { data } = await supabase
      .from('chat_messages')
      .insert({ user_id: userId, username, room: activeRoom, content })
      .select()
      .single();

    if (data) {
      setMessages(prev => prev.map(m => m.id === optimisticId ? data : m));
    }
  };

  const activeContact = contacts.find(c => c.id === activeRoom);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-800 dark:border-t-zinc-100 animate-spin" />
          <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-550">Loading chat...</p>
        </div>
      </div>
    );
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen flex bg-white dark:bg-black overflow-hidden font-sans">
      {/* Sidebar list */}
      <aside className={`${showSidebar ? 'w-full md:w-80' : 'w-0 overflow-hidden'} flex-shrink-0 border-r border-zinc-100 dark:border-zinc-900 flex flex-col transition-all duration-300 bg-white dark:bg-black`}>
        <div className="p-5 border-b border-zinc-50 dark:border-zinc-950 flex flex-col gap-1">
          <h2 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Tutor Chat
          </h2>
          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Direct Messages</p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar py-3">
          {contacts.length === 0 ? (
            <div className="px-5 py-8 text-center space-y-3 select-none">
              <MessageSquare size={24} className="text-zinc-400 mx-auto" />
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">No Chat Contacts</p>
              <p className="text-[10px] text-zinc-400 leading-normal max-w-[200px] mx-auto">
                Reach out to tutors or book slots on the Tutors page to open chat access.
              </p>
              <button
                onClick={() => router.push('/tutors')}
                className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition"
              >
                Find Tutors
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {contacts.map(contact => {
                const isSelected = activeRoom === contact.id;
                return (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setActiveRoom(contact.id);
                      if (window.innerWidth < 768) setShowSidebar(false);
                    }}
                    className={`w-full flex items-center gap-3 px-5 py-3 transition-all text-left border-r-2 ${
                      isSelected
                        ? 'bg-blue-50/50 dark:bg-zinc-900/60 font-bold border-blue-500'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/20 text-zinc-755 dark:text-zinc-305 border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                      {contact.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-150 truncate leading-tight">
                          {contact.name}
                        </span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                          contact.status === 'approved'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                        }`}>
                          {contact.status}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-400 font-medium block mt-0.5 truncate">
                        {contact.role}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Status */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 flex items-center gap-3 bg-white dark:bg-black select-none">
          <Avatar avatarUrl={null} username={username} sizeClass="w-9 h-9" textSizeClass="text-xs font-bold" />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate leading-none">
              {username}
            </p>
            <p className="text-[8px] text-zinc-450 truncate mt-1">Logged in</p>
          </div>
        </div>
      </aside>

      {/* Messaging Area */}
      <main className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 relative min-w-0">
        {activeContact ? (
          <>
            {/* Contact Header */}
            <div className="h-14 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between px-4 bg-white dark:bg-black select-none">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden p-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-lg shrink-0">
                  {activeContact.avatar}
                </div>
                <div className="text-left min-w-0">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate leading-tight">
                    {activeContact.name}
                  </h3>
                  <p className="text-[9px] text-zinc-400 truncate mt-0.5">
                    {activeContact.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
              {messages.map((msg) => {
                const isOwn = msg.user_id === userId;
                return (
                  <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                    {!isOwn && (
                      <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 select-none">
                        {activeContact.avatar}
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 select-none justify-between">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wide">
                          {isOwn ? 'You' : msg.username}
                        </span>
                        <span className="text-[8px] text-zinc-450">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed break-words whitespace-pre-wrap text-left ${
                        isOwn
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 rounded-tl-none text-zinc-800 dark:text-zinc-200'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white dark:bg-black border-t border-zinc-150 dark:border-zinc-900">
              <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-250/60 dark:border-zinc-800 rounded-xl px-3 py-2 max-w-4xl mx-auto">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder={`Message ${activeContact.name}...`}
                  className="flex-1 bg-transparent border-none focus:outline-none text-xs text-zinc-900 dark:text-zinc-100 resize-none max-h-24 pr-2.5"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
            <MessageSquare size={36} className="text-zinc-400 mb-3" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">No Active Chat selected</h3>
            <p className="text-xs text-zinc-450 max-w-xs leading-normal">
              Select one of your booked tutors from the sidebar list to start exchanging messages.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
