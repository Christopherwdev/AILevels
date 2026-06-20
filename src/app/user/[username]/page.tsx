"use client";

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  Grid, Bookmark, Calendar, Lock, Settings, MessageCircle, 
  UserCheck, UserPlus, Heart, Sparkles, HelpCircle, GraduationCap,
  ArrowLeft, CheckCircle2, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { ensureUserProfile, DEFAULT_AVATARS, UserProfile } from '@/utils/supabase/profile-helper';

interface PageProps {
  params: Promise<{ username: string }>;
}

export default function UserProfilePage({ params }: PageProps) {
  const router = useRouter();
  const supabase = createClient();
  
  // Resolve params
  const { username } = use(params);

  // States
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [targetProfile, setTargetProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'calendar' | 'saved'>('posts');

  // Stats & Data
  const [stats, setStats] = useState({ sittingsCount: 0, calendarNotesCount: 0 });
  const [sittingsList, setSittingsList] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isScoresPrivate, setIsScoresPrivate] = useState(false);

  // Followers count helper
  const [followersCount, setFollowersCount] = useState(128);

  useEffect(() => {
    async function loadProfileAndData() {
      setLoading(true);
      setError(null);
      try {
        // 1. Get current logged-in user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        // 2. Fetch target profile by username
        // Try Supabase first
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle();

        let resolvedProfile: UserProfile | null = profile as UserProfile | null;

        // If not found in Supabase, check if the searched profile is the current user's local fallback
        if (!resolvedProfile && user) {
          const { getLocalProfileFallback } = await import('@/utils/supabase/profile-helper');
          const localProf = getLocalProfileFallback(user.id, user.email || null);
          if (localProf.username === username) {
            resolvedProfile = localProf;
          }
        }

        if (!resolvedProfile) {
          setError('User not found. Check the username spelling.');
          setLoading(false);
          return;
        }

        setTargetProfile(resolvedProfile);

        // Determine if current user owns this profile
        const owner = user ? user.id === resolvedProfile.id : false;
        setIsOwner(owner);

        // Mock followers count based on username length for visual variety
        setFollowersCount((username.length * 17) + 34);

        // 3. Fetch user dashboard statistics & grid data
        const { data: scores, error: scoresErr } = await supabase
          .from('dashboard_scores')
          .select('content')
          .eq('user_id', resolvedProfile.id)
          .eq('title', 'main_scores')
          .maybeSingle();

        // Check if scores are private (query returns null or fails because of RLS on other user's rows)
        if (scoresErr || (!owner && !scores)) {
          // If not owner and query returned nothing or failed, it's private
          if (!owner) {
            setIsScoresPrivate(true);
          }
        }

        // Calculate and build sittings list
        let papersList: any[] = [];
        let scoresCount = 0;
        if (scores?.content?.scores) {
          const ial = scores.content.scores.IAL || {};
          const igcse = scores.content.scores.IGCSE || {};

          // Flatten sittings
          // Structure: IAL: { "IAL_2024_Jun_Physics_Paper_1": "67", ... }
          const parseSittings = (modeScores: any, modeLabel: string) => {
            Object.entries(modeScores).forEach(([key, val]) => {
              if (val && val !== 'N/A' && !isNaN(parseFloat(val as string))) {
                // Key format: IAL_2024_Jun_Physics_Paper_1
                const parts = key.split('_');
                if (parts.length >= 5) {
                  const year = parts[1];
                  const series = parts[2];
                  const subject = parts[3];
                  const paper = parts.slice(4).join(' ');
                  papersList.push({
                    id: key,
                    mode: modeLabel,
                    year,
                    series,
                    subject,
                    paper,
                    score: parseFloat(val as string)
                  });
                } else {
                  papersList.push({
                    id: key,
                    mode: modeLabel,
                    subject: 'Subject',
                    paper: key,
                    score: parseFloat(val as string)
                  });
                }
              }
            });
          };

          parseSittings(ial, 'IAL');
          parseSittings(igcse, 'IGCSE');
          scoresCount = papersList.length;
          setSittingsList(papersList);
        }

        // 4. Fetch user calendar events
        const { data: calendar } = await supabase
          .from('dashboard_calendar')
          .select('content')
          .eq('user_id', resolvedProfile.id)
          .eq('title', 'main_calendar')
          .maybeSingle();

        let calendarNotesCount = 0;
        let eventsList: any[] = [];
        if (calendar?.content?.calendarData) {
          // calendarData: { "2026-06-19": "Physics FP1 review" }
          Object.entries(calendar.content.calendarData).forEach(([dateStr, text]) => {
            if (text) {
              eventsList.push({ date: dateStr, note: text });
            }
          });
          calendarNotesCount = eventsList.length;
          setCalendarEvents(eventsList);
        }

        setStats({ sittingsCount: scoresCount, calendarNotesCount });

      } catch (err: any) {
        console.error('Failed to load user profile data:', err);
        setError(err.message || 'An unexpected error occurred loading this profile.');
      } finally {
        setLoading(false);
      }
    }

    loadProfileAndData();
  }, [username, supabase]);

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
    setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1);
  };

  const renderAvatar = (urlOrGradient: string, sizeClass = "h-20 w-20 sm:h-24 sm:w-24") => {
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

  // Helper to color codes mock cards
  const getSubjectColor = (subject: string) => {
    const s = subject.toLowerCase();
    if (s.includes('math')) return 'from-blue-500/20 to-indigo-500/20 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-900/50';
    if (s.includes('physic')) return 'from-orange-500/20 to-red-500/20 text-orange-700 dark:text-orange-400 border-orange-200/50 dark:border-orange-900/50';
    if (s.includes('chemis')) return 'from-yellow-500/20 to-amber-500/20 text-amber-700 dark:text-amber-400 border-yellow-200/50 dark:border-amber-900/50';
    if (s.includes('biolo')) return 'from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-400 border-green-200/50 dark:border-green-900/50';
    return 'from-zinc-500/10 to-zinc-500/20 text-zinc-700 dark:text-zinc-300 border-zinc-200/50 dark:border-zinc-800/50';
  };

  if (loading) {
    return (
      <div className="flex-1 w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Loading Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !targetProfile) {
    return (
      <div className="flex-1 w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle size={40} className="text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Profile Unavailable</h2>
          <p className="text-sm text-zinc-500">{error || 'Unable to fetch user data.'}</p>
          <div className="pt-4">
            <Link href="/dashboard" className="btn-notion-white inline-flex items-center gap-2">
              <ArrowLeft size={14} /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-0 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl w-full space-y-8">
        
        {/* Navigation back */}
        <div className="flex items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
        </div>

        {/* ── PROFILE HEADER (INSTAGRAM STYLE) ── */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-center sm:items-start pb-8 border-b border-zinc-200 dark:border-zinc-800">
          
          {/* Circular avatar on the left */}
          <div className="relative shrink-0">
            {renderAvatar(targetProfile.avatar_url || "")}
          </div>

          {/* User Bio and Profile Info on the right */}
          <div className="flex-1 space-y-4 text-center sm:text-left w-full">
            
            {/* Top row: Username & Edit button */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-1.5">
                @{targetProfile.username}
                <span title="Verified unipro Student">
                  <CheckCircle2 size={16} className="text-blue-500 fill-blue-500 dark:fill-none" />
                </span>
              </h2>
              
              <div className="flex gap-2">
                {isOwner ? (
                  <>
                    <Link
                      href="/account"
                      className="px-4 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded text-xs font-bold transition-colors"
                    >
                      Edit Profile
                    </Link>
                    <Link
                      href="/account"
                      className="p-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded transition-colors"
                      title="Settings"
                    >
                      <Settings size={14} />
                    </Link>
                  </>
                ) : (
                  <>
                    <button
                      onClick={toggleFollow}
                      className={`px-6 py-1.5 rounded text-xs font-bold transition-all cursor-pointer ${isFollowing ? 'bg-zinc-100 dark:bg-zinc-850 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button 
                      onClick={() => alert(`Direct messaging @${targetProfile.username} is coming soon!`)}
                      className="px-4 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded text-xs font-bold transition-colors cursor-pointer"
                    >
                      Message
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Middle row: Stats count */}
            <div className="flex justify-center sm:justify-start gap-8 text-sm">
              <div>
                <span className="font-extrabold">{isScoresPrivate ? '—' : stats.sittingsCount}</span>
                <span className="text-zinc-500 dark:text-zinc-400 ml-1">sittings</span>
              </div>
              <div>
                <span className="font-extrabold">{followersCount}</span>
                <span className="text-zinc-500 dark:text-zinc-400 ml-1">followers</span>
              </div>
              <div>
                <span className="font-extrabold">{(username.length * 12) + 21}</span>
                <span className="text-zinc-500 dark:text-zinc-400 ml-1">following</span>
              </div>
            </div>

            {/* Bottom row: Student handle & custom bio */}
            <div className="space-y-1">
              <div className="font-bold text-sm flex items-center justify-center sm:justify-start gap-1">
                <GraduationCap size={15} className="text-zinc-400" />
                <span>unipro Academic Profile</span>
              </div>
              <p className="text-sm text-zinc-650 dark:text-zinc-300 max-w-lg leading-relaxed whitespace-pre-wrap">
                {targetProfile.bio || "No profile biography written yet."}
              </p>
            </div>
          </div>
        </div>

        {/* ── FEED / GRID VIEWS ── */}
        <div className="space-y-4">
          
          {/* Tabs header */}
          <div className="flex justify-center gap-12 border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase tracking-widest font-bold">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-1.5 py-4 border-t-2 -mt-[2px] transition-all cursor-pointer ${activeTab === 'posts' ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
              <Grid size={14} />
              Sittings
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-1.5 py-4 border-t-2 -mt-[2px] transition-all cursor-pointer ${activeTab === 'calendar' ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
              <Calendar size={14} />
              Tasks ({isScoresPrivate ? '—' : stats.calendarNotesCount})
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 py-4 border-t-2 -mt-[2px] transition-all cursor-pointer ${activeTab === 'saved' ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
            >
              <Bookmark size={14} />
              Saved
            </button>
          </div>

          {/* Tab content */}
          <div className="pt-2">
            {isScoresPrivate ? (
              
              /* RLS PRIVACY LOCK SCREEN */
              <div className="text-center py-16 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 max-w-md mx-auto space-y-4 px-6 shadow-sm">
                <Lock size={36} className="mx-auto text-zinc-400 dark:text-zinc-500" />
                <h3 className="text-base font-extrabold uppercase tracking-wider">This Account is Private</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Follow @{targetProfile.username} to request view access to their examination scores and study dashboard sittings.
                </p>
                <div className="pt-2">
                  <button 
                    onClick={toggleFollow}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold tracking-wider uppercase cursor-pointer"
                  >
                    {isFollowing ? 'Requested' : 'Follow'}
                  </button>
                </div>
              </div>

            ) : activeTab === 'posts' ? (
              
              /* SITTINGS FEED (GRID) */
              sittingsList.length === 0 ? (
                <div className="text-center py-16 text-zinc-400">
                  <Grid size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">No sittings recorded</p>
                  <p className="text-xs mt-1">This user hasn't saved mock exams into their dashboard.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {sittingsList.map((sitting) => (
                    <div 
                      key={sitting.id}
                      className={`p-4 rounded border flex flex-col justify-between h-32 bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${getSubjectColor(sitting.subject)}`}
                    >
                      <div className="space-y-1 text-left">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/40 dark:bg-black/20">{sitting.mode}</span>
                          <span className="text-[10px] font-bold opacity-60">{sitting.year} {sitting.series}</span>
                        </div>
                        <h4 className="font-extrabold text-sm line-clamp-1 mt-1">{sitting.subject}</h4>
                        <p className="text-[10px] opacity-75 line-clamp-1">{sitting.paper}</p>
                      </div>
                      
                      <div className="flex items-end justify-between border-t border-current/10 pt-2">
                        <span className="text-2xl font-black">{sitting.score}%</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold">
                          <Heart size={10} className="fill-current" />
                          <span>Like</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )

            ) : activeTab === 'calendar' ? (
              
              /* CALENDAR/TASKS TAB */
              calendarEvents.length === 0 ? (
                <div className="text-center py-16 text-zinc-400">
                  <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">No study tasks active</p>
                  <p className="text-xs mt-1">No notes recorded on the study planner.</p>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-3">
                  {calendarEvents.map((evt, idx) => (
                    <div key={idx} className="flex gap-4 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-left">
                      <div className="text-xs font-bold text-zinc-400 w-24 shrink-0 border-r border-zinc-100 dark:border-zinc-800 pr-2">
                        {evt.date}
                      </div>
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {evt.note}
                      </div>
                    </div>
                  ))}
                </div>
              )

            ) : (
              
              /* SAVED ITEMS TAB */
              <div className="text-center py-16 text-zinc-400 max-w-sm mx-auto space-y-3">
                <Bookmark size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No saved collection</p>
                <p className="text-xs">Saved documents, past paper shortcuts, and revision folders will display here.</p>
                {isOwner && (
                  <div className="pt-2">
                    <Link href="/past-papers" className="px-4 py-2 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:opacity-90 rounded text-[10px] font-bold tracking-wider uppercase">
                      Browse Papers →
                    </Link>
                  </div>
                )}
              </div>

            )}
          </div>
        </div>
      </div>
    </div>
  );
}
