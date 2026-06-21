"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (!email || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'https://precisionedu.org'
          }
        });

        if (signUpError) {
          setError(signUpError.message);
        } else if (data?.user?.identities?.length === 0) {
          setError('This email is already registered. Try logging in.');
        } else {
          setMessage('Successfully signed up! Please check your email if confirmation is enabled, or log in.');
          setIsSignUp(false);
        }
      } else {
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
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-8 relative z-10 transition-all duration-300">
        <div className="text-center mb-8">
          <div className="mb-6 flex items-center justify-center gap-1.5">
            <img
              src="/Precision Logo.svg"
              alt="Precision Logo"
              className="h-8 w-auto"
            />
            <span className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
              Edu
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-xs text-zinc-505 dark:text-zinc-400 mt-2 text-center">
            {isSignUp 
              ? 'Join the educational hub for A-Level & IGCSE students' 
              : 'Enter your credentials to access study tools'
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 text-xs border border-red-200/60 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 rounded flex flex-col gap-1 text-left">
            <span className="font-bold">Error</span>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 text-xs border border-green-200/60 dark:border-green-900/50 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 rounded flex flex-col gap-1 text-left">
            <span className="font-bold">Notice</span>
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-zinc-500 dark:text-zinc-400 text-left">
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

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-zinc-500 dark:text-zinc-400 text-left">
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
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-zinc-500 dark:text-zinc-400 text-left">
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
            disabled={loading}
            className="w-full py-2.5 mt-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 btn-notion-blue disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
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
  );
}
