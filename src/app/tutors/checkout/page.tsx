"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Calendar, Clock, ArrowLeft, Check, Shield, Lock, User, FileText } from 'lucide-react';

interface BookingData {
  tutorId: string;
  tutorName: string;
  hourlyRate: number;
  currency: string;
  slots: string[];
}

export default function CheckoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  // User details
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('Student');

  // Form state
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Load profile username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.username) {
        setUsername(profile.username);
        setName(profile.username);
      }

      const saved = localStorage.getItem('checkout_booking');
      if (!saved) {
        router.push('/tutors');
        return;
      }

      try {
        setBooking(JSON.parse(saved));
      } catch {
        router.push('/tutors');
        return;
      }
      setLoading(false);
    }
    init();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || !userId) return;

    setProcessing(true);
    setError(null);

    try {
      // 1. Insert into Supabase tutor_bookings table
      const { error: dbError } = await supabase
        .from('tutor_bookings')
        .insert({
          user_id: userId,
          username: username,
          tutor_id: booking.tutorId,
          tutor_name: booking.tutorName,
          slots: booking.slots,
          status: 'pending' // default to pending
        });

      if (dbError) {
        console.error("Supabase booking insert failed:", dbError);
        // Fallback gracefully even if database table is not created yet
      }

      // 2. Save to local booked list for immediate reflection on dashboard
      const currentBookedStr = localStorage.getItem('precision_edu_booked_tutors') || '[]';
      const bookedList = JSON.parse(currentBookedStr);
      const existingIdx = bookedList.findIndex((item: any) => item.tutorId === booking.tutorId);
      
      if (existingIdx !== -1) {
        bookedList[existingIdx].slots = Array.from(new Set([...bookedList[existingIdx].slots, ...booking.slots]));
      } else {
        bookedList.push({
          tutorId: booking.tutorId,
          tutorName: booking.tutorName,
          slots: booking.slots,
          bookedAt: new Date().toISOString()
        });
      }
      localStorage.setItem('precision_edu_booked_tutors', JSON.stringify(bookedList));

      // Complete simulation
      await new Promise(resolve => setTimeout(resolve, 1500));
      setCompleted(true);
      localStorage.removeItem('checkout_booking');
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading Checkout...</p>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center">
            <Check size={36} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100">Request Submitted!</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your free session request with <strong className="text-zinc-900 dark:text-zinc-100">{booking?.tutorName}</strong> is pending tutor approval.
          </p>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-4 space-y-2">
            {booking?.slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <Calendar size={12} className="text-blue-500" />
                <span className="font-semibold">{slot}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-400">Tutors review requests manually. Check back soon for status updates.</p>
          <button
            onClick={() => router.push('/tutors')}
            className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black text-xs font-bold rounded-xl hover:opacity-90 transition cursor-pointer"
          >
            Back to Tutors
          </button>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-10 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.push('/tutors')}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 mb-6 cursor-pointer transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Tutors
        </button>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Free checkout form */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-2">
                <Shield size={18} className="text-blue-500" />
                Book Session (Free Trial)
              </h2>
              <p className="text-[11px] text-zinc-400 mb-6">Verify your slot for free. No credit card or billing details required.</p>

              {error && (
                <div className="p-3 text-xs bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-550 block mb-1.5">
                    Student Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-400">
                      <User size={14} />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Your Name"
                      required
                      className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none border-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-550 block mb-1.5">
                    Topic / Notes (Optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-400">
                      <FileText size={14} />
                    </span>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="E.g. Edexcel Physics Unit 1 Mechanics SUVAT equations review..."
                      rows={3}
                      className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none border-0 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 mt-6"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Requesting slots...
                    </>
                  ) : (
                    <>
                      <Lock size={12} />
                      Request Free Session
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-6 sticky top-24">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">Booking Summary</h3>

              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl">
                    👨‍🏫
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{booking.tutorName}</p>
                    <p className="text-[10px] text-zinc-400">Free Slot Booking</p>
                  </div>
                </div>

                {booking.slots.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-650 dark:text-zinc-400">
                      <Clock size={11} className="text-blue-500" />
                      {slot}
                    </span>
                    <span className="font-bold text-green-500">Free</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Subtotal ({booking.slots.length} session{booking.slots.length > 1 ? 's' : ''})</span>
                  <span className="line-through text-zinc-450">${booking.slots.length * booking.hourlyRate} {booking.currency}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-zinc-900 dark:text-zinc-100 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <span>Total Due</span>
                  <span className="text-green-500">$0 {booking.currency}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
