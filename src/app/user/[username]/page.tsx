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
import Avatar from '@/components/Avatar';

interface PostComment {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  content: string;
  created_at: string;
}

interface UserPost {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  content: string;
  created_at: string;
  likes: string[];
  comments: PostComment[];
}

const getMockPosts = (userUsername: string, avatarUrl: string): UserPost[] => [
  {
    id: 'mock-1',
    user_id: 'mock-user-id',
    username: userUsername,
    avatar_url: avatarUrl || "",
    content: "Getting ready for Chemistry Unit 4! Making revision notes on organic synthesis pathways today. 🧪📝",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    likes: [],
    comments: [
      {
        id: 'mock-comment-1',
        user_id: 'visitor-1',
        username: 'revision_guru',
        avatar_url: 'linear-gradient(135deg, #10B981, #059669)',
        content: "Organic synthesis is tough! Do you have any good summaries for the transition metals reactions?",
        created_at: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  },
  {
    id: 'mock-2',
    user_id: 'mock-user-id',
    username: userUsername,
    avatar_url: avatarUrl || "",
    content: "Highly recommend using the calendar tab on Precision Edu to map out mock exams! It has completely sorted out my revision schedule.",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    likes: ['revision_guru'],
    comments: []
  }
];

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default function UserProfilePage({ params }: ProfilePageProps) {
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
  const [stats, setStats] = useState({ postsCount: 0, calendarNotesCount: 0 });
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [activePostCommentId, setActivePostCommentId] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  // Followers/Following count helpers
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

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

        // Fetch actual follows count and state
        let isUserFollowing = false;
        let followerCountVal = 0;
        let followingCountVal = 0;
        try {
          const { count: followersCountRes, error: fErr } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', resolvedProfile.id);
          if (!fErr && followersCountRes !== null) followerCountVal = followersCountRes;

          const { count: followingCountRes, error: fgErr } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', resolvedProfile.id);
          if (!fgErr && followingCountRes !== null) followingCountVal = followingCountRes;

          if (user && !owner) {
            const { data: followRel, error: relErr } = await supabase
              .from('follows')
              .select('*')
              .eq('follower_id', user.id)
              .eq('following_id', resolvedProfile.id)
              .maybeSingle();
            if (!relErr && followRel) isUserFollowing = true;
          }
        } catch (followQueryErr) {
          console.warn("Follows query error:", followQueryErr);
        }
        setFollowersCount(followerCountVal);
        setFollowingCount(followingCountVal);
        setIsFollowing(isUserFollowing);

        // 3. Load posts from Supabase database
        const { data: postsData, error: postsErr } = await supabase
          .from('posts')
          .select(`
            id,
            content,
            created_at,
            user_id,
            profiles!user_id (
              username,
              avatar_url
            ),
            likes (
              user_id
            ),
            comments (
              id,
              content,
              created_at,
              user_id,
              profiles!user_id (
                username,
                avatar_url
              )
            )
          `)
          .eq('user_id', resolvedProfile.id)
          .order('created_at', { ascending: false });

        let loadedPosts: UserPost[] = [];
        if (postsData) {
          loadedPosts = postsData.map((p: any) => {
            const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
            return {
              id: p.id,
              user_id: p.user_id,
              username: profile?.username || resolvedProfile.username,
              avatar_url: profile?.avatar_url || resolvedProfile.avatar_url || "",
              content: p.content,
              created_at: p.created_at,
              likes: p.likes ? p.likes.map((l: any) => l.user_id) : [],
              comments: p.comments 
                ? p.comments.map((c: any) => {
                    const commenterProfile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
                    return {
                      id: c.id,
                      post_id: p.id,
                      user_id: c.user_id,
                      username: commenterProfile?.username || 'anonymous',
                      avatar_url: commenterProfile?.avatar_url || '',
                      content: c.content,
                      created_at: c.created_at
                    };
                  }).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                : []
            };
          });
        }
        setPosts(loadedPosts);

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

        setStats({ postsCount: loadedPosts.length, calendarNotesCount });

      } catch (err: any) {
        console.error('Failed to load user profile data:', err);
        setError(err.message || 'An unexpected error occurred loading this profile.');
      } finally {
        setLoading(false);
      }
    }

    loadProfileAndData();
  }, [username, supabase]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() || !currentUser || !targetProfile) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: currentUser.id,
          content: newPostText.trim()
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles!user_id (
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
        const newPost: UserPost = {
          id: data.id,
          user_id: data.user_id,
          username: profile?.username || targetProfile.username,
          avatar_url: profile?.avatar_url || targetProfile.avatar_url || "",
          content: data.content,
          created_at: data.created_at,
          likes: [],
          comments: []
        };
        setPosts(prev => [newPost, ...prev]);
        setStats(prev => ({ ...prev, postsCount: prev.postsCount + 1 }));
      }
      setNewPostText('');
    } catch (err: any) {
      alert(`Failed to create post: ${err.message || err}`);
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) {
      alert("Please sign in to like posts.");
      return;
    }

    try {
      const isCurrentlyLiked = posts.find(p => p.id === postId)?.likes.includes(currentUser.id);

      if (isCurrentlyLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        if (error) throw error;

        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, likes: p.likes.filter(id => id !== currentUser.id) };
          }
          return p;
        }));
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: currentUser.id
          });

        if (error) throw error;

        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, likes: [...p.likes, currentUser.id] };
          }
          return p;
        }));
      }
    } catch (err: any) {
      alert(`Failed to toggle like: ${err.message || err}`);
    }
  };

  const handleAddComment = async (postId: string, commentText: string) => {
    if (!currentUser) {
      alert("Please sign in to comment.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          content: commentText.trim()
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles!user_id (
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
        const newComment: PostComment = {
          id: data.id,
          user_id: data.user_id,
          username: profile?.username || 'anonymous',
          avatar_url: profile?.avatar_url || '',
          content: data.content,
          created_at: data.created_at
        };

        setPosts(prev => prev.map(p => {
          if (p.id === postId) {
            return { ...p, comments: [...p.comments, newComment] };
          }
          return p;
        }));
      }
    } catch (err: any) {
      alert(`Failed to add reply: ${err.message || err}`);
    }
  };
  const toggleFollow = async () => {
    if (!currentUser || !targetProfile) {
      alert("Please sign in to follow users.");
      return;
    }

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetProfile.id);

        if (error) throw error;

        setIsFollowing(false);
        setFollowersCount(prev => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: targetProfile.id
          });

        if (error) throw error;

        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
      }
    } catch (err: any) {
      alert(`Failed to update follow relationship: ${err.message || err}`);
    }
  };

  const renderAvatar = (urlOrGradient: string, sizeClass = "h-20 w-20 sm:h-24 sm:w-24") => {
    return <Avatar avatarUrl={urlOrGradient} username={username} sizeClass={sizeClass} textSizeClass="text-2xl font-bold" />;
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
                <span title="Verified Precision Edu Student">
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
                <span className="font-extrabold">{stats.postsCount}</span>
                <span className="text-zinc-500 dark:text-zinc-400 ml-1">posts</span>
              </div>
              <div>
                <span className="font-extrabold">{followersCount}</span>
                <span className="text-zinc-500 dark:text-zinc-400 ml-1">followers</span>
              </div>
              <div>
                <span className="font-extrabold">{followingCount}</span>
                <span className="text-zinc-500 dark:text-zinc-400 ml-1">following</span>
              </div>
            </div>

            {/* Bottom row: Student handle & custom bio */}
            <div className="space-y-1">
              <div className="font-bold text-sm flex items-center justify-center sm:justify-start gap-1">
                <GraduationCap size={15} className="text-zinc-400" />
                <span>Precision Edu Academic Profile</span>
              </div>
              <p className="text-sm text-zinc-650 dark:text-zinc-300 max-w-lg leading-relaxed whitespace-pre-wrap">
                {targetProfile.bio || "No profile biography written yet."}
              </p>
            </div>
          </div>
        </div>
          {/* ── POSTS FEED ── */}
        <div className="space-y-6 pt-6">
          <div className="space-y-6 max-w-2xl mx-auto">
            {isOwner && (
              <form onSubmit={handleCreatePost} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 rounded-lg p-4 space-y-3">
                <div className="flex gap-3">
                  <div className="shrink-0">
                    {renderAvatar(currentUser?.user_metadata?.avatar_url || targetProfile.avatar_url || "", "h-9 w-9")}
                  </div>
                  <div className="flex-grow">
                    <textarea
                      placeholder="Share an update or ask a study question..."
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      rows={3}
                      className="w-full text-sm bg-transparent border-0 focus:ring-0 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none resize-none text-zinc-900 dark:text-zinc-100"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-550">Posts are visible to anyone visiting your profile</span>
                  <button
                    type="submit"
                    disabled={!newPostText.trim()}
                    className="px-4 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Post
                  </button>
                </div>
              </form>
            )}

            {posts.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No posts yet</p>
                <p className="text-xs mt-1">Updates and threads will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/20 rounded-lg p-5 space-y-4 text-left">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-3">
                        {renderAvatar(post.avatar_url || "", "h-9 w-9")}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">@{post.username}</span>
                            <span className="text-[10px] text-zinc-400">•</span>
                            <span className="text-[10px] text-zinc-400">
                              {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-400">Student</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-zinc-850 dark:text-zinc-200 whitespace-pre-wrap">
                      {post.content}
                    </p>

                    <div className="flex items-center gap-6 border-t border-zinc-100 dark:border-zinc-850/60 pt-3 text-xs text-zinc-500">
                      <button
                        onClick={() => handleLikePost(post.id)}
                        className={`flex items-center gap-1.5 font-bold transition-colors cursor-pointer hover:opacity-80 ${
                          currentUser && post.likes.includes(currentUser.id)
                            ? 'text-red-500'
                            : 'hover:text-zinc-800 dark:hover:text-zinc-250'
                        }`}
                      >
                        <Heart
                          size={14}
                          className={currentUser && post.likes.includes(currentUser.id) ? 'fill-current text-red-500' : ''}
                        />
                        <span>{post.likes.length}</span>
                      </button>

                      <button
                        onClick={() => setActivePostCommentId(activePostCommentId === post.id ? null : post.id)}
                        className="flex items-center gap-1.5 font-bold hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <MessageCircle size={14} />
                        <span>{post.comments.length}</span>
                      </button>
                    </div>

                    {/* Comments section */}
                    {activePostCommentId === post.id && (
                      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-850 space-y-4">
                        {post.comments.length > 0 && (
                          <div className="space-y-4 pl-4 border-l border-zinc-200 dark:border-zinc-800">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="text-left space-y-1">
                                <div className="flex items-center gap-2">
                                  {renderAvatar(comment.avatar_url || "", "h-5 w-5")}
                                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">@{comment.username}</span>
                                  <span className="text-[9px] text-zinc-400">
                                    {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-700 dark:text-zinc-300 pl-7 leading-relaxed">
                                  {comment.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {currentUser ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const form = e.currentTarget;
                              const fd = new FormData(form);
                              const content = fd.get('commentText') as string;
                              if (content.trim()) {
                                handleAddComment(post.id, content.trim());
                                form.reset();
                              }
                            }}
                            className="flex gap-2 items-center"
                          >
                            <input
                              name="commentText"
                              type="text"
                              placeholder="Write a comment..."
                              className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 text-xs rounded px-3 py-2 focus:outline-none text-zinc-900 dark:text-zinc-100"
                            />
                            <button
                              type="submit"
                              className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded text-xs font-bold hover:opacity-90 cursor-pointer"
                            >
                              Reply
                            </button>
                          </form>
                        ) : (
                          <p className="text-[10px] text-zinc-400">Sign in to leave a comment.</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
