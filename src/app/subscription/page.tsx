"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Crown, Lock, Check, Sparkles, Code, CreditCard } from 'lucide-react';

export default function SubscriptionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // VIP code modal simulation
  const [vipCode, setVipCode] = useState('');
  const [vipError, setVipError] = useState<string | null>(null);
  const [vipSuccess, setVipSuccess] = useState(false);
  const [showVipModal, setShowVipModal] = useState(false);

  // Checkout modal simulation
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutProcessing, setCheckoutProcessing] = useState(false);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);
    
    const { data } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .maybeSingle();
    
    setProfile(data);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, [supabase]);

  const handleUpdateStatus = async (newStatus: 'free' | 'premium' | 'tutor_student') => {
    if (!userId) return;
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: newStatus })
      .eq('id', userId);

    if (error) {
      console.error(error);
    } else {
      setProfile({ subscription_status: newStatus });
      router.refresh();
    }
  };

  const handleRedeemVipCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVipError(null);
    if (vipCode.trim().toUpperCase() === 'TUTORVIP' || vipCode.trim().toUpperCase() === 'VIP2026') {
      await handleUpdateStatus('tutor_student');
      setVipSuccess(true);
      setTimeout(() => {
        setShowVipModal(false);
        setVipSuccess(false);
        setVipCode('');
      }, 1500);
    } else {
      setVipError("Invalid VIP access code. Try using 'TUTORVIP' for the demo!");
    }
  };

  const handleSimulatedCheckout = async () => {
    setCheckoutProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await handleUpdateStatus('premium');
    setCheckoutProcessing(false);
    setShowCheckoutModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-300 border-t-zinc-900 animate-spin" />
      </div>
    );
  }

  const currentStatus = profile?.subscription_status || 'free';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-955 py-10 px-6 select-none font-sans text-left">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full">Pricing Plans</span>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Flexible Packages for High-Score Revision</h1>
          <p className="text-xs text-zinc-450 max-w-lg mx-auto leading-relaxed">
            Upgrade your membership tier to unlock A-Level study summaries, video lectures, and live direct-message coaching with certified tutors.
          </p>
        </div>

        {/* Current Active Badge */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-4 flex items-center justify-between max-w-xl mx-auto shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Crown size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Your profile tier</p>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 mt-0.5">
                {currentStatus === 'free' && 'Free Student Plan'}
                {currentStatus === 'premium' && 'Premium Study Access'}
                {currentStatus === 'tutor_student' && 'VIP Tutor Student'}
              </h3>
            </div>
          </div>
          {currentStatus !== 'free' && (
            <button
              onClick={() => handleUpdateStatus('free')}
              className="text-[10px] font-black text-red-500 hover:text-red-600 hover:underline bg-transparent border-none cursor-pointer"
            >
              Downgrade for Demo
            </button>
          )}
        </div>

        {/* 3 Packages Grid */}
        <div className="grid md:grid-cols-3 gap-6 pt-4 max-w-4xl mx-auto">
          
          {/* Card 1: Free */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-6 flex flex-col justify-between relative shadow-sm">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Free Tier</h3>
              <p className="text-[10px] text-zinc-450 mt-1 leading-relaxed">Basic past papers search engine for all syllabus.</p>
              
              <div className="my-6">
                <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">$0</span>
                <span className="text-[10px] text-zinc-400 font-bold ml-1 uppercase">HKD / month</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-650 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span>Past Papers Search & Viewer</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span>Digital Revision Calendar</span>
                </div>
                <div className="flex items-center gap-2 opacity-40">
                  <Lock size={12} className="shrink-0" />
                  <span className="line-through">Study Notes & Chapters</span>
                </div>
                <div className="flex items-center gap-2 opacity-40">
                  <Lock size={12} className="shrink-0" />
                  <span className="line-through">Video Revision Lessons</span>
                </div>
              </div>
            </div>

            <button
              disabled={currentStatus === 'free'}
              onClick={() => handleUpdateStatus('free')}
              className={`w-full py-2.5 rounded-xl text-xs font-bold mt-8 transition-colors select-none ${
                currentStatus === 'free'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default'
                  : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-black cursor-pointer'
              }`}
            >
              {currentStatus === 'free' ? 'Current Plan' : 'Downgrade to Free'}
            </button>
          </div>

          {/* Card 2: Premium */}
          <div className="bg-white dark:bg-zinc-900 border-2 border-blue-500 rounded-2xl p-6 flex flex-col justify-between relative shadow-md shadow-blue-500/5">
            <div className="absolute -top-3 left-6 bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider">
              Recommended
            </div>
            
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Premium Study</h3>
                <Sparkles size={14} className="text-blue-500 animate-pulse" />
              </div>
              <p className="text-[10px] text-zinc-450 mt-1 leading-relaxed">Full access to curriculum revision tools and AI Teacher.</p>
              
              <div className="my-6">
                <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">$180</span>
                <span className="text-[10px] text-zinc-400 font-bold ml-1 uppercase">HKD / month</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-650 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span>Unlimited Study Notes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span>Curated Video Lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span>AI Revision Teacher chatbot</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span>Score Analytics & Grades</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (currentStatus === 'premium') return;
                setShowCheckoutModal(true);
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-bold mt-8 transition-colors select-none ${
                currentStatus === 'premium'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`}
            >
              {currentStatus === 'premium' ? 'Current Plan' : 'Upgrade to Premium'}
            </button>
          </div>

          {/* Card 3: VIP Tutor Student */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-6 flex flex-col justify-between relative shadow-sm">
            <div>
              <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Tutor VIP Plan</h3>
              <p className="text-[10px] text-zinc-450 mt-1 leading-relaxed">Direct messaging support for verified active tutor students.</p>
              
              <div className="my-6">
                <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">VIP Code</span>
                <span className="text-[10px] text-zinc-450 font-bold ml-1 block mt-1 uppercase">Redeem via Booking</span>
              </div>

              <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-650 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span>All Premium features unlocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span>Direct DMs with all tutors</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-green-500 shrink-0" />
                  <span>Priority session slots approval</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (currentStatus === 'tutor_student') return;
                setShowVipModal(true);
              }}
              className={`w-full py-2.5 rounded-xl text-xs font-bold mt-8 transition-colors select-none ${
                currentStatus === 'tutor_student'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default'
                  : 'bg-zinc-850 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white cursor-pointer'
              }`}
            >
              {currentStatus === 'tutor_student' ? 'Current Plan' : 'Redeem VIP Code'}
            </button>
          </div>

        </div>

      </div>

      {/* VIP Access Redeem Code Modal Simulation */}
      {showVipModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Code size={16} className="text-blue-500" />
                Redeem Tutor VIP Code
              </h3>
              <p className="text-[10px] text-zinc-450 mt-1">If you are enrolled in our physical tutoring classes, type your VIP code below.</p>
            </div>

            {vipSuccess ? (
              <div className="p-3 text-xs bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-xl font-bold text-center">
                VIP Access Code Activated Successfully!
              </div>
            ) : (
              <form onSubmit={handleRedeemVipCode} className="space-y-4">
                {vipError && (
                  <div className="p-2.5 text-[10px] bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg">
                    {vipError}
                  </div>
                )}
                <div>
                  <label className="text-[9px] font-black uppercase text-zinc-400 block mb-1">Access Code</label>
                  <input
                    type="text"
                    value={vipCode}
                    onChange={e => setVipCode(e.target.value)}
                    placeholder="Enter code (E.g. TUTORVIP)"
                    required
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-450 font-mono tracking-widest"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowVipModal(false);
                      setVipError(null);
                      setVipCode('');
                    }}
                    className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Activate Code
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Simulated Premium Card Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <CreditCard size={16} className="text-blue-500" />
                Simulated Premium Checkout
              </h3>
              <p className="text-[10px] text-zinc-450 mt-1">This is a demo checkout simulation. Your mock profile will be instantly upgraded to premium.</p>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-850 p-3.5 rounded-xl border border-zinc-200/40 dark:border-zinc-750 flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">Premium Study Plan Subscription</span>
              <strong className="text-zinc-900 dark:text-zinc-100">$180 HKD / mo</strong>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={checkoutProcessing}
                onClick={() => setShowCheckoutModal(false)}
                className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulatedCheckout}
                disabled={checkoutProcessing}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                {checkoutProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border border-white border-t-transparent rounded-full animate-spin" />
                    Upgrading...
                  </>
                ) : (
                  'Complete Upgrades'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
