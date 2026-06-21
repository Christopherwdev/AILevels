"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { CheckCircle2, LogOut, ToggleLeft, ToggleRight, Sun, Moon } from 'lucide-react';
import { ensureUserProfile, DEFAULT_AVATARS, UserProfile } from '@/utils/supabase/profile-helper';
import { useOverlay } from '@/context/OverlayContext';
import Avatar from '@/components/Avatar';

const SECTIONS = [
  { id: 'profile',    label: 'Profile' },
  { id: 'security',  label: 'Security' },
  { id: 'appearance',label: 'Appearance' },
];

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClient();
  const { dockingEnabled, setDockingEnabled } = useOverlay();

  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeSection, setActiveSection] = useState('profile');

  // ── Load theme ──
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved === 'dark' || (!saved && prefersDark) ? 'dark' : 'light');
  }, []);

  const applyTheme = (t: 'light' | 'dark') => {
    setTheme(t);
    localStorage.setItem('theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    window.dispatchEvent(new Event('theme-change'));
  };

  // ── Load user data ──
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }
      setEmail(user.email ?? null);
      const { profile: p, isFallback: fb } = await ensureUserProfile(supabase, user.id, user.email ?? null);
      if (p) {
        setProfile(p);
        setUsernameInput(p.username);
        setBioInput(p.bio ?? '');
        setAvatarInput(p.avatar_url ?? '');
        setIsFallback(fb);
      }
    })();
  }, [router, supabase]);

  // ── Handlers ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Max 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setAvatarInput(ev.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null); setProfileMessage(null); setIsSavingProfile(true);
    if (usernameInput.length < 3) { setProfileError('Username must be at least 3 characters.'); setIsSavingProfile(false); return; }
    const cleanUsername = usernameInput.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    const updated: UserProfile = { id: profile!.id, username: cleanUsername, bio: bioInput, avatar_url: avatarInput };
    if (isFallback) {
      const { saveLocalProfileFallback } = await import('@/utils/supabase/profile-helper');
      saveLocalProfileFallback(updated);
      setProfile(updated);
      setProfileMessage('Saved locally.');
    } else {
      const { error } = await supabase.from('profiles').upsert(updated);
      if (error) setProfileError(error.message.includes('unique') ? 'Username already taken.' : error.message);
      else { setProfile(updated); setProfileMessage('Profile saved.'); }
    }
    setIsSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null); setPasswordMessage(null); setLoadingPassword(true);
    if (password !== confirmPassword) { setPasswordError('Passwords do not match.'); setLoadingPassword(false); return; }
    if (password.length < 6) { setPasswordError('Minimum 6 characters.'); setLoadingPassword(false); return; }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setPasswordError(error.message);
    else { setPasswordMessage('Password updated.'); setPassword(''); setConfirmPassword(''); }
    setLoadingPassword(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  // ── Shared style tokens ──
  const inp = "w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded text-xs bg-transparent focus:outline-none focus:border-zinc-500 dark:focus:border-zinc-500 transition-colors";
  const lbl = "block text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1";
  const btn = "px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-bold rounded hover:opacity-90 transition cursor-pointer disabled:opacity-40";
  const msg = (color: 'green' | 'red') => `flex items-center gap-1.5 p-2.5 text-xs rounded ${color === 'green' ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'}`;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm">

      {/* ── Sticky left sidebar ── */}
      <aside className="w-44 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col py-4 px-2 overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-3 mb-2">Settings</p>

        <nav className="flex flex-col gap-0.5 flex-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-2 rounded text-xs font-medium cursor-pointer transition-colors ${
                activeSection === s.id
                  ? 'bg-zinc-100 dark:bg-zinc-900 font-semibold text-zinc-950 dark:text-zinc-50'
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </aside>

      {/* ── Scrollable right panel ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto py-8 px-6 space-y-8">

          {/* ── PROFILE ── */}
          {activeSection === 'profile' && (
            <section className="space-y-6">
              <div>
                <h1 className="text-base font-bold">Profile</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Your public name, photo, and bio.</p>
              </div>

              {profileError  && <div className={msg('red')}>{profileError}</div>}
              {profileMessage && <div className={msg('green')}><CheckCircle2 size={13}/>{profileMessage}</div>}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <Avatar avatarUrl={avatarInput} username={profile?.username} sizeClass="h-12 w-12" textSizeClass="text-base font-bold" />
                  <div className="flex flex-col gap-1.5">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="avatar-file" />
                    <label htmlFor="avatar-file" className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-medium cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900 transition w-fit">
                      Upload photo
                    </label>
                    {avatarInput && (
                      <button type="button" onClick={() => setAvatarInput('')} className="text-[10px] text-red-500 hover:underline cursor-pointer text-left">
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Gradient presets */}
                <div>
                  <label className={lbl}>Or pick a gradient</label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_AVATARS.map((g, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setAvatarInput(g)}
                        className={`h-6 w-6 rounded-full cursor-pointer transition-all hover:scale-110 ${avatarInput === g ? 'ring-2 ring-offset-1 ring-zinc-900 dark:ring-zinc-100 dark:ring-offset-zinc-950 scale-110' : ''}`}
                        style={{ background: g }}
                      />
                    ))}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className={lbl}>Username</label>
                  <input type="text" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} className={inp} placeholder="your_handle" required />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className={lbl}>Email</label>
                  <div className="px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-900">
                    {email ?? '—'}
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className={lbl}>Bio</label>
                  <textarea value={bioInput} onChange={e => setBioInput(e.target.value)} rows={2} className={inp} placeholder="A short description…" />
                </div>

                <button type="submit" disabled={isSavingProfile} className={btn}>
                  {isSavingProfile ? 'Saving…' : 'Save profile'}
                </button>
              </form>
            </section>
          )}

          {/* ── SECURITY ── */}
          {activeSection === 'security' && (
            <section className="space-y-6">
              <div>
                <h1 className="text-base font-bold">Security</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Change your account password.</p>
              </div>

              {passwordError   && <div className={msg('red')}>{passwordError}</div>}
              {passwordMessage && <div className={msg('green')}><CheckCircle2 size={13}/>{passwordMessage}</div>}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className={lbl}>New password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inp} placeholder="••••••••" required />
                </div>
                <div>
                  <label className={lbl}>Confirm password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inp} placeholder="••••••••" required />
                </div>
                <button type="submit" disabled={loadingPassword} className={btn}>
                  {loadingPassword ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </section>
          )}

          {/* ── APPEARANCE ── */}
          {activeSection === 'appearance' && (
            <section className="space-y-6">
              <div>
                <h1 className="text-base font-bold">Appearance</h1>
                <p className="text-xs text-zinc-400 mt-0.5">Theme and interface preferences.</p>
              </div>

              {/* Theme */}
              <div className="space-y-2">
                <label className={lbl}>Theme</label>
                <div className="flex gap-2">
                  {(['light', 'dark'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => applyTheme(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded border text-xs font-medium cursor-pointer transition-all ${
                        theme === t
                          ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                      }`}
                    >
                      {t === 'light' ? <Sun size={13}/> : <Moon size={13}/>}
                      {t === 'light' ? 'Light' : 'Dark'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-zinc-100 dark:border-zinc-800" />

              {/* Note overlay toggle */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium">Quick note overlay</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Show a floating note editor button on every page.
                  </p>
                </div>
                <button
                  onClick={() => setDockingEnabled(!dockingEnabled)}
                  className="cursor-pointer shrink-0"
                >
                  {dockingEnabled
                    ? <ToggleRight size={32} className="text-zinc-900 dark:text-zinc-100"/>
                    : <ToggleLeft  size={32} className="text-zinc-300 dark:text-zinc-600"/>}
                </button>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
