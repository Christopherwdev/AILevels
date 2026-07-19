"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ensureUserProfile } from '@/utils/supabase/profile-helper';
import { subjects, getSubjectIcon } from '@/utils/subjects';
import { 
  Home, 
  Layout, 
  Calendar, 
  Crown,
  GraduationCap, 
  MessageCircle, 
  FileText, 
  Settings, 
  LogOut, 
  User, 
  ChevronUp, 
  ChevronDown, 
  Menu, 
  X,
  Lock,
  Mail,
  Key
} from 'lucide-react';
import Avatar from '@/components/Avatar';

interface NavbarProps {
  userEmail: string | null;
}

export default function Navbar({ userEmail }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  if (!userEmail) return null;

  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('free');
  const [currentMode, setCurrentMode] = useState<'IAL' | 'IGCSE'>('IAL');

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLevelMenuOpen, setIsLevelMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Auth Quick Dropdown state
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authProcessing, setAuthProcessing] = useState(false);

  const levelMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const authDropdownRef = useRef<HTMLDivElement>(null);

  // Sync mode with localStorage
  useEffect(() => {
    const saved = localStorage.getItem('precision_edu_mode');
    if (saved === 'IGCSE' || saved === 'IAL') {
      setCurrentMode(saved);
    }
  }, [pathname]);

  const switchLevel = (mode: 'IAL' | 'IGCSE') => {
    setCurrentMode(mode);
    localStorage.setItem('precision_edu_mode', mode);
    setIsLevelMenuOpen(false);
    window.dispatchEvent(new Event('storage'));
    router.refresh();
  };

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (levelMenuRef.current && !levelMenuRef.current.contains(e.target as Node)) {
        setIsLevelMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (authDropdownRef.current && !authDropdownRef.current.contains(e.target as Node)) {
        setIsAuthDropdown(false);
      }
    }
    const setIsAuthDropdown = (val: boolean) => {
      // Helper function matching target scope
      if (!val) setShowAuthDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Profile data fetch
  useEffect(() => {
    if (!userEmail) {
      setUsername(null);
      setSubscriptionStatus('free');
      return;
    }
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { profile } = await ensureUserProfile(supabase, user.id, user.email || null);
        if (profile) {
          setUsername(profile.username);
          setAvatarUrl(profile.avatar_url || null);
          setSubscriptionStatus(profile.subscription_status || 'free');
        }
      }
    }
    fetchProfile();
  }, [userEmail, supabase]);

  const handleSignOut = async () => {
    setIsUserMenuOpen(false);
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  };

  const isLinkActive = (path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/dashboard') return pathname === '/dashboard';
    if (path === '/tutors') return pathname === '/tutors';
    return pathname.startsWith(path);
  };

  const getBadgeText = () => {
    switch (subscriptionStatus) {
      case 'premium': return 'PREMIUM';
      case 'tutor_student': return 'STUDENT';
      default: return 'FREE';
    }
  };

  const getNavLinkClass = (path: string) => {
    const active = isLinkActive(path);
    return `flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
      active
        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 font-bold'
        : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-150'
    }`;
  };

  // Intercept protected paths for unauthenticated users
  const handleLinkClick = (e: React.MouseEvent, path: string, onItemClick?: () => void) => {
    const isProtected = ['/dashboard', '/calendar', '/notes', '/subscription', '/tutors/my', '/chat', '/account'].some(
      p => path === p || path.startsWith(p + '?') || path.startsWith(p + '/')
    );

    if (isProtected && !userEmail) {
      e.preventDefault();
      setShowAuthDropdown(true);
      if (onItemClick) onItemClick(); // Close mobile drawer if open
    } else {
      if (onItemClick) onItemClick();
    }
  };

  // Inline sign in form handler
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthProcessing(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setShowAuthDropdown(false);
      setAuthEmail('');
      setAuthPassword('');
      router.refresh();
    }
    setAuthProcessing(false);
  };

  const renderSubjectSection = (onItemClick?: () => void) => {
    const modeSubjects = subjects.filter((s) => s.level === currentMode);
    return (
      <div className="space-y-0.5">
        {modeSubjects.map((s) => {
          const ItemIcon = getSubjectIcon(s.iconName);
          const active = pathname.startsWith(`/learn/${s.slug}`);
          return (
            <Link
              key={s.slug}
              href={`/learn/${s.slug}`}
              onClick={(e) => handleLinkClick(e, `/learn/${s.slug}`, onItemClick)}
              className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                active
                  ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-bold'
                  : 'text-zinc-550 dark:text-zinc-450 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 hover:text-zinc-900 dark:hover:text-zinc-150'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: s.color }}>
                  <ItemIcon size={7} className="text-white" />
                </div>
                <span className="truncate">{s.name}</span>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  const renderSidebarContent = (onItemClick?: () => void) => {
    return (
      <div className="space-y-4 text-left">
        {/* Section 1: General */}
        <div className="space-y-1">
          <p className="px-2.5 text-[8px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-555">General</p>
          {/* Home link removed for signed in users - dashboard is landing page
          <Link 
            href="/" 
            onClick={(e) => handleLinkClick(e, '/', onItemClick)} 
            className={getNavLinkClass('/')}
          >
            <Home size={13} />
            <span>Home</span>
          </Link>
          */}
          <Link 
            href="/dashboard" 
            onClick={(e) => handleLinkClick(e, '/dashboard', onItemClick)} 
            className={getNavLinkClass('/dashboard')}
          >
            <Layout size={13} />
            <span>Dashboard</span>
          </Link>
          <Link 
            href="/calendar" 
            onClick={(e) => handleLinkClick(e, '/calendar', onItemClick)} 
            className={getNavLinkClass('/calendar')}
          >
            <Calendar size={13} />
            <span>Calendar</span>
          </Link>
          <Link 
            href="/notes" 
            onClick={(e) => handleLinkClick(e, '/notes', onItemClick)} 
            className={getNavLinkClass('/notes')}
          >
            <FileText size={13} />
            <span>Notes</span>
          </Link>
          <Link 
            href="/subscription" 
            onClick={(e) => handleLinkClick(e, '/subscription', onItemClick)} 
            className={getNavLinkClass('/subscription')}
          >
            <Crown size={13} />
            <span>Subscription</span>
          </Link>
        </div>

        {/* Section 2: Tutors */}
        <div className="space-y-1">
          <p className="px-2.5 text-[8px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Tutors</p>
          <Link 
            href="/tutors" 
            onClick={(e) => handleLinkClick(e, '/tutors', onItemClick)} 
            className={getNavLinkClass('/tutors')}
          >
            <GraduationCap size={13} />
            <span>All Tutors</span>
          </Link>
          <Link 
            href="/tutors/my" 
            onClick={(e) => handleLinkClick(e, '/tutors/my', onItemClick)} 
            className={getNavLinkClass('/tutors/my')}
          >
            <Settings size={13} />
            <span>My Tutors</span>
          </Link>
          <Link 
            href="/chat" 
            onClick={(e) => handleLinkClick(e, '/chat', onItemClick)} 
            className={getNavLinkClass('/chat')}
          >
            <MessageCircle size={13} />
            <span>Chat</span>
          </Link>
        </div>

        {/* Section 3: Resources */}
        <div className="space-y-1">
          <p className="px-2.5 text-[8px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Resources</p>
          
          <div className="pl-1 border-l border-zinc-100 dark:border-zinc-800 space-y-0.5 my-1">
            {renderSubjectSection(onItemClick)}
          </div>

          <Link 
            href="/past-papers" 
            onClick={(e) => handleLinkClick(e, '/past-papers', onItemClick)} 
            className={getNavLinkClass('/past-papers')}
          >
            <FileText size={13} />
            <span>Past Papers</span>
          </Link>
        </div>
      </div>
    );
  };

  const renderLevelSelector = () => {
    return (
      <div className="relative shrink-0" ref={levelMenuRef}>
        <button
          onClick={() => setIsLevelMenuOpen(!isLevelMenuOpen)}
          className="flex items-center justify-between w-full px-2.5 py-1.5 border border-zinc-200/80 dark:border-zinc-800 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
              P
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-extrabold text-zinc-900 dark:text-zinc-100 leading-none">
                {currentMode}
              </p>
              <p className="text-[7px] text-zinc-400 font-bold mt-0.5 tracking-wider">A-LEVELS</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[7px] font-black px-1 py-0.5 rounded bg-zinc-100 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-450 border border-zinc-250 dark:border-zinc-700">
              {getBadgeText()}
            </span>
            <div className="flex flex-col text-zinc-400">
              <ChevronUp size={6} />
              <ChevronDown size={6} />
            </div>
          </div>
        </button>

        {isLevelMenuOpen && (
          <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1 animate-in fade-in duration-105">
            <button
              onClick={() => switchLevel('IAL')}
              className={`flex items-center justify-between w-full px-3 py-1.5 text-left text-[10px] font-bold ${
                currentMode === 'IAL' ? 'text-blue-500' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              Edexcel IAL
              {currentMode === 'IAL' && <div className="w-1 h-1 rounded-full bg-blue-500" />}
            </button>
            <button
              onClick={() => switchLevel('IGCSE')}
              className={`flex items-center justify-between w-full px-3 py-1.5 text-left text-[10px] font-bold ${
                currentMode === 'IGCSE' ? 'text-blue-500' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              Edexcel IGCSE
              {currentMode === 'IGCSE' && <div className="w-1 h-1 rounded-full bg-blue-500" />}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderUserProfileBlock = () => {
    if (!userEmail) {
      return (
        <button
          onClick={() => setShowAuthDropdown(!showAuthDropdown)}
          className="w-full py-2 flex items-center justify-center bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-lg text-[10px] font-bold uppercase tracking-wider transition hover:opacity-90 cursor-pointer"
        >
          Sign In
        </button>
      );
    }

    return (
      <div className="relative shrink-0" ref={userMenuRef}>
        <div className="flex items-center justify-between">
          <Link
            href="/account"
            className="flex items-center gap-2 min-w-0 hover:opacity-80 transition"
          >
            <Avatar avatarUrl={avatarUrl} username={username} sizeClass="h-6.5 w-6.5" textSizeClass="text-[9px] font-bold" />
            <div className="min-w-0 text-left">
              <p className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 truncate leading-none">
                {username || 'Student'}
              </p>
              <p className="text-[8px] text-zinc-455 truncate mt-0.5 max-w-[100px]">{userEmail}</p>
            </div>
          </Link>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="p-1 text-zinc-455 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-55 dark:hover:bg-zinc-900 transition cursor-pointer"
          >
            <Settings size={13} />
          </button>
        </div>

        {isUserMenuOpen && (
          <div className="absolute bottom-9 left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 py-1 animate-in fade-in duration-105">
            <Link
              href={username ? `/user/${username}` : '/account'}
              onClick={() => setIsUserMenuOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <User size={12} />
              My Profile
            </Link>
            <Link
              href="/account"
              onClick={() => setIsUserMenuOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Settings size={12} />
              Edit Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 w-full text-left px-3 py-1.5 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition border-t border-zinc-100 dark:border-zinc-800 cursor-pointer"
            >
              <LogOut size={12} />
              Log out
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Desktop Compact Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-52 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 p-3 shrink-0 h-screen sticky top-0 justify-between relative">
        <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar pr-0.5">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 px-1 py-2 select-none border-b border-zinc-100 dark:border-zinc-900 pb-3 mb-1 shrink-0">
            <img src="/Precision Logo.svg" alt="Precision Logo" className="h-5 w-auto dark:invert" />
            <span className="bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">Edu</span>
          </div>
          {renderLevelSelector()}
          {renderSidebarContent()}
        </div>
        <div className="pt-3 border-t border-zinc-150 dark:border-zinc-805">
          {renderUserProfileBlock()}
        </div>

        {/* Dynamic Auth Inline Dropdown Card (Desktop) */}
        {showAuthDropdown && !userEmail && (
          <div 
            ref={authDropdownRef}
            className="absolute left-56 bottom-4 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-2xl z-50 animate-in fade-in slide-in-from-left-4 duration-200 text-left space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Lock size={12} className="text-amber-500" />
                Sign In to Continue
              </h3>
              <button 
                onClick={() => {
                  setShowAuthDropdown(false);
                  setAuthError(null);
                }}
                className="text-zinc-400 hover:text-zinc-650 bg-transparent border-none cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-[10px] text-zinc-450 leading-normal">
              You clicked a student-only workspace feature. Sign in below or use our <Link href="/auth" onClick={() => setShowAuthDropdown(false)} className="text-blue-500 font-bold hover:underline">auth page</Link>.
            </p>

            {authError && (
              <p className="p-2 text-[9px] bg-red-50 dark:bg-red-955/20 text-red-650 rounded">
                {authError}
              </p>
            )}

            <form onSubmit={handleQuickLogin} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 text-zinc-400 w-3.5 h-3.5" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 text-[10px] bg-zinc-50 dark:bg-zinc-800 rounded-lg outline-none border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 text-zinc-400 w-3.5 h-3.5" />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 text-[10px] bg-zinc-50 dark:bg-zinc-800 rounded-lg outline-none border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <button
                type="submit"
                disabled={authProcessing}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-40 cursor-pointer"
              >
                {authProcessing ? 'Signing In...' : 'Quick Sign In'}
              </button>
            </form>
          </div>
        )}
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden flex items-center justify-between h-12 px-4 bg-white dark:bg-zinc-955 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 w-full shrink-0">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-1 text-zinc-550 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-md cursor-pointer"
        >
          <Menu size={18} />
        </button>
        <Link href="/" className="flex items-center gap-1">
          <img src="/Precision Logo.svg" alt="Precision Logo" className="h-4.5 w-auto dark:invert" />
          <span className="bg-zinc-900 text-white dark:bg-zinc-850 dark:text-zinc-100 px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider">Edu</span>
        </Link>
        {userEmail ? (
          <Avatar avatarUrl={avatarUrl} username={username} sizeClass="h-6.5 w-6.5" textSizeClass="text-[9px] font-bold" />
        ) : (
          <button 
            onClick={() => setShowAuthDropdown(!showAuthDropdown)}
            className="text-[9px] font-extrabold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black px-2.5 py-1 rounded cursor-pointer"
          >
            IN
          </button>
        )}
      </header>

      {/* Mobile Sidebar Drawer */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[99999] lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-52 bg-white dark:bg-zinc-955 border-r border-zinc-200 dark:border-zinc-800 p-3 flex flex-col justify-between animate-in slide-in-from-left duration-200">
            <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar">
              {renderLevelSelector()}
              {renderSidebarContent(() => setIsSidebarOpen(false))}
            </div>
            <div className="pt-3 border-t border-zinc-150 dark:border-zinc-800">
              {renderUserProfileBlock()}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Center Popover Auth Dropdown */}
      {showAuthDropdown && !userEmail && (
        <div className="lg:hidden fixed inset-0 z-[999999] bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Lock size={14} className="text-amber-500" />
                Sign In Required
              </h3>
              <button 
                onClick={() => {
                  setShowAuthDropdown(false);
                  setAuthError(null);
                }}
                className="text-zinc-400 hover:text-zinc-650 bg-transparent border-none cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-450 leading-normal">
              You clicked a restricted student dashboard feature. Log in below to access.
            </p>

            {authError && (
              <p className="p-2 text-xs bg-red-50 dark:bg-red-955/20 text-red-650 rounded">
                {authError}
              </p>
            )}

            <form onSubmit={handleQuickLogin} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 text-zinc-400 w-3.5 h-3.5" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 rounded-lg outline-none border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="relative">
                <Key className="absolute left-2.5 top-2.5 text-zinc-400 w-3.5 h-3.5" />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 rounded-lg outline-none border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <button
                type="submit"
                disabled={authProcessing}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition disabled:opacity-40 cursor-pointer"
              >
                {authProcessing ? 'Signing In...' : 'Quick Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
