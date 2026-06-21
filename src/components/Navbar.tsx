"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LogOut, Sun, Moon, FileText, Layout, User, ChevronDown, Calendar, Settings, BookOpen, MessageCircle, GraduationCap, NotebookText } from 'lucide-react';
import { ensureUserProfile } from '@/utils/supabase/profile-helper';
import { subjects, getSubjectIcon } from '@/utils/subjects';
import { useOverlay } from '@/context/OverlayContext';
import Avatar from '@/components/Avatar';

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
  const [isEmbedded, setIsEmbedded] = useState(false);
  const overlay = useOverlay();

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  };

  const [isNotesMenuOpen, setIsNotesMenuOpen] = useState(false);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const notesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.self !== window.top) {
      setIsEmbedded(true);
    }
  }, []);

  // Close notes menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notesMenuRef.current && !notesMenuRef.current.contains(e.target as Node)) {
        setIsNotesMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotesMenu = async () => {
    const nextState = !isNotesMenuOpen;
    setIsNotesMenuOpen(nextState);
    if (nextState && userEmail) {
      const { data } = await supabase
        .from('notes')
        .select('id, title, color')
        .order('updated_at', { ascending: false })
        .limit(5);
      if (data) {
        setRecentNotes(data);
      }
    }
  };



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

  if (isEmbedded) return null;

  const renderAvatar = (urlOrGradient: string | null, sizeClass = "h-6 w-6") => {
    return <Avatar avatarUrl={urlOrGradient} username={username} sizeClass={sizeClass} textSizeClass="text-[10px] font-bold" />;
  };

  if (pathname && pathname.startsWith('/past-papers/viewer')) {
    return null;
  }

  const navLinkClass = (path: string) =>
    `flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors pt-1 pb-1 border-b-2 ${
      pathname.startsWith(path)
        ? 'text-zinc-900 dark:text-zinc-100 border-zinc-900 dark:border-zinc-100'
        : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 border-transparent'
    }`;

  const mobileLinkClass = (path: string) =>
    `p-2 rounded ${
      pathname.startsWith(path) ? 'bg-zinc-150 text-zinc-950 dark:bg-zinc-850 dark:text-zinc-50' : 'bg-transparent text-zinc-500'
    }`;

  return (
    <nav className="w-full bg-transparent dark:bg-black-200 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-1.5 group">
              <img
                src="/Precision Logo.svg"
                alt="Precision Logo"
                className="h-6 w-auto transition-all duration-300 group-hover:opacity-90"
              />
              <span className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300">
                Edu
              </span>
            </Link>

            {/* Navigation Links (Visible always, regardless of session) */}
            <div className="hidden lg:flex items-center gap-6">
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
                  className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer pt-1 pb-1 border-b-2 ${
                    pathname.startsWith('/learn')
                      ? 'text-zinc-900 dark:text-zinc-100 border-zinc-900 dark:border-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 border-transparent'
                  }`}
                >
                  <BookOpen size={14} />
                  Learn
                  <ChevronDown size={12} className={`transition-transform duration-200 ${isLearnMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isLearnMenuOpen && (
                  <>
                    {/* Dropdown Backdrop */}
                    <div className="fixed inset-0 z-[99] bg-transparent cursor-default animate-none" onClick={() => setIsLearnMenuOpen(false)} />
                    <div className="absolute left-0 mt-3 w-56 bg-white border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 z-[100] shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
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
                  </>
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
            </div>
          </div>

          {/* Right Side Panel */}
          <div className="flex items-center gap-4">
            {/* Mobile Navigation Dropdown/Buttons */}
            <div className="lg:hidden flex gap-1">
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
              {userEmail && (
                <Link
                  href={username ? `/user/${username}` : '/account'}
                  className={mobileLinkClass('/user/')}
                >
                  <User size={16} />
                </Link>
              )}
            </div>

            {/* User Session Interface */}
            {userEmail ? (
              <div className="flex items-center gap-3">
                {/* Account Dropdown */}
                <div className="relative hidden sm:block z-45">
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
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors border-t border-zinc-100 dark:border-zinc-800 cursor-pointer"
                        >
                          <LogOut size={14} />
                          Log out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              pathname !== '/auth' && (
                <Link
                  href="/auth"
                  className="px-4 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded text-lg font-bold tracking-wider transition-all duration-200 btn-notion-black"
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
