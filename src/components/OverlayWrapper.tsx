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
            setError(signInError.message);
          } else {
            router.push('/dashboard');
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
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-8 relative z-10 transition-all duration-300 text-center">
            
            <button 
              onClick={() => setActiveAuthPopup(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X size={16} />
            </button>
            
            <div className="mb-6 flex items-center justify-center gap-1.5 select-none">
              <img
                src="/Precision Logo.svg"
                alt="Precision Logo"
                className="h-8 w-auto dark:invert"
              />
              <span className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                Edu
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h1>
          

            {error && (
              <div className="mt-4 p-4 text-xs border border-red-200/60 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded flex flex-col gap-1 text-left">
                <span className="font-bold">Error</span>
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="mt-4 p-4 text-xs border border-green-200/60 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 rounded flex flex-col gap-1 text-left">
                <span className="font-bold">Notice</span>
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4 mt-6">
              <div className="text-left">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-zinc-500 dark:text-zinc-400">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition text-sm text-zinc-850 dark:text-zinc-150"
                  placeholder="student@example.com"
                  required
                />
              </div>

              <div className="text-left">
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-zinc-500 dark:text-zinc-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition text-sm text-zinc-850 dark:text-zinc-150"
                  placeholder="••••••••"
                  required
                />
              </div>

              {isSignUp && (
                <div className="text-left animate-in slide-in-from-top-2 duration-150">
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-zinc-500 dark:text-zinc-400">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition text-sm text-zinc-850 dark:text-zinc-150"
                    placeholder="••••••••"
                    required={isSignUp}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full h-10 py-10 mt-2 text-2xl font-bold uppercase tracking-wider transition-all duration-200 btn-notion-blue disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {formLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setMessage(null);
                }}
                className="text-xs uppercase tracking-wider font-bold hover:underline text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200 cursor-pointer"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </button>
            </div>

          </div>
        </div>
      )}
    </OverlayProvider>
  );
}
