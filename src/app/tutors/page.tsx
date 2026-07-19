"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Star, Clock, Globe, Calendar, ChevronRight, GraduationCap, Award, Check, MessageSquare } from 'lucide-react';

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

interface BookedTutor {
  tutorId: string;
  tutorName: string;
  slots: string[];
  status: 'pending' | 'approved';
  bookedAt: string;
}

const tutors: Tutor[] = [
  {
    id: 'tutor-caris',
    name: 'Caris Ng',
    avatar: '🧑‍🔬',
    subjects: ['Maths', 'Physics'],
    rating: 4.9,
    reviews: 32,
    hourlyRate: 280,
    currency: 'HKD',
    bio: 'University College London. Having completed the 2025 IAL exams, I am familiar with the latest exam formats and question styles. With over four years of tutoring experience, I understand the challenges students encounter.',
    qualifications: ['University College London', '4+ years tutoring', 'Student results: IGCSE Physics A* from scratch', 'IAS Physics full UMS (300/300) from B', 'IAS Maths full UMS (300/300) from B'],
    languages: ['English', 'Cantonese'],
    schedule: [
      { id: 'sc-1', day: 'Mon', time: '16:00', available: true },
      { id: 'sc-2', day: 'Mon', time: '17:00', available: true },
      { id: 'sc-3', day: 'Tue', time: '16:00', available: true },
      { id: 'sc-4', day: 'Tue', time: '17:00', available: false },
      { id: 'sc-5', day: 'Wed', time: '16:00', available: true },
      { id: 'sc-6', day: 'Wed', time: '17:00', available: true },
      { id: 'sc-7', day: 'Thu', time: '16:00', available: true },
      { id: 'sc-8', day: 'Thu', time: '17:00', available: false },
      { id: 'sc-9', day: 'Fri', time: '16:00', available: true },
      { id: 'sc-10', day: 'Fri', time: '17:00', available: true },
      { id: 'sc-11', day: 'Sat', time: '10:00', available: true },
      { id: 'sc-12', day: 'Sat', time: '11:00', available: true },
    ],
  },
  {
    id: 'tutor-toby',
    name: 'Toby Leung',
    avatar: '👨‍⚕️',
    subjects: ['IELTS', 'Veterinary Prep', 'Dental Prep'],
    rating: 5.0,
    reviews: 18,
    hourlyRate: 280,
    currency: 'HKD',
    bio: 'Royal Veterinary College. Having earned offers from four top-tier vet schools and HKU Dentistry, I bring firsthand insight into what leading universities seek. I offer personalized sessions on personal statements and interview techniques.',
    qualifications: ['Royal Veterinary College', 'Offers from 4 top vet schools + HKU Dentistry', 'Personal statement specialist', 'Interview technique coaching'],
    languages: ['English', 'Cantonese'],
    schedule: [
      { id: 'st-1', day: 'Mon', time: '18:00', available: true },
      { id: 'st-2', day: 'Mon', time: '19:00', available: true },
      { id: 'st-3', day: 'Tue', time: '18:00', available: false },
      { id: 'st-4', day: 'Tue', time: '19:00', available: true },
      { id: 'st-5', day: 'Wed', time: '18:00', available: true },
      { id: 'st-6', day: 'Wed', time: '19:00', available: true },
      { id: 'st-7', day: 'Thu', time: '18:00', available: true },
      { id: 'st-8', day: 'Thu', time: '19:00', available: false },
      { id: 'st-9', day: 'Fri', time: '18:00', available: true },
      { id: 'st-10', day: 'Fri', time: '19:00', available: true },
      { id: 'st-11', day: 'Sat', time: '14:00', available: true },
      { id: 'st-12', day: 'Sat', time: '15:00', available: true },
    ],
  },
  {
    id: 'tutor-donata',
    name: 'Donata Yip',
    avatar: '👩‍🔬',
    subjects: ['Biology', 'Chemistry'],
    rating: 4.8,
    reviews: 24,
    hourlyRate: 280,
    currency: 'HKD',
    bio: 'The Hong Kong Polytechnic University. My deep love for science has shaped both my academic success and the way I teach. I take time to understand each learner, teach students to think like examiners, and build their confidence.',
    qualifications: ['The Hong Kong Polytechnic University', 'IAL Biology & Chemistry specialist', 'Exam technique focused', 'Personalised study plans'],
    languages: ['English', 'Cantonese'],
    schedule: [
      { id: 'sd-1', day: 'Mon', time: '15:00', available: true },
      { id: 'sd-2', day: 'Mon', time: '16:00', available: true },
      { id: 'sd-3', day: 'Tue', time: '15:00', available: true },
      { id: 'sd-4', day: 'Tue', time: '16:00', available: true },
      { id: 'sd-5', day: 'Wed', time: '15:00', available: false },
      { id: 'sd-6', day: 'Wed', time: '16:00', available: true },
      { id: 'sd-7', day: 'Thu', time: '15:00', available: true },
      { id: 'sd-8', day: 'Thu', time: '16:00', available: true },
      { id: 'sd-9', day: 'Fri', time: '15:00', available: true },
      { id: 'sd-10', day: 'Fri', time: '16:00', available: false },
      { id: 'sd-11', day: 'Sat', time: '09:00', available: true },
      { id: 'sd-12', day: 'Sat', time: '10:00', available: true },
    ],
  },
];

export default function TutorsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookedTutors, setBookedTutors] = useState<BookedTutor[]>([]);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('Student');

  useEffect(() => {
    async function loadData() {
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
      }

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

  const handleTalkToTutor = async (tutor: Tutor) => {
    if (!userId) {
      router.push('/auth');
      return;
    }

    const existing = bookedTutors.find(b => b.tutorId === tutor.id);
    if (existing) {
      router.push(`/chat?tutor=${tutor.id}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('tutor_bookings')
        .insert({
          user_id: userId,
          username: username,
          tutor_id: tutor.id,
          tutor_name: tutor.name,
          slots: [],
          status: 'pending'
        });

      if (error) console.error("Failed to insert DM record:", error);

      const currentBookedStr = localStorage.getItem('precision_edu_booked_tutors') || '[]';
      const bookedList = JSON.parse(currentBookedStr);
      bookedList.push({
        tutorId: tutor.id,
        tutorName: tutor.name,
        slots: [],
        status: 'pending',
        bookedAt: new Date().toISOString()
      });
      localStorage.setItem('precision_edu_booked_tutors', JSON.stringify(bookedList));
      
      router.push(`/chat?tutor=${tutor.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Loading Tutors...</p>
      </div>
    );
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-955 dark:via-zinc-900 dark:to-zinc-955 text-white select-none">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,#147EFB,transparent_60%)]" />
        <div className="max-w-6xl mx-auto px-6 py-12 relative">
          <div className="flex items-center gap-3 mb-3">
            <GraduationCap size={28} className="text-blue-400" />
            <h1 className="text-3xl font-black tracking-tight">Expert Tutors</h1>
          </div>
          <p className="text-sm text-zinc-400 max-w-lg">
            Book one-on-one sessions with expert tutors specialising in Edexcel IAL and IGCSE examinations.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tutor Cards Grid */}
        <div className="grid gap-6 lg:grid-cols-3 mb-10 select-none">
          {tutors.map(tutor => {
            const isSelected = selectedTutor?.id === tutor.id;
            const hasBooked = bookedTutors.some(b => b.tutorId === tutor.id);
            return (
              <div
                key={tutor.id}
                className={`bg-white dark:bg-zinc-900 rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 shadow-blue-500/10 shadow-lg'
                    : 'border-zinc-200/60 dark:border-zinc-800/60 hover:border-zinc-350 dark:hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl">
                      {tutor.avatar}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{tutor.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">{tutor.rating}</span>
                        <span className="text-[10px] text-zinc-450">({tutor.reviews})</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">${tutor.hourlyRate}</p>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase">{tutor.currency}/hr</p>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-650 dark:text-zinc-400 mb-3 leading-relaxed line-clamp-3">{tutor.bio}</p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tutor.subjects.map(s => (
                      <span key={s} className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-mono">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-zinc-400 mb-5">
                    <span className="flex items-center gap-1">
                      <Globe size={10} />
                      {tutor.languages.join(', ')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Award size={10} />
                      {tutor.qualifications.length} credentials
                    </span>
                  </div>
                </div>

                {/* Bottom Action Grid */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => {
                      setSelectedTutor(isSelected ? null : tutor);
                      setSelectedSlots([]);
                    }}
                    className={`py-2 text-[10px] font-bold rounded-xl transition cursor-pointer select-none text-center ${
                      isSelected
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400'
                        : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {isSelected ? 'Hide Slots' : 'Book Sessions'}
                  </button>
                  <button
                    onClick={() => handleTalkToTutor(tutor)}
                    className="py-2 text-[10px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1 cursor-pointer select-none"
                  >
                    <MessageSquare size={10} />
                    {hasBooked ? 'Open Chat' : 'Talk to Tutor'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Schedule Section */}
        {selectedTutor && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 p-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300 select-none">
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
                    {selectedSlots.length} slot{selectedSlots.length > 1 ? 's' : ''} • <strong className="text-zinc-900 dark:text-zinc-100">${selectedSlots.length * selectedTutor.hourlyRate} {selectedTutor.currency}</strong>
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
                              ? 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-300 dark:text-zinc-650 cursor-not-allowed line-through'
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
