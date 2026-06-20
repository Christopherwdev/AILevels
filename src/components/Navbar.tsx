"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import { LogOut, Sun, Moon, FileText, Layout, User, ChevronDown, Calendar, Settings } from 'lucide-react';
import { ensureUserProfile } from '@/utils/supabase/profile-helper';

interface NavbarProps {
  userEmail: string | null;
}

export default function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

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

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  };

  if (pathname && pathname.startsWith('/past-papers/viewer')) {
    return null;
  }

  return (
    <nav className="w-full bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 bg-clip-text text-transparent transition-all duration-300 group-hover:opacity-90">
                Precision Edu
              </span>
            </Link>

            {/* Navigation Links (Visible only when logged in) */}
            {userEmail && (
              <div className="hidden md:flex items-center gap-6">
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    pathname.startsWith('/dashboard')
                      ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 pb-1 mt-0.5'
                      : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  <Layout size={14} />
                  Dashboard
                </Link>
                <Link
                  href="/calendar"
                  className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    pathname.startsWith('/calendar')
                      ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 pb-1 mt-0.5'
                      : 'text-zinc-500 hover:text-zinc-955 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  <Calendar size={14} />
                  Calendar
                </Link>
                <Link
                  href="/past-papers"
                  className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    pathname.startsWith('/past-papers')
                      ? 'text-zinc-900 dark:text-zinc-100 border-b-2 border-zinc-900 dark:border-zinc-100 pb-1 mt-0.5'
                      : 'text-zinc-500 hover:text-zinc-955 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  <FileText size={14} />
                  Past Papers
                </Link>
              </div>
            )}
          </div>

          {/* Right Side Panel */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
 
            {/* User Session Interface */}
            {userEmail ? (
              <div className="flex items-center gap-3">
                {/* Mobile Navigation Dropdown/Buttons */}
                <div className="md:hidden flex gap-1">
                  <Link
                    href="/dashboard"
                    className={`p-2 border border-zinc-200 dark:border-zinc-850 rounded ${
                      pathname.startsWith('/dashboard') ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-955' : 'bg-transparent text-zinc-500'
                    }`}
                  >
                    <Layout size={16} />
                  </Link>
                  <Link
                    href="/calendar"
                    className={`p-2 border border-zinc-200 dark:border-zinc-850 rounded ${
                      pathname.startsWith('/calendar') ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-955' : 'bg-transparent text-zinc-500'
                    }`}
                  >
                    <Calendar size={16} />
                  </Link>
                  <Link
                    href="/past-papers"
                    className={`p-2 border border-zinc-200 dark:border-zinc-850 rounded ${
                      pathname.startsWith('/past-papers') ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-955' : 'bg-transparent text-zinc-500'
                    }`}
                  >
                    <FileText size={16} />
                  </Link>
                  <Link
                    href={username ? `/user/${username}` : '/account'}
                    className={`p-2 border border-zinc-200 dark:border-zinc-850 rounded ${
                      pathname.startsWith('/user/') || pathname.startsWith('/account') ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-955' : 'bg-transparent text-zinc-500'
                    }`}
                  >
                    <User size={16} />
                  </Link>
                </div>
 
                {/* Account Dropdown */}
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-zinc-200 dark:border-zinc-850 rounded text-xs font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider text-zinc-850 dark:text-zinc-150 btn-notion-white"
                  >
                    <span>Account</span>
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
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            handleSignOut();
                          }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                        >
                          <LogOut size={14} />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
 
                {/* Mobile Sign Out (Fallback) */}
                <button
                  onClick={handleSignOut}
                  className="sm:hidden flex items-center justify-center p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-150 rounded text-red-600 cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
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
