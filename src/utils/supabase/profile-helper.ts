import { SupabaseClient } from '@supabase/supabase-js';

export type SubscriptionStatus = 'free' | 'premium' | 'tutor_student';

export interface UserProfile {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  subscription_status: SubscriptionStatus;
  created_at?: string;
  updated_at?: string;
}

// Minimalist avatar presets (gradients or emojis)
export const DEFAULT_AVATARS = [
  'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)', // Coral Sunset
  'linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)', // Cool Ocean
  'linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)', // Purple Haze
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Green Oasis
  'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)', // Pink Blush
  'linear-gradient(135deg, #FBD3E9 0%, #BB377D 100%)', // Rose Petal
];

// Fallback profile if Supabase tables are not set up yet
export function getAvatarGradient(username: string): string {
  const name = username || 'User';
  const charCode = name.toLowerCase().charCodeAt(0) || 97;
  const gradients = [
    'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)', // Coral Sunset
    'linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)', // Cool Ocean
    'linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)', // Purple Haze
    'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', // Green Oasis
    'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)', // Pink Blush
    'linear-gradient(135deg, #FBD3E9 0%, #BB377D 100%)', // Rose Petal
    'linear-gradient(135deg, #36D1DC 0%, #5B86E5 100%)', // Sky Blue
    'linear-gradient(135deg, #f12711 0%, #f5af19 100%)', // Sunset Glow
    'linear-gradient(135deg, #111111 0%, #444444 100%)', // Onyx Dark
    'linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)', // Vibrant Tri
  ];
  return gradients[charCode % gradients.length];
}

const LOCAL_STORAGE_KEY = 'precision_edu_local_profile';

export function getLocalProfileFallback(userId: string, email: string | null): UserProfile {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.id === userId) return parsed;
      } catch (e) {
        // ignore
      }
    }
  }

  let baseUsername = 'student';
  if (email) {
    const prefix = email.split('@')[0];
    baseUsername = prefix.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    if (!baseUsername) baseUsername = 'student';
  }

  const defaultProfile: UserProfile = {
    id: userId,
    username: `${baseUsername}_demo`,
    bio: 'Profiles table not yet configured in Supabase. Check implementation plan to run the SQL migration!',
    avatar_url: DEFAULT_AVATARS[0],
    subscription_status: 'free'
  };

  return defaultProfile;
}

export function saveLocalProfileFallback(profile: UserProfile) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
  }
}

export async function ensureUserProfile(
  supabase: SupabaseClient,
  userId: string,
  email: string | null
): Promise<{ profile: UserProfile | null; isFallback: boolean }> {
  if (!userId) return { profile: null, isFallback: false };

  try {
    // 1. Try to load user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      // Table doesn't exist yet, return fallback
      if (error.code === 'PGRST205') {
        console.warn('Precision Edu profiles table not found in Supabase. Using localStorage fallback.');
        return { profile: getLocalProfileFallback(userId, email), isFallback: true };
      }
      throw error;
    }

    if (profile) {
      return { profile: profile as UserProfile, isFallback: false };
    }

    // 2. Profile not found, create a default one
    let baseUsername = 'student';
    if (email) {
      const prefix = email.split('@')[0];
      baseUsername = prefix.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
      if (!baseUsername) baseUsername = 'student';
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const username = `${baseUsername}_${randomSuffix}`;

    const defaultProfile: UserProfile = {
      id: userId,
      username,
      bio: 'A-Levels student using Precision Edu to track exam performance.',
      avatar_url: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
      subscription_status: 'free'
    };

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(defaultProfile)
      .select()
      .single();

    if (insertError) {
      if (insertError.code === 'PGRST205') {
        return { profile: getLocalProfileFallback(userId, email), isFallback: true };
      }
      console.error('Failed to create default user profile:', insertError);
      return { profile: getLocalProfileFallback(userId, email), isFallback: true };
    }

    return { profile: newProfile as UserProfile, isFallback: false };
  } catch (err: any) {
    console.error('ensureUserProfile error:', err);
    return { profile: getLocalProfileFallback(userId, email), isFallback: true };
  }
}
