"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Sparkles, ArrowRight, User, Upload, Check } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { ensureUserProfile, DEFAULT_AVATARS, UserProfile } from '@/utils/supabase/profile-helper';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('A-Levels student using Precision Edu to track exam performance.');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Authenticate user
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.id);
      setEmail(user.email || null);

      // Fetch or create profile
      const { profile } = await ensureUserProfile(supabase, user.id, user.email || null);
      if (profile) {
        // If they already completed onboarding, let them go straight to dashboard
        if (!/_[0-9]{4}$/.test(profile.username)) {
          router.push('/dashboard');
          return;
        }
        
        // Remove random suffix for editing suggestion
        const cleanName = profile.username.replace(/_[0-9]{4}$/, '');
        setUsername(cleanName);
        setAvatar(profile.avatar_url || '');
      }
    }
    checkUser();
  }, [router, supabase]);

  // Validate username availability
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    const delayDebounce = setTimeout(async () => {
      setCheckingUsername(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();
      
      setCheckingUsername(false);
      if (data && data.id !== userId) {
        setUsernameAvailable(false);
      } else {
        setUsernameAvailable(true);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [username, userId, supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Please select an image smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatar(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setError(null);
    setLoading(true);

    if (username.length < 3) {
      setError('Username must be at least 3 characters.');
      setLoading(false);
      return;
    }

    const cleanUsername = username.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();

    if (usernameAvailable === false) {
      setError('Username is already taken.');
      setLoading(false);
      return;
    }

    const updatedProfile: UserProfile = {
      id: userId,
      username: cleanUsername,
      bio,
      avatar_url: avatar || DEFAULT_AVATARS[0],
      subscription_status: 'free'
    };

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert(updatedProfile);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-4 py-8">
      {/* Onboarding Box */}
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center gap-2 mb-6">
          <span className="p-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg text-white">
            <Sparkles size={16} />
          </span>
          <span className="text-xs font-black uppercase tracking-wider text-zinc-550 dark:text-zinc-400">Complete Profile Setup</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Welcome to Precision Edu!</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
          Choose a unique username handle and customize your profile card. Other students will see this username in study groups.
        </p>

        {error && (
          <div className="mb-6 p-4 text-xs border border-red-205/60 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded flex flex-col gap-1 text-left">
            <span className="font-bold">Error</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload Sector */}
          <div className="flex flex-col md:flex-row gap-6 items-center py-4 bg-zinc-50/50 dark:bg-zinc-950/10 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80">
            <Avatar avatarUrl={avatar} username={username || 'User'} sizeClass="h-20 w-20" textSizeClass="text-2xl font-bold" />
            <div className="space-y-3 flex-1 w-full text-left">
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">Profile Picture</label>
              
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="onboarding-avatar-file"
                />
                <label
                  htmlFor="onboarding-avatar-file"
                  className="px-3.5 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 text-xs font-bold rounded-lg hover:opacity-90 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Upload size={14} />
                  Upload Photo
                </label>
                
                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                  >
                    Remove Custom
                  </button>
                )}
              </div>

              <div className="h-px bg-zinc-200/50 dark:bg-zinc-800 my-1" />

              <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-400">Or Select Color Preset</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_AVATARS.map((gradient, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setAvatar(gradient)}
                    className={`h-6 w-6 rounded-full cursor-pointer transition-all border ${avatar === gradient ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 border-transparent scale-110' : 'border-zinc-200 dark:border-zinc-800 hover:scale-105'}`}
                    style={{ background: gradient }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Username Handle Input */}
          <div className="text-left">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-zinc-500 dark:text-zinc-400">
              Username Handle
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="student_hero"
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 focus:outline-none focus:border-zinc-450 dark:focus:border-zinc-600 transition text-sm font-semibold"
                required
              />
              <div className="absolute right-3 top-3">
                {checkingUsername && (
                  <div className="w-4 h-4 border-2 border-zinc-350 border-t-zinc-900 rounded-full animate-spin" />
                )}
                {usernameAvailable === true && (
                  <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                    <Check size={14} /> Available
                  </span>
                )}
                {usernameAvailable === false && (
                  <span className="text-red-500 text-xs font-bold">Taken</span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1.5">
              Only alphanumeric characters and underscores are allowed. Min 3 characters.
            </p>
          </div>

          {/* Bio Input */}
          <div className="text-left">
            <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-zinc-500 dark:text-zinc-400">
              Bio Description
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-955 focus:outline-none focus:border-zinc-450 dark:focus:border-zinc-600 transition text-sm font-semibold min-h-[80px]"
              placeholder="Tell other students about yourself..."
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading || usernameAvailable === false || username.length < 3}
            className="w-full py-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-955 text-xs font-bold uppercase tracking-wider rounded-lg transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
          >
            {loading ? 'Completing Setup...' : 'Finish Setup'}
            <ArrowRight size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
