"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Settings, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Calendar dates range
  const [calendarRange, setCalendarRange] = useState<{start: string, end: string}>(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(today.getFullYear(), today.getMonth() + 12, 0).toISOString().slice(0, 10);
    return { start, end };
  });

  const [calendarData, setCalendarData] = useState<Record<string, string>>({});
  const [isCalendarRangeModalOpen, setIsCalendarRangeModalOpen] = useState(false);
  const [calendarRangeDraft, setCalendarRangeDraft] = useState(calendarRange);

  // Helper to generate calendar days between two dates
  function getCalendarDays(start: string, end: string) {
    const days = [];
    let current = new Date(start);
    const last = new Date(end);
    while (current <= last) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }

  // Helper to group days by month for table rendering
  function groupDaysByMonth(days: Date[]) {
    const months: Record<string, Date[]> = {};
    days.forEach(day => {
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}`;
      if (!months[key]) months[key] = [];
      months[key].push(day);
    });
    return months;
  }

  // Load calendar state from Supabase on mount
  useEffect(() => {
    async function loadCalendarState() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }
      setUserId(user.id);
      
      const { data: calendarDataResult } = await supabase
        .from('dashboard_calendar')
        .select('content')
        .eq('user_id', user.id)
        .eq('title', 'main_calendar')
        .maybeSingle();
        
      if (calendarDataResult?.content) {
        setCalendarRange(calendarDataResult.content.calendarRange || calendarRange);
        setCalendarData(calendarDataResult.content.calendarData || {});
      }
      setLoading(false);
    }
    loadCalendarState();
  }, [router, supabase]);

  // Save calendar to Supabase on change (debounced)
  useEffect(() => {
    if (!userId) return;
    const handler = setTimeout(async () => {
      try {
        const { data: existingCalendar } = await supabase
          .from('dashboard_calendar')
          .select('id')
          .eq('user_id', userId)
          .eq('title', 'main_calendar')
          .maybeSingle();
        
        if (existingCalendar) {
          await supabase
            .from('dashboard_calendar')
            .update({ 
              content: { calendarRange, calendarData }
            })
            .eq('id', existingCalendar.id);
        } else {
          await supabase
            .from('dashboard_calendar')
            .insert({
              user_id: userId,
              title: 'main_calendar',
              content: { calendarRange, calendarData }
            });
        }
      } catch (error) {
        console.error('Error saving calendar:', error);
      }
    }, 1000); // 1s debounce
    return () => clearTimeout(handler);
  }, [calendarRange, calendarData, userId, supabase]);

  const days = getCalendarDays(calendarRange.start, calendarRange.end);
  const months = groupDaysByMonth(days);

  return (
    <div className="flex-1 w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-0 flex flex-col p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full mx-auto space-y-6 flex-1 flex flex-col">
        {/* Header toolbar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200 uppercase tracking-wider btn-notion-white"
            >
              <ArrowLeft size={13} />
              Dashboard
            </Link>
          </div>
 
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCalendarRangeDraft(calendarRange);
                setIsCalendarRangeModalOpen(true);
              }}
              className="flex items-center gap-1.5 btn-notion-white"
            >
              <Settings size={14} />
              Date Range
            </button>
          </div>
        </div>

        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Revision Calendar</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Maintain your study syllabus, track exam schedules, and keep study notes.
          </p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs uppercase text-zinc-400 font-bold tracking-widest">
            Loading Calendar...
          </div>
        ) : (
          <div className="flex-1 space-y-8 overflow-y-auto pr-1">
            {days.length === 0 ? (
              <div className="text-zinc-400 text-center font-semibold py-12">No days in selected range</div>
            ) : (
              Object.entries(months).map(([monthKey, monthDays]) => {
                const firstDay = monthDays[0];
                const year = firstDay.getFullYear();
                const monthName = firstDay.toLocaleString('default', { month: 'long' });
                const firstWeekday = new Date(year, firstDay.getMonth(), 1).getDay();
                
                const weeks: (Date|null)[][] = [[]];
                let week = weeks[0];
                for (let i = 0; i < firstWeekday; ++i) week.push(null);
                monthDays.forEach((date) => {
                  if (week.length === 7) {
                    week = [];
                    weeks.push(week);
                  }
                  week.push(date);
                });
                while (week.length < 7) week.push(null);
                
                return (
                  <div key={monthKey} className="border border-zinc-200 dark:border-zinc-850 rounded overflow-hidden bg-white dark:bg-zinc-900">
                    <div className="text-sm font-bold py-3 text-center bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-850">
                      {monthName} {year}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                        <thead>
                          <tr className="bg-zinc-100/50 dark:bg-zinc-955/50 text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>(
                              <th key={d} className="py-2 border-b border-zinc-200 dark:border-zinc-855 bg-zinc-50 dark:bg-zinc-900 font-bold">
                                {d}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {weeks.map((weekItem,wi)=>(
                            <tr key={wi}>
                              {weekItem.map((date,di)=>(
                                <td key={di} className="align-top border border-zinc-150 dark:border-zinc-800 h-28 relative p-0 bg-transparent">
                                  {date && (
                                    <div className="flex flex-col h-full">
                                      <div className="p-1 flex justify-between">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                          date.toDateString() === new Date().toDateString() 
                                            ? 'bg-red-500 text-white' 
                                            : 'text-zinc-400'
                                        }`}>
                                          {date.getDate()}
                                        </span>
                                      </div>
                                      <textarea
                                        className="w-full flex-1 resize-none m-0 px-2 pb-2 bg-transparent border-none outline-none text-[11px] text-zinc-800 dark:text-zinc-200 no-scrollbar focus:bg-zinc-50/50 dark:focus:bg-zinc-800/10"
                                        value={calendarData[date.toISOString().slice(0,10)]||''}
                                        onChange={e=>setCalendarData(d=>({...d,[date.toISOString().slice(0,10)]:e.target.value}))}
                                        placeholder="..."
                                      />
                                    </div>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Date Range Selector Modal */}
        {isCalendarRangeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm" onClick={() => setIsCalendarRangeModalOpen(false)}>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-450 mb-4 text-left">Set Calendar Date Range</h3>
              <div className="mb-4 space-y-1 text-left">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Start Date</label>
                <input type="date" value={calendarRangeDraft.start} onChange={e=>setCalendarRangeDraft(r=>({...r,start:e.target.value}))} className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 rounded p-2 text-xs font-semibold focus:border-zinc-400 dark:focus:border-zinc-600 outline-none transition-colors" />
              </div>
              <div className="mb-6 space-y-1 text-left">
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">End Date</label>
                <input type="date" value={calendarRangeDraft.end} onChange={e=>setCalendarRangeDraft(r=>({...r,end:e.target.value}))} className="w-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 rounded p-2 text-xs font-semibold focus:border-zinc-400 dark:focus:border-zinc-600 outline-none transition-colors" />
              </div>
              <div className="flex justify-end space-x-2">
                <button onClick={()=>setIsCalendarRangeModalOpen(false)} className="btn-notion-grey">Cancel</button>
                <button onClick={()=>{setCalendarRange(calendarRangeDraft);setIsCalendarRangeModalOpen(false);}} className="btn-notion-blue">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
