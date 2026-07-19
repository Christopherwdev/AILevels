"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Send, Bot, MessageCircle, ArrowLeft } from 'lucide-react';
import Avatar from '@/components/Avatar';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export default function AITeacherPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [username, setUsername] = useState('Student');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.username) setUsername(profile.username);
      }
    }
    loadUser();

    // Default Greeting
    setMessages([
      {
        id: '1',
        sender: 'ai',
        text: 'Hello! I am your AI Revision Teacher. Ask me any study question related to your Edexcel IAL or IGCSE curriculum and I will help explain it!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [supabase]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input.trim();
    setInput('');

    const newMsg: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);

    // AI answer simulation
    setTyping(true);
    setTimeout(() => {
      let aiText = "Interesting question! For Edexcel exams, you should look closely at key vocabulary. Could you specify which subject (Physics, Chemistry, Biology, or Math) and unit this question belongs to?";
      const lower = userText.toLowerCase();

      if (lower.includes('physics') || lower.includes('mechanics')) {
        aiText = "In Physics Mechanics, remember that acceleration is the rate of change of velocity. When dealing with projectile motion, break the motion into horizontal (constant velocity) and vertical (constant acceleration due to gravity g = 9.81m/s²) components.";
      } else if (lower.includes('chemistry') || lower.includes('organic')) {
        aiText = "In Organic Chemistry, always count your carbon atoms carefully. For reaction mechanisms, curly arrows must start from a lone pair of electrons or a bond and point directly to the atom forming the new bond.";
      } else if (lower.includes('math') || lower.includes('integral')) {
        aiText = "In Calculus, integration represents the area under a curve. Don't forget that when doing indefinite integration, you must add the constant of integration (+ C) to represent the family of curves!";
      }

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: 'ai',
          text: aiText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setTyping(false);
    }, 1200);
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="h-14 bg-white dark:bg-black border-b border-zinc-150 dark:border-zinc-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none">AI Teacher</h1>
            <p className="text-[9px] text-zinc-450 mt-0.5">Revise curriculum concepts instantly</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
              <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 select-none">
                {isUser ? '👤' : '🤖'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 justify-between select-none">
                  <span className="text-[9px] font-bold text-zinc-450 uppercase">{isUser ? username : 'AI Teacher'}</span>
                  <span className="text-[8px] text-zinc-400">{msg.timestamp}</span>
                </div>
                <div className={`p-3 rounded-2xl text-xs leading-relaxed break-words text-left ${
                  isUser 
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-850 rounded-tl-none text-zinc-800 dark:text-zinc-200'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center">
            <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold shrink-0">
              🤖
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-850 rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-1.5 font-bold text-zinc-400 select-none">
              <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white dark:bg-black border-t border-zinc-150 dark:border-zinc-900 shrink-0">
        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-250/60 dark:border-zinc-800 rounded-xl px-3 py-2 max-w-4xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask a study question..."
            className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-900 dark:text-zinc-100"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
