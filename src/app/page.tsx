import React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import { FileText, Calendar, MessageSquare, BookOpen, ArrowRight } from 'lucide-react';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex-grow w-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center font-sans selection:bg-zinc-900 dark:selection:bg-white selection:text-white dark:selection:text-black">
      {/* Hero Section */}
      <section className="w-full max-w-5xl px-6 pt-20 pb-16 text-center flex flex-col items-center">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 mb-8 select-none">
          <img
            src="/Precision Logo.svg"
            alt="Precision Logo"
            className="h-10 w-auto dark:invert transition-all duration-300"
          />
          <span className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Edu
          </span>
        </div>

        {/* Large Apple-style Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-3xl mb-6 text-zinc-900 dark:text-white">
          Study at the speed of thought.
        </h1>

        {/* Simplistic Subtext */}
        <p className="text-base sm:text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed mb-10">
          A unified, high-performance workspace for past papers, scheduling, markdown notes, and study groups. Built for Pearson Edexcel IAL & IGCSE.
        </p>

        {/* Catchy CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {user ? (
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-100 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              Enter Dashboard
              <ArrowRight size={13} />
            </Link>
          ) : (
            <Link
              href="/auth"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-100 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              Start Revision
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="w-full max-w-5xl px-6 pb-24 grid sm:grid-cols-2 gap-6">
        {/* Past Papers */}
        <Link href="/past-papers" className="group block p-8 rounded-2xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/20 hover:border-zinc-200 dark:hover:border-zinc-800 transition-all hover:-translate-y-0.5 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
              <FileText size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Fast Query</span>
          </div>
          <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white">Past Paper Engine</h3>
          <p className="text-xs text-zinc-555 dark:text-zinc-400 leading-relaxed">
            Filter, search, and load any question paper or mark scheme in a high-fidelity split-screen viewer with built-in timers.
          </p>
        </Link>

        {/* Calendar */}
        <Link href="/calendar" className="group block p-8 rounded-2xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/20 hover:border-zinc-200 dark:hover:border-zinc-800 transition-all hover:-translate-y-0.5 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
              <Calendar size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Scheduler</span>
          </div>
          <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white">Revision Planner</h3>
          <p className="text-xs text-zinc-555 dark:text-zinc-400 leading-relaxed">
            Map out mock exams, track paper sittings, and log UMS grades with interactive dashboard statistics.
          </p>
        </Link>

        {/* Notes */}
        <Link href="/notes" className="group block p-8 rounded-2xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/20 hover:border-zinc-200 dark:hover:border-zinc-800 transition-all hover:-translate-y-0.5 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
              <BookOpen size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Markdown</span>
          </div>
          <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white">Workspace Notes</h3>
          <p className="text-xs text-zinc-555 dark:text-zinc-400 leading-relaxed">
            Create beautiful markdown-based study guides, class notes, and summaries in a distraction-free environment.
          </p>
        </Link>

        {/* Chat */}
        <Link href="/chat" className="group block p-8 rounded-2xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-950/20 hover:border-zinc-200 dark:hover:border-zinc-800 transition-all hover:-translate-y-0.5 duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200">
              <MessageSquare size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-550">Realtime</span>
          </div>
          <h3 className="text-lg font-bold mb-2 text-zinc-900 dark:text-white">Syllabus Chat</h3>
          <p className="text-xs text-zinc-555 dark:text-zinc-400 leading-relaxed">
            Join Revision Groups or launch Direct Messages with search to discuss questions and share exam tips.
          </p>
        </Link>
      </section>

      {/* Subtle Footer */}
      <footer className="w-full border-t border-zinc-100 dark:border-zinc-900 py-8 text-center text-[10px] text-zinc-400 select-none">
        <p>&copy; {new Date().getFullYear()} Precision Edu. All rights reserved.</p>
      </footer>
    </div>
  );
}
