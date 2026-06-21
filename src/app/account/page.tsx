"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User, Shield, Key, Database, ArrowLeft, CheckCircle2, Globe, Sparkles, Sun, Moon, LogOut, ToggleLeft, ToggleRight, Laptop, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { ensureUserProfile, DEFAULT_AVATARS, UserProfile } from '@/utils/supabase/profile-helper';
import { useOverlay } from '@/context/OverlayContext';

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Database stats state
  const [stats, setStats] = useState({ scoresCount: 0, calendarNotesCount: 0 });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Active section state
  const [activeSection, setActiveSection] = useState<string>('account');

  // Overlay context
  const { dockingEnabled, setDockingEnabled } = useOverlay();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light';
    setTheme(initialTheme);
  }, []);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.dispatchEvent(new Event('theme-change'));
  };

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setEmail(user.email || null);

      // Load Profile
      const { profile: userProfile, isFallback: fallback } = await ensureUserProfile(supabase, user.id, user.email || null);
      if (userProfile) {
        setProfile(userProfile);
        setUsernameInput(userProfile.username);
        setBioInput(userProfile.bio || '');
        setAvatarInput(userProfile.avatar_url || '');
        setIsFallback(fallback);
      }

      // Load Statistics
      try {
        const { data: scores } = await supabase
          .from('dashboard_scores')
          .select('content')
          .eq('user_id', user.id)
          .eq('title', 'main_scores')
          .maybeSingle();

        const { data: calendar } = await supabase
          .from('dashboard_calendar')
          .select('content')
          .eq('user_id', user.id)
          .eq('title', 'main_calendar')
          .maybeSingle();

        let scoresCount = 0;
        if (scores?.content?.scores) {
          const ialScores = Object.keys(scores.content.scores.IAL || {}).length;
          const igcseScores = Object.keys(scores.content.scores.IGCSE || {}).length;
          scoresCount = ialScores + igcseScores;
        }

        let calendarNotesCount = 0;
        if (calendar?.content?.calendarData) {
          calendarNotesCount = Object.values(calendar.content.calendarData).filter(v => !!v).length;
        }

        setStats({ scoresCount, calendarNotesCount });
      } catch (err) {
        console.error('Failed to load user stats:', err);
      }
    }
    loadUserData();
  }, [router, supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileMessage(null);
    setIsSavingProfile(true);

    if (!usernameInput || usernameInput.length < 3) {
      setProfileError('Username must be at least 3 characters.');
      setIsSavingProfile(false);
      return;
    }

    const cleanUsername = usernameInput.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    const updatedProfile: UserProfile = {
      id: profile!.id,
      username: cleanUsername,
      bio: bioInput,
      avatar_url: avatarInput
    };

    if (isFallback) {
      const { saveLocalProfileFallback } = await import('@/utils/supabase/profile-helper');
      saveLocalProfileFallback(updatedProfile);
      setProfile(updatedProfile);
      setProfileMessage('Profile updated locally! (Run Supabase SQL migration to sync public profiles).');
    } else {
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert(updatedProfile);

      if (updateError) {
        if (updateError.message.includes('unique constraint') || updateError.message.includes('duplicate key')) {
          setProfileError('Username is already taken. Please try another one.');
        } else {
          setProfileError(updateError.message);
        }
      } else {
        setProfile(updatedProfile);
        setProfileMessage('Profile updated successfully.');
      }
    }
    setIsSavingProfile(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    setLoadingPassword(true);

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      setLoadingPassword(false);
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      setLoadingPassword(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setPasswordError(updateError.message);
    } else {
      setPasswordMessage('Password updated successfully.');
      setPassword('');
      setConfirmPassword('');
    }
    setLoadingPassword(false);
  };

  const renderAvatar = (urlOrGradient: string, sizeClass = "h-16 w-16") => {
    const isGradient = urlOrGradient && urlOrGradient.startsWith('linear-gradient');
    if (isGradient) {
      return (
        <div 
          className={`${sizeClass} rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0`}
          style={{ background: urlOrGradient }}
        />
      );
    }
    return (
      <img 
        src={urlOrGradient || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150'} 
        alt="Avatar"
        className={`${sizeClass} rounded-full object-cover border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0`}
        onError={(e) => {
          e.currentTarget.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150';
        }}
      />
    );
  };

  const menuSections = [
    {
      title: "General",
      items: [
        { id: "account", label: "Account" },
        { id: "permissions", label: "Permissions" },
        { id: "appearance", label: "Appearance" },
        { id: "notifications", label: "Notifications" },
        { id: "models", label: "Models" },
        { id: "customizations", label: "Customizations" },
        { id: "browser", label: "Browser" },
        { id: "tab", label: "Tab" },
        { id: "editor", label: "Editor" }
      ]
    },
    {
      title: "Workspaces",
      items: [
        { id: "ailevels", label: "AILevels" },
        { id: "offlineai2", label: "OfflineAI-2" }
      ]
    }
  ];

  return (
    <div className="flex-1 w-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        
        {/* Navigation and Actions Row */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            {profile && (
              <Link
                href={`/user/${profile.username}`}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded text-xs font-bold transition-all uppercase tracking-wider"
              >
                <Globe size={14} />
                View Public Profile
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 dark:border-red-950/20 text-red-655 hover:bg-red-50 dark:hover:bg-red-955/20 rounded text-xs font-bold transition-all cursor-pointer uppercase tracking-wider"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Master Two-Pane Layout */}
        <div className="flex flex-col md:flex-row gap-8 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden min-h-[650px] shadow-sm">
          
          {/* LEFT SIDEBAR: SECTIONS */}
          <aside className="w-full md:w-60 bg-zinc-50 dark:bg-[#14161b] border-r border-zinc-200 dark:border-zinc-900 p-4 shrink-0 flex flex-col space-y-6">
            {menuSections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                <div className="px-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 select-none">
                  {section.title}
                </div>
                <div className="flex flex-col space-y-0.5">
                  {section.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide cursor-pointer transition-all ${
                        activeSection === item.id
                          ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 font-black'
                          : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 dark:text-zinc-450 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* RIGHT PANEL: SETTINGS DETAILS */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[750px]">
            
            {/* 1. ACCOUNT SECTION */}
            {activeSection === 'account' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Profile Settings</h2>
                  <p className="text-xs text-zinc-400 mt-1">Configure your public Precision Edu identity card and credentials.</p>
                </div>

                {isFallback && (
                  <div className="p-4 text-xs border border-amber-200/80 bg-amber-50 dark:bg-amber-955/10 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded flex flex-col gap-1.5">
                    <span className="font-bold flex items-center gap-1"><Sparkles size={13} /> Supabase Database Notice</span>
                    <p>Your database profile table is not available yet. Changes will persist inside local storage.</p>
                  </div>
                )}

                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Identity card edit */}
                    <div className="bg-white dark:bg-[#181a20] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 shadow-sm">
                      <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                        <User size={18} className="text-zinc-455" />
                        <h3 className="font-bold text-xs uppercase tracking-wide">Public Card Identity</h3>
                      </div>

                      {profileError && <div className="p-3 text-xs bg-red-50 text-red-700 dark:bg-red-955/10 dark:text-red-300 rounded">{profileError}</div>}
                      {profileMessage && (
                        <div className="p-3 text-xs bg-green-50 text-green-700 dark:bg-green-955/10 dark:text-green-300 rounded flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-green-600" />
                          {profileMessage}
                        </div>
                      )}

                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center py-2">
                          {renderAvatar(avatarInput, "h-14 w-14")}
                          <div className="space-y-1.5 flex-1 w-full">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400">Profile Presets</label>
                            <div className="flex flex-wrap gap-1.5">
                              {DEFAULT_AVATARS.map((gradient, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => setAvatarInput(gradient)}
                                  className={`h-6 w-6 rounded-full cursor-pointer transition-all border ${avatarInput === gradient ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 border-transparent scale-105' : 'border-zinc-200 dark:border-zinc-800 hover:scale-105'}`}
                                  style={{ background: gradient }}
                                />
                              ))}
                            </div>
                            <div className="pt-1">
                              <input
                                type="url"
                                value={avatarInput.startsWith('linear-gradient') ? '' : avatarInput}
                                onChange={(e) => setAvatarInput(e.target.value)}
                                placeholder="Or paste custom image URL..."
                                className="w-full px-3 py-1 border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-xs rounded focus:outline-none focus:border-zinc-400"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Username Handle</label>
                            <input
                              type="text"
                              value={usernameInput}
                              onChange={(e) => setUsernameInput(e.target.value)}
                              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:border-zinc-400"
                              placeholder="student_hero"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Email (Private)</label>
                            <div className="px-3 py-2 rounded border border-zinc-200 dark:border-zinc-850 bg-zinc-100 dark:bg-zinc-900 text-xs font-semibold text-zinc-400 truncate">
                              {email || 'student@precisionedu.io'}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Bio Description</label>
                          <textarea
                            value={bioInput}
                            onChange={(e) => setBioInput(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:border-zinc-400 resize-none"
                            placeholder="Tell other students about your goals..."
                          />
                        </div>

                        <button type="submit" disabled={isSavingProfile} className="btn-notion-black font-bold text-[10px] uppercase tracking-wider px-4 py-2 cursor-pointer">
                          {isSavingProfile ? 'Saving...' : 'Save Profile'}
                        </button>
                      </form>
                    </div>

                    {/* Security section */}
                    <div className="bg-white dark:bg-[#181a20] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 shadow-sm">
                      <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                        <Key size={18} className="text-zinc-455" />
                        <h3 className="font-bold text-xs uppercase tracking-wide">Security</h3>
                      </div>

                      {passwordError && <div className="p-3 text-xs bg-red-50 text-red-700 dark:bg-red-955/10 dark:text-red-300 rounded">{passwordError}</div>}
                      {passwordMessage && (
                        <div className="p-3 text-xs bg-green-50 text-green-700 dark:bg-green-955/10 dark:text-green-300 rounded flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-green-600" />
                          {passwordMessage}
                        </div>
                      )}

                      <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">New Password</label>
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
                              placeholder="••••••••"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Confirm Password</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-3 py-2 rounded border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none"
                              placeholder="••••••••"
                              required
                            />
                          </div>
                        </div>
                        <button type="submit" disabled={loadingPassword} className="btn-notion-blue px-4 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer">
                          {loadingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Sidebar stats & Preview Card */}
                  <div className="space-y-6">
                    {profile && (
                      <div className="bg-white dark:bg-[#181a20] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 text-center shadow-sm">
                        <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest text-left">Card Preview</div>
                        <div className="flex flex-col items-center py-1 space-y-3">
                          {renderAvatar(avatarInput, "h-16 w-16")}
                          <div>
                            <div className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                              @{usernameInput.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || 'username'}
                            </div>
                            <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">student pass</div>
                          </div>
                          <p className="text-xs text-zinc-500 max-w-xs line-clamp-3 italic px-1">
                            "{bioInput || 'No bio description set yet.'}"
                          </p>
                          <div className="grid grid-cols-2 gap-4 w-full pt-3 border-t border-zinc-100 dark:border-zinc-900">
                            <div>
                              <div className="text-sm font-extrabold">{stats.scoresCount}</div>
                              <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Sittings</div>
                            </div>
                            <div>
                              <div className="text-sm font-extrabold">{stats.calendarNotesCount}</div>
                              <div className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Tasks</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white dark:bg-[#181a20] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 shadow-sm text-xs">
                      <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-900">
                        <Database size={16} />
                        <h4 className="font-bold">Sync Stats</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between font-bold py-1 border-b border-zinc-50 dark:border-zinc-900">
                          <span className="text-zinc-450 uppercase text-[9px] tracking-wide">Tracked Sittings</span>
                          <span>{stats.scoresCount}</span>
                        </div>
                        <div className="flex justify-between font-bold py-1">
                          <span className="text-zinc-455 uppercase text-[9px] tracking-wide">Calendar Notes</span>
                          <span>{stats.calendarNotesCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. APPEARANCE SECTION (Includes Theme & Docking Toggle!) */}
            {activeSection === 'appearance' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Appearance</h2>
                  <p className="text-xs text-zinc-400 mt-1">Configure layout preferences, display modes, and docking controls.</p>
                </div>

                <div className="space-y-6">
                  {/* Theme display Mode */}
                  <div className="bg-white dark:bg-[#181a20] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                      <Sun size={18} className="dark:hidden" />
                      <Moon size={18} className="hidden dark:block" />
                      <h3 className="font-bold text-xs uppercase tracking-wide">Display Mode</h3>
                    </div>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => handleThemeChange('light')}
                        className={`flex-1 py-3 px-4 rounded border text-xs font-bold uppercase tracking-wider cursor-pointer text-center transition-all ${
                          theme === 'light'
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black font-extrabold shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 dark:text-zinc-400'
                        }`}
                      >
                        Light Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => handleThemeChange('dark')}
                        className={`flex-1 py-3 px-4 rounded border text-xs font-bold uppercase tracking-wider cursor-pointer text-center transition-all ${
                          theme === 'dark'
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black font-extrabold shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-850 dark:text-zinc-400'
                        }`}
                      >
                        Dark Mode
                      </button>
                    </div>
                  </div>

                  {/* Docking Controls */}
                  <div className="bg-white dark:bg-[#181a20] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-900">
                      <Laptop size={18} className="text-zinc-455" />
                      <h3 className="font-bold text-xs uppercase tracking-wide">Note & Past Paper Docking</h3>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-900 rounded-lg">
                      <div className="space-y-1 pr-4">
                        <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200 block">Enable Window Docking Overlay</span>
                        <p className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-normal max-w-lg">
                          When active, closing floating individual notes or past papers will place them into the dock bar at the bottom-right corner. Disabling this hides the dock and fully closes windows upon clicking exit.
                        </p>
                      </div>
                      <button
                        onClick={() => setDockingEnabled(!dockingEnabled)}
                        className="text-zinc-650 dark:text-zinc-350 cursor-pointer"
                        title={dockingEnabled ? "Disable Docking" : "Enable Docking"}
                      >
                        {dockingEnabled ? <ToggleRight size={38} className="text-zinc-900 dark:text-zinc-100" /> : <ToggleLeft size={38} className="text-zinc-400" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. MODELS SECTION (Redesigned matching user's reference mockup!) */}
            {activeSection === 'models' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Models</h2>
                    <p className="text-xs text-zinc-400 mt-1">Configure AI models and view your quota.</p>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-250 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded text-[10px] font-black uppercase tracking-wider cursor-pointer">
                    <RefreshCw size={11} />
                    Refresh
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Model Credits Section */}
                  <div className="bg-white dark:bg-[#181a20] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Model Credits</div>
                    <div className="flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-900 rounded-lg">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs uppercase tracking-wide block">Enable AI Credit Overages</span>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal max-w-md">
                          When toggled on, Precision Edu will use your AI credits to fulfill model requests once you're out of model quota.
                        </p>
                      </div>
                      <button className="text-zinc-400 cursor-pointer">
                        <ToggleLeft size={32} />
                      </button>
                    </div>
                  </div>

                  {/* Model Quota Section */}
                  <div className="bg-white dark:bg-[#181a20] border border-zinc-200 dark:border-zinc-900 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Model Quota</div>
                    
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-900 space-y-3.5">
                      {[
                        { name: "Gemini 3.5 Flash (Medium)", limit: "Refreshes in 3 hours, 15 minutes", progress: 45 },
                        { name: "Gemini 3.5 Flash (High)", limit: "Refreshes in 3 hours, 15 minutes", progress: 20 },
                        { name: "Gemini 3.5 Flash (Low)", limit: "Refreshes in 3 hours, 15 minutes", progress: 85 },
                        { name: "Gemini 3.1 Pro (Low)", limit: "Refreshes in 3 hours, 15 minutes", progress: 60 },
                        { name: "Claude Sonnet 4.6 (Thinking)", limit: "Refreshes in 4 days, 11 hours", progress: 10 },
                        { name: "Claude Opus 4.6 (Thinking)", limit: "Refreshes in 4 days, 11 hours", progress: 5 }
                      ].map((model, index) => (
                        <div key={index} className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold">
                          <div className="space-y-1">
                            <span className="font-bold uppercase text-[10px] text-zinc-800 dark:text-zinc-200 block">{model.name}</span>
                            <div className="w-36 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full" style={{ width: `${model.progress}%` }} />
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase text-zinc-450 dark:text-zinc-500">{model.limit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. OTHER SECTIONS (Mock settings) */}
            {activeSection !== 'account' && activeSection !== 'appearance' && activeSection !== 'models' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-wide text-zinc-900 dark:text-zinc-100">
                    {menuSections.flatMap(s => s.items).find(i => i.id === activeSection)?.label || "Settings"}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">Configure preference layouts and customized behaviors.</p>
                </div>

                <div className="bg-white dark:bg-[#181a20] border border-zinc-200 dark:border-zinc-900 rounded-xl p-8 text-center space-y-3 shadow-sm">
                  <Database size={32} className="mx-auto text-zinc-400 opacity-60" />
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">Settings Section</h3>
                  <p className="text-[10px] text-zinc-500 max-w-xs mx-auto leading-normal uppercase tracking-wide font-semibold">
                    Configuration settings for {activeSection} are loaded automatically from your workspace environment context.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
