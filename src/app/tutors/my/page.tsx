"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Calendar, Clock, MessageSquare, Trash2, GraduationCap } from 'lucide-react';

interface BookedTutor {
  tutorId: string;
  tutorName: string;
  slots: string[];
  status: 'pending' | 'approved';
  bookedAt: string;
}

const tutorsList = [
  { id: 'tutor-caris', avatar: '🧑‍🔬' },
  { id: 'tutor-toby', avatar: '👨‍⚕️' }
];

export default function MyTutorsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [bookedTutors, setBookedTutors] = useState<BookedTutor[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Fetch bookings from Supabase tutor_bookings table
      const { data: dbBookings } = await supabase
        .from('tutor_bookings')
        .select('*')
        .eq('user_id', user.id);

      const mergedMap = new Map<string, BookedTutor>();

      // Read local storage booked list fallback
      try {
        const savedLocal = localStorage.getItem('precision_edu_booked_tutors');
        if (savedLocal) {
          const parsed = JSON.parse(savedLocal);
          parsed.forEach((b: any) => {
            mergedMap.set(b.tutorId, {
              tutorId: b.tutorId,
              tutorName: b.tutorName,
              slots: b.slots,
              status: 'pending',
              bookedAt: b.bookedAt || new Date().toISOString()
            });
          });
        }
      } catch (err) {
        console.error(err);
      }

      // Merge and override with Supabase bookings
      if (dbBookings) {
        dbBookings.forEach((sb: any) => {
          mergedMap.set(sb.tutor_id, {
            tutorId: sb.tutor_id,
            tutorName: sb.tutor_name,
            slots: sb.slots,
            status: sb.status || 'pending',
            bookedAt: sb.created_at
          });
        });
      }

      setBookedTutors(Array.from(mergedMap.values()));
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const handleCancelBooking = async (tutorId: string) => {
    if (!confirm("Are you sure you want to cancel your bookings with this tutor?")) return;
    
    // Delete from Supabase
    if (userId) {
      await supabase
        .from('tutor_bookings')
        .delete()
        .eq('user_id', userId)
        .eq('tutor_id', tutorId);
    }

    const updated = bookedTutors.filter(b => b.tutorId !== tutorId);
    setBookedTutors(updated);
    localStorage.setItem('precision_edu_booked_tutors', JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading Bookings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-955 py-10 px-6 select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <GraduationCap size={24} className="text-blue-500" />
            My Booked Tutors
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Manage slots and direct messages for all tutors you have reached out to.</p>
        </div>

        {bookedTutors.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-6">
            <Calendar size={36} className="text-zinc-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">No Active Tutor Bookings</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mb-6">
              You have not scheduled any tutoring sessions yet. Browse our selection and pick slots to start learning.
            </p>
            <button
              onClick={() => router.push('/tutors')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
            >
              Browse Tutors
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {bookedTutors.map(booked => {
              const tutorObj = tutorsList.find(t => t.id === booked.tutorId) || { avatar: '👨‍🏫' };
              return (
                <div 
                  key={booked.tutorId} 
                  className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl">
                        {tutorObj.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{booked.tutorName}</h3>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            booked.status === 'approved'
                              ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                          }`}>
                            {booked.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-450 mt-0.5">Active DM inquiry</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/chat?tutor=${booked.tutorId}`)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:text-blue-400 rounded-lg cursor-pointer transition-colors"
                        title="Chat with Tutor"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        onClick={() => handleCancelBooking(booked.tutorId)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 rounded-lg cursor-pointer transition-colors"
                        title="Cancel Booking"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Scheduled slots list */}
                  {booked.slots && booked.slots.length > 0 && (
                    <div className="space-y-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Booked slots</p>
                      <div className="flex flex-wrap gap-2">
                        {booked.slots.map((slot, i) => (
                          <span 
                            key={i} 
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50 flex items-center gap-1.5"
                          >
                            <Clock size={10} className="text-blue-500" />
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
