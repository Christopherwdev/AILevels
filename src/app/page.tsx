"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  Search, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Bookmark,
  RefreshCw,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Lock,
  Check,
  Star,
  Globe
} from 'lucide-react';
import { subjects, getSubjectIcon } from '@/utils/subjects';

interface TimerPreset {
  label: string;
  minutes: number;
  color: string;
}

const TIMER_PRESETS: TimerPreset[] = [
  { label: "Standard Pomodoro", minutes: 25, color: "border-blue-500" },
  { label: "Mathematics Practice", minutes: 60, color: "border-emerald-500" },
  { label: "Physics Calculations", minutes: 45, color: "border-purple-500" },
  { label: "Chemistry Revision", minutes: 30, color: "border-amber-500" },
  { label: "Quick Study Sprint", minutes: 15, color: "border-rose-500" }
];

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('Student');

  // Time & Date
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Good day,');

  // Timer
  const [presetIndex, setPresetIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Typing animation states (unauthenticated)
  const words = ["A levels", "IGCSE"];
  const [wordIndex, setWordIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);

      // Load Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.username) {
        setUsername(profile.username);
      }

      setLoading(false);
    }
    loadData();
  }, [supabase]);

  // Current Clock tick & Greeting logic
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
      setCurrentDate(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
      
      const hr = now.getHours();
      if (hr < 6) {
        setGreeting('Good late night,');
      } else if (hr < 12) {
        setGreeting('Good morning,');
      } else if (hr < 17) {
        setGreeting('Good afternoon,');
      } else if (hr < 21) {
        setGreeting('Good evening,');
      } else {
        setGreeting('Good late night,');
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Timer Tick
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  useEffect(() => {
    setTimeLeft(TIMER_PRESETS[presetIndex].minutes * 60);
    setTimerRunning(false);
  }, [presetIndex]);

  // Typing effect (unauthenticated)
  useEffect(() => {
    if (user) return;
    let timer: NodeJS.Timeout;
    const currentWord = words[wordIndex];

    if (isDeleting) {
      timer = setTimeout(() => {
        setDisplayedText(prev => prev.slice(0, -1));
      }, 70);
    } else {
      timer = setTimeout(() => {
        setDisplayedText(prev => currentWord.slice(0, prev.length + 1));
      }, 120);
    }

    if (!isDeleting && displayedText === currentWord) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayedText === "") {
      setIsDeleting(false);
      setWordIndex(prev => (prev + 1) % words.length);
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, wordIndex, user]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-955">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin" />
      </div>
    );
  }

  // AUTHENTICATED USER: Show Student Dashboard WITH sidebar navbar (Navbar handles user rendering)
  if (user) {
    const currentPreset = TIMER_PRESETS[presetIndex];
    
    const getSubjectCardStyles = (slug: string) => {
      switch (slug) {
        case 'biology':
          return { bg: 'bg-gradient-to-br from-emerald-500 to-teal-600', text: 'text-white' };
        case 'chemistry':
          return { bg: 'bg-gradient-to-br from-purple-500 to-indigo-600', text: 'text-white' };
        case 'physics':
          return { bg: 'bg-gradient-to-br from-rose-500 to-red-600', text: 'text-white' };
        default:
          return { bg: 'bg-gradient-to-br from-sky-500 to-blue-600', text: 'text-white' };
      }
    };

    return (
      <div className="min-h-screen bg-white dark:bg-zinc-955 p-6 space-y-6 select-none font-sans text-left">
        
        {/* Header Greeting */}
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-zinc-400 dark:text-zinc-550 leading-none">{greeting}</h1>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{username}</h2>
          </div>
          <Link
            href="/past-papers"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Search size={12} />
            Search Papers
          </Link>
        </div>

        {/* Dashboard layout */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6 pt-4">
          
          {/* Column 1: Date, Clock & Timer (Stacked) */}
          <div className="space-y-6 flex flex-col justify-start">
            
            {/* Clock Widget */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-32 shrink-0">
              <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_70%_20%,#007AFF,transparent_50%)]" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{currentDate || 'Loading date...'}</p>
                <h2 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-1 font-mono tracking-tight">{currentTime || '00:00:00'}</h2>
              </div>
              <p className="text-[8px] text-zinc-450 font-bold">Precision Clock Sync</p>
            </div>

            {/* Focus Countdown Timer */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-5 flex flex-col items-center justify-between h-44 shrink-0">
              <div className="text-center w-full flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Focus timer</span>
                <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200">{currentPreset.label}</span>
              </div>

              <div className="flex items-center gap-6 my-1">
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100 font-mono tracking-tight">
                  {formatTimer(timeLeft)}
                </div>
                <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-zinc-50 dark:bg-zinc-855 text-zinc-455">
                  {timerRunning ? 'Focusing' : 'Paused'}
                </span>
              </div>

              {/* Timer Controls Row */}
              <div className="flex justify-center items-center gap-3">
                <button
                  onClick={() => setPresetIndex(prev => (prev - 1 + TIMER_PRESETS.length) % TIMER_PRESETS.length)}
                  className="p-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-450 cursor-pointer"
                  title="Previous Preset"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer select-none"
                  title={timerRunning ? 'Pause' : 'Start Focus'}
                >
                  {timerRunning ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  onClick={() => {
                    setTimerRunning(false);
                    setTimeLeft(currentPreset.minutes * 60);
                  }}
                  className="p-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-855 dark:hover:bg-zinc-800 text-zinc-555 dark:text-zinc-455 cursor-pointer"
                  title="Reset Timer"
                >
                  <RotateCcw size={14} />
                </button>
                <button
                  onClick={() => setPresetIndex(prev => (prev + 1) % TIMER_PRESETS.length)}
                  className="p-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-850 dark:hover:bg-zinc-455 cursor-pointer"
                  title="Next Preset"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>
            </div>

          </div>

          {/* Column 2 & 3: Subjects panel */}
          <div className="lg:col-span-2 space-y-4 flex flex-col justify-start">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2 mb-1 shrink-0 select-none">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                <Bookmark size={13} className="text-zinc-400" />
                <span>My subjects</span>
              </div>
              <button 
                onClick={() => router.push('/account')}
                className="flex items-center gap-1 text-[9px] font-bold text-zinc-450 hover:text-zinc-700 dark:hover:text-zinc-300 transition cursor-pointer"
              >
                <RefreshCw size={10} />
                <span>Change subjects</span>
              </button>
            </div>

            {/* Grid display for the 4 subject cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              {subjects.slice(0, 4).map(sub => {
                const cardStyle = getSubjectCardStyles(sub.slug);
                const SubIcon = getSubjectIcon(sub.iconName);
                return (
                  <div 
                    key={sub.slug}
                    className={`rounded-2xl p-5 ${cardStyle.bg} ${cardStyle.text} flex flex-col justify-between h-36 relative overflow-hidden group shadow-sm`}
                  >
                    <div className="absolute right-0 bottom-0 opacity-15 text-white transform translate-x-2 translate-y-2 scale-125 transition duration-300 group-hover:scale-135">
                      <SubIcon size={75} />
                    </div>
                    
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-wider text-white/70">{sub.level} Level</p>
                      <h3 className="text-sm font-black mt-0.5 leading-snug max-w-[150px]">{sub.name}</h3>
                    </div>

                    <Link
                      href={`/learn/${sub.slug}`}
                      className="bg-white text-zinc-900 px-3.5 py-1 rounded-full text-[9px] font-black self-start hover:bg-zinc-50 transition flex items-center gap-1 shadow-sm mt-4 cursor-pointer"
                    >
                      Open
                      <ChevronRightIcon size={10} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // LOGGED OUT LANDING SCREEN (Intro Pitch Portal with Top Navbar)
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans select-none selection:bg-zinc-900 dark:selection:bg-white selection:text-white dark:selection:text-black">
      
      {/* Top Navigation Bar for Unauthenticated Landing */}
      <header className="w-full h-16 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <img src="/Precision Logo.svg" alt="Precision Logo" className="h-5.5 w-auto dark:invert" />
          <span className="bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">Edu</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
          <a href="#hero" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition">Home</a>
          <a href="#subjects" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition">Subjects</a>
          <a href="#tutors" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition">Tutors</a>
          <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition">Pricing</a>
        </nav>

        <Link
          href="/auth"
          className="px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          Sign In
        </Link>
      </header>

      {/* Main Pitch Landing Contents */}
      <main className="flex-1 w-full space-y-24 pb-20">
        
        {/* Section 1: Hero Header */}
        <section id="hero" className="max-w-4xl mx-auto text-center px-6 pt-20 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-6 py-1 px-3.5 rounded-full bg-blue-50 dark:bg-blue-955/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900 text-[9px] font-extrabold uppercase tracking-widest">
            <Sparkles size={11} />
            Study Portal Pitch Ready
          </div>

          <h1 className="chess-title max-w-3xl mb-6">
            High quality exam tools for{' '}
            <span className="inline-block min-w-[200px] text-left sm:min-w-[320px] md:min-w-[380px] text-blue-600 dark:text-blue-400">
              {displayedText}
              <span className="cursor-blink font-light text-zinc-450 dark:text-zinc-550 ml-1">|</span>
            </span>
          </h1>

          <p className="chess-subtitle max-w-2xl mb-10">
            Save and analyze your scores for past papers, browse all past papers conveniently, write study notes, and chat with study groups. Built for Pearson Edexcel IAL & IGCSE.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/auth"
              className="chess-btn chess-btn-primary w-full sm:w-auto px-8 py-3.5"
            >
              Start Revision
              <ArrowRight size={13} />
            </Link>
            <a
              href="#pricing"
              className="px-6 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors w-full sm:w-auto text-center"
            >
              View Pricing
            </a>
          </div>
        </section>

        {/* Section 2: Subject Resources Showcase */}
        <section id="subjects" className="max-w-5xl mx-auto px-6 space-y-8 scroll-mt-20">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Curriculum Subject Materials</h2>
            <p className="text-[11px] text-zinc-450 max-w-md mx-auto leading-relaxed">
              Unlock summary sheets, digital mock cards, and worked solution files structured around your syllabus.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjects.slice(0, 4).map((sub) => {
              const SubIcon = getSubjectIcon(sub.iconName);
              return (
                <div
                  key={sub.slug}
                  className="rounded-2xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 flex flex-col justify-between h-36 relative overflow-hidden group shadow-sm hover:scale-[1.02] transition-transform duration-200"
                >
                  <div className="absolute right-0 bottom-0 opacity-5 dark:opacity-10 text-zinc-900 dark:text-white transform translate-x-2 translate-y-2 scale-125">
                    <SubIcon size={75} />
                  </div>
                  <div>
                    <span className="text-[8px] font-black tracking-widest text-zinc-400 uppercase">{sub.level} Level</span>
                    <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-1 max-w-[120px]">{sub.name}</h3>
                  </div>
                  <Link
                    href="/auth"
                    className="flex items-center gap-1 text-[9px] font-extrabold text-blue-500 hover:underline self-start cursor-pointer mt-2"
                  >
                    Open Syllabus
                    <ChevronRightIcon size={10} />
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Verified Tutors Showcase */}
        <section id="tutors" className="max-w-5xl mx-auto px-6 space-y-8 scroll-mt-20">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Revision Tutors Support</h2>
            <p className="text-[11px] text-zinc-450 max-w-md mx-auto leading-relaxed">
              Direct session bookings and live DM chats to assist on exam-style calculation difficulties.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Tutor 1 */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-5 rounded-2xl flex gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">
                SL
              </div>
              <div className="space-y-1.5 text-left">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Dr. Sarah Lin</h3>
                  <div className="flex items-center text-amber-500 text-[8px] font-bold">
                    <Star size={9} className="fill-amber-500" />
                    <span className="ml-0.5">5.0</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Chemistry & Biochemistry</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Cambridge Ph.D with 7+ years teaching students to clear Unit 1-6 structure dynamics.
                </p>
              </div>
            </div>

            {/* Tutor 2 */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-5 rounded-2xl flex gap-4 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold">
                AW
              </div>
              <div className="space-y-1.5 text-left">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Alex Wong</h3>
                  <div className="flex items-center text-amber-500 text-[8px] font-bold">
                    <Star size={9} className="fill-amber-500" />
                    <span className="ml-0.5">4.9</span>
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Physics & Core Mathematics</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-normal">
                  Imperial College MSc. Specialist in mechanics calculations and differentiation methods.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: SaaS Pricing Packages Comparison */}
        <section id="pricing" className="max-w-5xl mx-auto px-6 space-y-8 scroll-mt-20">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Upgrade Your Revision Tier</h2>
            <p className="text-[11px] text-zinc-450 max-w-md mx-auto leading-relaxed">
              Unlock study cards and coordinate slot approvals directly with physical tutors.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-6 flex flex-col justify-between shadow-sm text-left">
              <div>
                <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Free Tier</h3>
                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">Search past papers across subjects.</p>
                <div className="my-5">
                  <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">$0</span>
                  <span className="text-[9px] text-zinc-400 font-bold ml-1 uppercase">HKD / mo</span>
                </div>
                <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Check size={11} className="text-green-500" />
                    <span>Past Papers Search & Viewer</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={11} className="text-green-500" />
                    <span>Digital Revision Calendar</span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-40">
                    <Lock size={10} />
                    <span className="line-through">Study Notes & Videos</span>
                  </div>
                </div>
              </div>
              <Link href="/auth" className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-black text-xs font-bold mt-6 text-center cursor-pointer">
                Get Started
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-white dark:bg-zinc-900 border-2 border-blue-500 rounded-2xl p-6 flex flex-col justify-between shadow-md text-left relative">
              <div className="absolute -top-3 left-6 bg-blue-600 text-white px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider">
                Recommended
              </div>
              <div>
                <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Premium Study</h3>
                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">Full access to curriculum revision tools.</p>
                <div className="my-5">
                  <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">$180</span>
                  <span className="text-[9px] text-zinc-400 font-bold ml-1 uppercase">HKD / mo</span>
                </div>
                <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Check size={11} className="text-green-500" />
                    <span>Unlimited Study Notes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={11} className="text-green-500" />
                    <span>Curated Video Lessons</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={11} className="text-green-500" />
                    <span>Score Analytics & Grades</span>
                  </div>
                </div>
              </div>
              <Link href="/auth" className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold mt-6 text-center cursor-pointer">
                Subscribe Premium
              </Link>
            </div>

            {/* Tutor Student */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-6 flex flex-col justify-between shadow-sm text-left">
              <div>
                <h3 className="text-xs font-black text-zinc-900 dark:text-zinc-100">Tutor VIP</h3>
                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">Messaging support for active physical students.</p>
                <div className="my-5">
                  <span className="text-lg font-black text-zinc-900 dark:text-zinc-100">VIP Code Only</span>
                  <span className="text-[9px] text-zinc-400 font-bold ml-1 block mt-0.5 uppercase">Tutor Provided</span>
                </div>
                <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Check size={11} className="text-green-500" />
                    <span>All Premium features unlocked</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={11} className="text-green-500" />
                    <span>Direct DMs with all tutors</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check size={11} className="text-green-500" />
                    <span>Priority slot scheduling</span>
                  </div>
                </div>
              </div>
              <Link href="/auth" className="w-full py-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 dark:bg-zinc-805 dark:hover:bg-zinc-700 text-white text-xs font-bold mt-6 text-center cursor-pointer">
                Redeem Code
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* Footer Info */}
      <footer className="w-full border-t border-zinc-200/60 dark:border-zinc-800/60 py-8 text-center text-[10px] text-zinc-400 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Globe size={11} />
          <span>Pearson Edexcel IAL & IGCSE Revision Hub</span>
        </div>
        <p>&copy; 2026 Precision Education. All rights reserved.</p>
      </footer>

    </div>
  );
}
