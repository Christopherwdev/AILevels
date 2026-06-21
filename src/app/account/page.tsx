"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User, Shield, Key, Database, ArrowLeft, CheckCircle2, Globe, Sparkles, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { ensureUserProfile, DEFAULT_AVATARS, UserProfile } from '@/utils/supabase/profile-helper';

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

      // Load Statistics (Count how many dashboard scores / calendar entries exist)
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

    // Clean username (alphanumeric and underscores only, lowercase)
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

  return (
    <div className="flex-1 w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        
        {/* Navigation and Actions Row */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          {profile && (
            <Link
              href={`/user/${profile.username}`}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded text-xs font-bold transition-all"
            >
              <Globe size={14} />
              View Public Profile
            </Link>
          )}
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Profile & Account Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Customize your public Precision Edu card and secure your login details.
          </p>
        </div>

        {isFallback && (
          <div className="p-4 text-xs border border-amber-200/80 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded flex flex-col gap-1.5">
            <span className="font-bold flex items-center gap-1"><Sparkles size={13} /> Supabase Database Notice</span>
            <p>
              Your database has not been migrated to support the <strong>profiles</strong> table yet. 
              Changes will save to your browser's local storage instead. 
              Execute the SQL script in your Supabase SQL Editor to make your profile visible to other students!
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          
          {/* LEFT PANELS: PROFILE EDITING & SECURITY */}
          <div className="md:col-span-2 space-y-6">
            
            {/* PROFILE SECTION */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-6 space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold">Public Card Identity</h3>
                  <p className="text-xs text-zinc-500">Edit how other students see your profile</p>
                </div>
              </div>

              {profileError && (
                <div className="p-4 text-xs bg-red-50 border border-red-200 text-red-700 dark:bg-red-955/20 dark:border-red-900 dark:text-red-300 rounded">
                  {profileError}
                </div>
              )}

              {profileMessage && (
                <div className="p-4 text-xs bg-green-50 border border-green-200 text-green-700 dark:bg-green-955/20 dark:border-green-900 dark:text-green-300 rounded flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600" />
                  {profileMessage}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                
                {/* Profile Picture / Avatar Editor */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center py-2">
                  {renderAvatar(avatarInput, "h-16 w-16")}
                  <div className="space-y-2 flex-1 w-full">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select Profile Color Presets</label>
                    <div className="flex flex-wrap gap-2">
                      {DEFAULT_AVATARS.map((gradient, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setAvatarInput(gradient)}
                          className={`h-7 w-7 rounded-full cursor-pointer transition-all border ${avatarInput === gradient ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 border-transparent scale-105' : 'border-zinc-200 dark:border-zinc-800 hover:scale-105'}`}
                          style={{ background: gradient }}
                          title={`Preset Gradient ${index + 1}`}
                        />
                      ))}
                    </div>
                    <div className="pt-1">
                      <input
                        type="url"
                        value={avatarInput.startsWith('linear-gradient') ? '' : avatarInput}
                        onChange={(e) => setAvatarInput(e.target.value)}
                        placeholder="Or paste custom image URL (e.g. from Discord or Unsplash)..."
                        className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs focus:outline-none focus:border-zinc-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">
                      Username (Precision Edu handle)
                    </label>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full px-4 py-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 text-sm"
                      placeholder="e.g. student_hero"
                      required
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">Lowercase, numbers, and underscores only</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">
                      Account Email
                    </label>
                    <div className="px-4 py-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 text-sm font-medium text-zinc-400 truncate">
                      {email || 'student@precisionedu.io'}
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">Primary email is private and locked</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">
                    Bio Description
                  </label>
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 text-sm resize-none"
                    placeholder="Tell other students about your study goals, subjects, or revision milestones..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="disabled:opacity-50 btn-notion-black font-bold text-xs px-5 py-2.5 cursor-pointer uppercase tracking-wider"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile Card'}
                </button>
              </form>
            </div>

            {/* PASSWORD UPDATE SECTION */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-6">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800 mb-4">
                <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                  <Key size={18} />
                </div>
                <div>
                  <h3 className="font-bold">Security & Authentication</h3>
                  <p className="text-xs text-zinc-500">Update your account password</p>
                </div>
              </div>

              {passwordError && (
                <div className="mb-4 p-4 text-xs bg-red-50 border border-red-200 text-red-700 dark:bg-red-955/20 dark:border-red-900 dark:text-red-300 rounded">
                  {passwordError}
                </div>
              )}

              {passwordMessage && (
                <div className="mb-4 p-4 text-xs bg-green-50 border border-green-200 text-green-700 dark:bg-green-955/20 dark:border-green-900 dark:text-green-300 rounded flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-600" />
                  {passwordMessage}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-zinc-500 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-955 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingPassword}
                  className="disabled:opacity-50 btn-notion-blue px-5 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  {loadingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* THEME & APPEARANCE SECTION */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                  <Sun className="h-5 w-5 dark:hidden" />
                  <Moon className="h-5 w-5 hidden dark:block" />
                </div>
                <div>
                  <h3 className="font-bold">Theme & Appearance</h3>
                  <p className="text-xs text-zinc-500">Toggle between light and dark display modes</p>
                </div>
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
          </div>

          {/* RIGHT COLUMN: PREVIEW CARD & SYSTEM STATS */}
          <div className="space-y-6">
            
            {/* Instagram Card Preview */}
            {profile && (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-6 space-y-4 text-center">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-left">Live Preview Card</div>
                <div className="flex flex-col items-center py-2 space-y-3">
                  {renderAvatar(avatarInput, "h-20 w-20")}
                  <div>
                    <div className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1">
                      @{usernameInput.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() || 'username'}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-widest font-semibold">Student card</div>
                  </div>
                  <p className="text-xs text-zinc-500 max-w-xs line-clamp-3 italic px-2">
                    "{bioInput || 'No bio description set yet.'}"
                  </p>
                  
                  {/* Grid of stats */}
                  <div className="grid grid-cols-2 gap-4 w-full pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div>
                      <div className="text-lg font-extrabold">{stats.scoresCount}</div>
                      <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Sittings</div>
                    </div>
                    <div>
                      <div className="text-lg font-extrabold">{stats.calendarNotesCount}</div>
                      <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Tasks</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sync statistics */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="h-10 w-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="font-bold">Sync Statistics</h3>
                  <p className="text-xs text-zinc-500">Live database rows</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-zinc-50 dark:border-zinc-900">
                  <span className="text-xs font-semibold text-zinc-500 uppercase">Tracked Scores</span>
                  <span className="text-sm font-extrabold">{stats.scoresCount}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-zinc-50 dark:border-zinc-900">
                  <span className="text-xs font-semibold text-zinc-500 uppercase">Calendar Notes</span>
                  <span className="text-sm font-extrabold">{stats.calendarNotesCount}</span>
                </div>
              </div>
            </div>

            {/* Security notice */}
            <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-6 text-xs text-zinc-500 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
                <Shield size={14} />
                <span>Security Notice</span>
              </div>
              <p>
                Your session is secured using industry-standard JSON Web Tokens (JWT) encrypted and stored directly in secure cookies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
