import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/server';
import { Layout, FileText, ArrowRight, Shield, CheckCircle, User } from 'lucide-react';

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex-1 w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 relative overflow-hidden transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 relative z-10">
        {/* Hero Banner Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-none mb-6 flex justify-center">
            <Image
              src="/Unipro logo.svg"
              alt="unipro"
              width={210}
              height={64}
              priority
              className="h-16 sm:h-20 w-auto object-contain"
            />
            <span className="sr-only">unipro Study Station</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            A minimalist, high-performance toolkit for advanced students. Track performance progress, examine grade metrics, and query past papers.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {user ? (
              <div className="flex gap-4">
                <Link
                  href="/dashboard"
                  className="px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer btn-notion-black"
                >
                  Open Dashboard
                </Link>
                <Link
                  href="/past-papers"
                  className="px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer btn-notion-white"
                >
                  Search Past Papers
                </Link>
              </div>
            ) : (
              <Link
                href="/auth"
                className="flex items-center gap-2 px-8 py-3.5 text-xs font-bold uppercase tracking-widest transition-all btn-notion-black"
              >
                Sign In to Platform
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </div>
 
        {/* Feature Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          {/* Card 1: Dashboard */}
          <div className="portal-card rounded-md p-8 flex flex-col justify-between group h-full">
            <div>
              <div className="h-12 w-12 border border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-955 flex items-center justify-center mb-6 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900 transition-colors">
                <Layout size={20} />
              </div>
              <h3 className="text-xl font-bold tracking-tight uppercase mb-3">Score & Calendar Dashboard</h3>
              <p className="text-sm text-zinc-555 dark:text-zinc-400 leading-relaxed mb-6 text-left">
                Keep track of your mock results and UMS marks across units. Calculate mean metrics, analyze grade distribution curves, and maintain a study syllabus using the integrated calendar planner.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider border-b border-zinc-900 dark:border-zinc-100 w-max pb-1 group-hover:gap-3 transition-all"
            >
              Access Dashboard
              <ArrowRight size={13} />
            </Link>
          </div>
 
          {/* Card 2: Past Papers */}
          <div className="portal-card rounded-md p-8 flex flex-col justify-between group h-full">
            <div>
              <div className="h-12 w-12 border border-zinc-200 dark:border-zinc-800 rounded bg-zinc-50 dark:bg-zinc-955 flex items-center justify-center mb-6 group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-zinc-100 dark:group-hover:text-zinc-900 transition-colors">
                <FileText size={20} />
              </div>
              <h3 className="text-xl font-bold tracking-tight uppercase mb-3">Past Paper Engine</h3>
              <p className="text-sm text-zinc-555 dark:text-zinc-400 leading-relaxed mb-6 text-left">
                Filter and query a comprehensive library of Edexcel IAL and IGCSE examination materials. Open question papers and mark schemes inside our integrated high-contrast document viewer.
              </p>
            </div>
            <Link
              href="/past-papers"
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider border-b border-zinc-900 dark:border-zinc-100 w-max pb-1 group-hover:gap-3 transition-all"
            >
              Search Documents
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
 
        {/* Informational Section */}
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 rounded-md p-8 max-w-4xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-sm">
            <Shield size={16} className="text-zinc-500" />
            <span>Secure Database Integration</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 text-xs text-zinc-500 leading-normal text-left">
            <div className="space-y-1">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <CheckCircle size={12} className="text-zinc-400" /> Auto Sync
              </span>
              <p>Scores and calendar entries are synced automatically to your account in the background.</p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <CheckCircle size={12} className="text-zinc-400" /> Data Privacy
              </span>
              <p>Under Supabase RLS, only you can view or edit your database rows.</p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <CheckCircle size={12} className="text-zinc-400" /> Secure Access
              </span>
              <p>Past paper viewer and marking schemes are restricted to logged-in students.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
