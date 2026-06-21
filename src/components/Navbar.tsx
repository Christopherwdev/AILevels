"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LogOut, Sun, Moon, FileText, Layout, User, ChevronDown, Calendar, Settings, BookOpen, MessageCircle, GraduationCap } from 'lucide-react';
import { ensureUserProfile } from '@/utils/supabase/profile-helper';
import { subjects, getSubjectIcon } from '@/utils/subjects';

interface NavbarProps {
  userEmail: string | null;
}

export default function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLearnMenuOpen, setIsLearnMenuOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const learnMenuRef = useRef<HTMLDivElement>(null);

  // Fetch username dynamically
  useEffect(() => {
    if (!userEmail) {
      setUsername(null);
      return;
    }
    async function fetchUsername() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { profile } = await ensureUserProfile(supabase, user.id, user.email || null);
        if (profile) {
          setUsername(profile.username);
          setAvatarUrl(profile.avatar_url || null);
        }
      }
    }
    fetchUsername();
  }, [userEmail, supabase]);

  // Load and apply theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light';
    
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Listen to theme changes from Settings page
  useEffect(() => {
    const syncTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setTheme(savedTheme);
      }
    };
    window.addEventListener('theme-change', syncTheme);
    return () => window.removeEventListener('theme-change', syncTheme);
  }, []);

  // Close learn menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (learnMenuRef.current && !learnMenuRef.current.contains(e.target as Node)) {
        setIsLearnMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const renderAvatar = (urlOrGradient: string | null, sizeClass = "h-6 w-6") => {
    if (!urlOrGradient) {
      return (
        <div className={`${sizeClass} rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-650 dark:text-zinc-400 border border-black shrink-0`}>
          {username ? username.charAt(0).toUpperCase() : 'U'}
        </div>
      );
    }
    const isGradient = urlOrGradient.startsWith('linear-gradient');
    if (isGradient) {
      return (
        <div 
          className={`${sizeClass} rounded-full border border-black  shrink-0`}
          style={{ background: urlOrGradient }}
        />
      );
    }
    return (
      <img 
        src={urlOrGradient} 
        alt="Avatar"
        className={`${sizeClass} rounded-full object-cover border border-zinc-200 dark:border-zinc-850 shadow-sm shrink-0`}
        onError={(e) => {
          e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150';
        }}
      />
    );
  };

  if (pathname && pathname.startsWith('/past-papers/viewer')) {
    return null;
  }

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
      pathname.startsWith(path)
        ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 pb-1 mt-0.5'
        : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
    }`;

  const mobileLinkClass = (path: string) =>
    `p-2 rounded ${
      pathname.startsWith(path) ? 'bg-zinc-150 text-zinc-950 dark:bg-zinc-850 dark:text-zinc-50' : 'bg-transparent text-zinc-500'
    }`;

  return (
    <nav className="w-full bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-1.5 group">
              <span className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent transition-all duration-300 group-hover:opacity-90">
                Precision
              </span>
              <span className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300">
                Edu
              </span>
            </Link>

            {/* Navigation Links (Visible only when logged in) */}
            {userEmail && (
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className={navLinkClass('/dashboard')}>
                  <Layout size={14} />
                  Dashboard
                </Link>
                <Link href="/calendar" className={navLinkClass('/calendar')}>
                  <Calendar size={14} />
                  Calendar
                </Link>

                {/* Learn Dropdown */}
                <div ref={learnMenuRef} className="relative">
                  <button
                    onClick={() => setIsLearnMenuOpen(!isLearnMenuOpen)}
                    className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      pathname.startsWith('/learn')
                        ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 pb-1 mt-0.5'
                        : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
                    }`}
                  >
                    <BookOpen size={14} />
                    Learn
                    <ChevronDown size={12} className={`transition-transform duration-200 ${isLearnMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isLearnMenuOpen && (
                    <div className="absolute left-0 mt-3 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 z-50 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">IAL Subjects</div>
                      {subjects.filter(s => s.level === 'IAL').map(s => {
                        const ItemIcon = getSubjectIcon(s.iconName);
                        return (
                          <Link
                            key={s.slug}
                            href={`/learn/${s.slug}`}
                            onClick={() => setIsLearnMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <div className="w-5 h-5 rounded-full flex items-center justify-center border border-black flex-shrink-0" style={{ backgroundColor: s.color }}>
                              <ItemIcon size={10} className="text-white" />
                            </div>
                            {s.name}
                          </Link>
                        );
                      })}
                      <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />
                      <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">IGCSE Subjects</div>
                      {subjects.filter(s => s.level === 'IGCSE').map(s => {
                        const ItemIcon = getSubjectIcon(s.iconName);
                        return (
                          <Link
                            key={s.slug}
                            href={`/learn/${s.slug}`}
                            onClick={() => setIsLearnMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                          >
                            <div className="w-5 h-5 rounded-full flex items-center justify-center border border-black flex-shrink-0" style={{ backgroundColor: s.color }}>
                              <ItemIcon size={10} className="text-white" />
                            </div>
                            {s.name}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Link href="/past-papers" className={navLinkClass('/past-papers')}>
                  <FileText size={14} />
                  Past Papers
                </Link>
                <Link href="/chat" className={navLinkClass('/chat')}>
                  <MessageCircle size={14} />
                  Chat
                </Link>
                <Link href="/notes" className={navLinkClass('/notes')}>
                  <FileText size={14} />
                  Notes
                </Link>
                {/* Tutors (Hidden for now)
                <Link href="/tutors" className={navLinkClass('/tutors')}>
                  <GraduationCap size={14} />
                  Tutors
                </Link>
                */}
              </div>
            )}
          </div>

          {/* Right Side Panel */}
          <div className="flex items-center gap-4">
 
            {/* User Session Interface */}
            {userEmail ? (
              <div className="flex items-center gap-3">
                {/* Mobile Navigation Dropdown/Buttons */}
                <div className="md:hidden flex gap-1">
                  <Link href="/dashboard" className={mobileLinkClass('/dashboard')}>
                    <Layout size={16} />
                  </Link>
                  <Link href="/calendar" className={mobileLinkClass('/calendar')}>
                    <Calendar size={16} />
                  </Link>
                  <Link href="/past-papers" className={mobileLinkClass('/past-papers')}>
                    <FileText size={16} />
                  </Link>
                  <Link href="/chat" className={mobileLinkClass('/chat')}>
                    <MessageCircle size={16} />
                  </Link>
                  <Link href="/notes" className={mobileLinkClass('/notes')}>
                    <FileText size={16} />
                  </Link>
                  {/* Tutors Mobile (Hidden for now)
                  <Link href="/tutors" className={mobileLinkClass('/tutors')}>
                    <GraduationCap size={16} />
                  </Link>
                  */}
                  <Link
                    href={username ? `/user/${username}` : '/account'}
                    className={mobileLinkClass('/user/')}
                  >
                    <User size={16} />
                  </Link>
                </div>
 
                {/* Account Dropdown */}
                <div className="relative hidden sm:block z-40">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 border border-zinc-200 dark:border-zinc-850 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer text-zinc-850 dark:text-zinc-150 hover:bg-zinc-50 dark:hover:bg-zinc-850 relative z-40"
                  >
                    {renderAvatar(avatarUrl, "h-6 w-6")}
                    <span>{username || 'Account'}</span>
                    <ChevronDown size={13} className={`transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
 
                  {isUserMenuOpen && (
                    <>
                      {/* Dropdown Backdrop */}
                      <div className="fixed inset-0 z-30" onClick={() => setIsUserMenuOpen(false)} />
                      
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded py-1 z-40">
                        <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400 font-bold uppercase tracking-wider truncate">
                          {userEmail}
                        </div>
                         <Link
                          href={username ? `/user/${username}` : '/account'}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <User size={14} />
                          My Profile
                        </Link>
                        <Link
                          href="/account"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-t border-zinc-100 dark:border-zinc-800"
                        >
                          <Settings size={14} />
                          Edit Settings
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              pathname !== '/auth' && (
                <Link
                  href="/auth"
                  className="px-4 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded text-xs font-bold tracking-wider transition-all duration-200 btn-notion-black"
                >
                  SIGN IN
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
