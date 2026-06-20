"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Star, Clock, Globe, Calendar, ChevronRight, GraduationCap, Users, Award, Check } from 'lucide-react';

interface TimeSlot {
  id: string;
  day: string;
  time: string;
  available: boolean;
}

interface Tutor {
  id: string;
  name: string;
  avatar: string;
  subjects: string[];
  rating: number;
  reviews: number;
  hourlyRate: number;
  currency: string;
  bio: string;
  qualifications: string[];
  languages: string[];
  schedule: TimeSlot[];
}

const tutors: Tutor[] = [
  {
    id: 'tutor-1',
    name: 'Dr. Sarah Chen',
    avatar: '👩‍🔬',
    subjects: ['Physics', 'Mathematics'],
    rating: 4.9,
    reviews: 127,
    hourlyRate: 45,
    currency: 'GBP',
    bio: 'PhD in Theoretical Physics from Imperial College London. 8+ years tutoring A-Level and IAL students with a 95% A*-A success rate.',
    qualifications: ['PhD Physics — Imperial College', 'PGCE Qualified', 'Edexcel Examiner'],
    languages: ['English', 'Mandarin'],
    schedule: [
      { id: 's1-1', day: 'Mon', time: '09:00', available: true },
      { id: 's1-2', day: 'Mon', time: '10:00', available: true },
      { id: 's1-3', day: 'Mon', time: '14:00', available: false },
      { id: 's1-4', day: 'Tue', time: '09:00', available: true },
      { id: 's1-5', day: 'Tue', time: '11:00', available: true },
      { id: 's1-6', day: 'Wed', time: '10:00', available: true },
      { id: 's1-7', day: 'Wed', time: '15:00', available: false },
      { id: 's1-8', day: 'Thu', time: '09:00', available: true },
      { id: 's1-9', day: 'Thu', time: '13:00', available: true },
      { id: 's1-10', day: 'Fri', time: '10:00', available: true },
      { id: 's1-11', day: 'Fri', time: '14:00', available: true },
      { id: 's1-12', day: 'Sat', time: '10:00', available: true },
    ],
  },
  {
    id: 'tutor-2',
    name: 'Mr. James Okafor',
    avatar: '👨‍🏫',
    subjects: ['Chemistry', 'Biology'],
    rating: 4.8,
    reviews: 98,
    hourlyRate: 40,
    currency: 'GBP',
    bio: 'Former Head of Science at a top London grammar school. Specialist in Edexcel IAL Chemistry and Biology with a focus on exam technique.',
    qualifications: ['MSc Biochemistry — UCL', 'QTS Certified', '15 years teaching experience'],
    languages: ['English'],
    schedule: [
      { id: 's2-1', day: 'Mon', time: '11:00', available: true },
      { id: 's2-2', day: 'Mon', time: '16:00', available: true },
      { id: 's2-3', day: 'Tue', time: '10:00', available: false },
      { id: 's2-4', day: 'Tue', time: '14:00', available: true },
      { id: 's2-5', day: 'Wed', time: '09:00', available: true },
      { id: 's2-6', day: 'Wed', time: '11:00', available: true },
      { id: 's2-7', day: 'Thu', time: '10:00', available: true },
      { id: 's2-8', day: 'Thu', time: '15:00', available: false },
      { id: 's2-9', day: 'Fri', time: '09:00', available: true },
      { id: 's2-10', day: 'Fri', time: '11:00', available: true },
      { id: 's2-11', day: 'Sat', time: '09:00', available: true },
      { id: 's2-12', day: 'Sat', time: '11:00', available: true },
    ],
  },
  {
    id: 'tutor-3',
    name: 'Ms. Lin Wei',
    avatar: '👩‍💼',
    subjects: ['Chinese', 'English A', 'English B'],
    rating: 5.0,
    reviews: 64,
    hourlyRate: 38,
    currency: 'GBP',
    bio: 'Native Mandarin speaker with a degree in English Literature. Specialises in IGCSE Chinese and English Language preparation.',
    qualifications: ['BA English Literature — Cambridge', 'HSK Level 6 Certified', 'DELTA Qualified'],
    languages: ['English', 'Mandarin', 'Cantonese'],
    schedule: [
      { id: 's3-1', day: 'Mon', time: '10:00', available: true },
      { id: 's3-2', day: 'Mon', time: '14:00', available: true },
      { id: 's3-3', day: 'Tue', time: '09:00', available: true },
      { id: 's3-4', day: 'Tue', time: '15:00', available: false },
      { id: 's3-5', day: 'Wed', time: '10:00', available: true },
      { id: 's3-6', day: 'Wed', time: '14:00', available: true },
      { id: 's3-7', day: 'Thu', time: '11:00', available: true },
      { id: 's3-8', day: 'Thu', time: '16:00', available: true },
      { id: 's3-9', day: 'Fri', time: '10:00', available: false },
      { id: 's3-10', day: 'Fri', time: '13:00', available: true },
      { id: 's3-11', day: 'Sat', time: '10:00', available: true },
      { id: 's3-12', day: 'Sat', time: '14:00', available: true },
    ],
  },
];

export default function TutorsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setLoading(false);
    }
    checkAuth();
  }, [router, supabase]);

  const toggleSlot = (slotId: string) => {
    setSelectedSlots(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    );
  };

  const handleBookNow = () => {
    if (!selectedTutor || selectedSlots.length === 0) return;
    const bookingData = {
      tutorId: selectedTutor.id,
      tutorName: selectedTutor.name,
      hourlyRate: selectedTutor.hourlyRate,
      currency: selectedTutor.currency,
      slots: selectedSlots.map(id => {
        const slot = selectedTutor.schedule.find(s => s.id === id);
        return slot ? `${slot.day} ${slot.time}` : id;
      }),
    };
    localStorage.setItem('checkout_booking', JSON.stringify(bookingData));
    router.push('/tutors/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading Tutors...</p>
      </div>
    );
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-white">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,#147EFB,transparent_60%)]" />
        <div className="max-w-6xl mx-auto px-6 py-12 relative">
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap size={28} className="text-blue-400" />
            <h1 className="text-3xl font-black tracking-tight">Find a Tutor</h1>
          </div>
          <p className="text-sm text-zinc-400 max-w-lg">
            Book one-on-one sessions with expert tutors specialising in Edexcel IAL and IGCSE examinations.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tutor Cards */}
        <div className="grid gap-6 lg:grid-cols-3 mb-10">
          {tutors.map(tutor => {
            const isSelected = selectedTutor?.id === tutor.id;
            return (
              <button
                key={tutor.id}
                onClick={() => {
                  setSelectedTutor(isSelected ? null : tutor);
                  setSelectedSlots([]);
                }}
                className={`text-left bg-white dark:bg-zinc-900 rounded-2xl p-5 border-2 transition-all cursor-pointer hover:shadow-lg ${
                  isSelected
                    ? 'border-blue-500 shadow-blue-500/10 shadow-lg'
                    : 'border-zinc-200/60 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl">
                    {tutor.avatar}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{tutor.name}</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Star size={11} className="text-amber-400 fill-amber-400" />
                      <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{tutor.rating}</span>
                      <span className="text-[10px] text-zinc-400">({tutor.reviews} reviews)</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">£{tutor.hourlyRate}</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase">/hour</p>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-3 leading-relaxed line-clamp-2">{tutor.bio}</p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {tutor.subjects.map(s => (
                    <span key={s} className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Globe size={10} />
                    {tutor.languages.join(', ')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Award size={10} />
                    {tutor.qualifications.length} credentials
                  </span>
                </div>

                {isSelected && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-bold text-blue-500 flex items-center gap-1">
                      <Check size={12} />
                      Selected — Choose time slots below
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Schedule Section */}
        {selectedTutor && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-500" />
                  {selectedTutor.name}'s Schedule
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Select one or more available slots to book</p>
              </div>
              {selectedSlots.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500">
                    {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} • <strong className="text-zinc-900 dark:text-zinc-100">£{selectedSlots.length * selectedTutor.hourlyRate}</strong>
                  </span>
                  <button
                    onClick={handleBookNow}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    Book Now
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>

            {/* Schedule Grid */}
            <div className="grid grid-cols-6 gap-2">
              {weekDays.map(day => (
                <div key={day} className="space-y-2">
                  <div className="text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400 pb-1 border-b border-zinc-100 dark:border-zinc-800">
                    {day}
                  </div>
                  {selectedTutor.schedule
                    .filter(s => s.day === day)
                    .map(slot => {
                      const isSlotSelected = selectedSlots.includes(slot.id);
                      return (
                        <button
                          key={slot.id}
                          onClick={() => slot.available && toggleSlot(slot.id)}
                          disabled={!slot.available}
                          className={`w-full py-2.5 rounded-lg text-[11px] font-bold transition-all ${
                            !slot.available
                              ? 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-300 dark:text-zinc-600 cursor-not-allowed line-through'
                              : isSlotSelected
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 cursor-pointer'
                                : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer'
                          }`}
                        >
                          {slot.time}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>

            {/* Qualifications */}
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Qualifications</h4>
              <div className="flex flex-wrap gap-2">
                {selectedTutor.qualifications.map((q, i) => (
                  <span key={i} className="px-2.5 py-1 text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
