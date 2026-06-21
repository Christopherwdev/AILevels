"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { OverlayProvider } from '@/context/OverlayContext';
import OverlayWindowsManager from './OverlayWindowsManager';
import Dock from './Dock';
import { createClient } from '@/utils/supabase/client';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Lock, X } from 'lucide-react';

export default function OverlayWrapper({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeAuthPopup, setActiveAuthPopup] = useState(false);

  // Form states for the popup modal
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Monitor auth state changes
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Intercept interactions for unauthenticated users
  useEffect(() => {
    if (loading || user) {
      setActiveAuthPopup(false);
      return;
    }

    const handleInteraction = (e: Event) => {
      if (activeAuthPopup) return;

      const target = e.target as HTMLElement;
      if (!target) return;

      // Find if the event target is inside the <main> element
      const mainEl = document.querySelector('main');
      if (!mainEl || !mainEl.contains(target)) return;

      const path = window.location.pathname;
      const isPastPapersPage = path.startsWith('/past-papers');
      const isHomePage = path === '/';

      if (isHomePage) return;

      if (isPastPapersPage) {
        // Only trigger auth popup if writing answers in the textarea
        const isTextarea = target.tagName === 'TEXTAREA';
        if (isTextarea) {
          e.preventDefault();
          e.stopPropagation();
          if ('blur' in target) (target as any).blur();
          setActiveAuthPopup(true);
        }
        return;
      }

      // On all other dashboard pages:
      const tagName = target.tagName;
      const isInteractive = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(tagName) || target.closest('button');
      
      if (isInteractive) {
        e.preventDefault();
        e.stopPropagation();
        if ('blur' in target) (target as any).blur();
        setActiveAuthPopup(true);
      }
    };

    document.addEventListener('focusin', handleInteraction, true);
    document.addEventListener('click', handleInteraction, true);

    return () => {
      document.removeEventListener('focusin', handleInteraction, true);
      document.removeEventListener('click', handleInteraction, true);
    };
  }, [loading, user, activeAuthPopup]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setFormLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields.');
      setFormLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      setFormLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
        } else if (data?.user?.identities?.length === 0) {
          setError('This email is already registered. Try logging in.');
        } else {
          // Bypassing confirmation step: immediately attempt login
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            setMessage('Account created! Please check your email to confirm and log in.');
          } else {
            // Success: state listener will update user and close modal automatically
            router.refresh();
          }
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
        } else {
          // Success: state listener will update user and close modal automatically
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred.');
    } finally {
      setFormLoading(false);
    }
  };

  // Determine if path is protected
  const showAuthPopup = !loading && !user && activeAuthPopup;

  return (
    <OverlayProvider>
      <div className={showAuthPopup ? 'auth-blur-active flex flex-col min-h-screen w-full' : 'flex flex-col min-h-screen w-full'}>
        {children}
        <OverlayWindowsManager />
        <Dock />
      </div>

      {/* Modern, Creative Apple-style Gateway Popup */}
      {showAuthPopup && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveAuthPopup(false);
            }
          }}
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/30 dark:bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-300"
        >
          <div className="w-full max-w-sm bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-3xl p-8 relative z-10 transition-all duration-300 animate-in zoom-in-95 duration-250 text-center">
            
            <button 
              onClick={() => setActiveAuthPopup(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-850 cursor-pointer"
            >
              <X size={16} />
            </button>
            
            <div className="mb-6 flex items-center justify-center gap-1.5 select-none">
              <img
                src="/Precision Logo.svg"
                alt="Precision Logo"
                className="h-8 w-auto dark:invert"
              />
              <span className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Edu
              </span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center justify-center gap-2">
              <Lock size={16} className="text-zinc-400" />
              Portal Access
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              {isSignUp 
                ? 'Register your email to unlock all tools' 
                : 'Sign in to access your dashboard, papers, and notes'
              }
            </p>

            {error && (
              <div className="mt-4 p-3 text-[11px] border border-red-200/60 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-300 rounded-lg text-left">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-4 p-3 text-[11px] border border-green-200/60 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 rounded-lg text-left">
                {message}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 mt-6">
              <div className="text-left">
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition text-xs text-zinc-900 dark:text-white"
                  placeholder="student@example.com"
                  required
                />
              </div>

              <div className="text-left">
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition text-xs text-zinc-900 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              {isSignUp && (
                <div className="text-left animate-in slide-in-from-top-2 duration-150">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-zinc-400">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-955/60 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition text-xs text-zinc-900 dark:text-white"
                    placeholder="••••••••"
                    required={isSignUp}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-2.5 mt-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-100 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {formLoading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                {!formLoading && <ArrowRight size={12} />}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-zinc-200/50 dark:border-zinc-800/50">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setMessage(null);
                }}
                className="text-[10px] uppercase tracking-wider font-bold hover:underline text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 cursor-pointer"
              >
                {isSignUp ? 'Already have an account? Sign In' : "New to Precision? Register"}
              </button>
            </div>

          </div>
        </div>
      )}
    </OverlayProvider>
  );
}
