"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Paintbrush, X } from 'lucide-react';

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Calendar dates range: dynamic from 6 months ago to 18 months in the future
  const [calendarRange, setCalendarRange] = useState<{start: string, end: string}>(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 6, 1).toISOString().slice(0, 10);
    const end = new Date(today.getFullYear(), today.getMonth() + 18, 0).toISOString().slice(0, 10);
    return { start, end };
  });

  const [calendarData, setCalendarData] = useState<Record<string, string>>({});
  const [calendarHighlights, setCalendarHighlights] = useState<Record<string, 'green' | 'red' | 'blue' | 'yellow' | 'none'>>({});
  const [activePaintColor, setActivePaintColor] = useState<'green' | 'red' | 'blue' | 'yellow' | 'none'>('none');
  const [currentVisibleMonth, setCurrentVisibleMonth] = useState<string>('');
  
  // Collapsible control panel state
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Automatically collapse on mobile/tablet view initially
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsPanelOpen(false);
    }
  }, []);

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

  // Helper to group days by month for grid rendering
  function groupDaysByMonth(daysList: Date[]) {
    const monthsObj: Record<string, Date[]> = {};
    daysList.forEach(day => {
      const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}`;
      if (!monthsObj[key]) monthsObj[key] = [];
      monthsObj[key].push(day);
    });
    return monthsObj;
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
        setCalendarData(calendarDataResult.content.calendarData || {});
        setCalendarHighlights(calendarDataResult.content.calendarHighlights || {});
      }
      
      setLoading(false);
    }
    loadCalendarState();
  }, [router, supabase]);

  // Save calendar content to Supabase on change (debounced)
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
              content: { calendarRange, calendarData, calendarHighlights }
            })
            .eq('id', existingCalendar.id);
        } else {
          await supabase
            .from('dashboard_calendar')
            .insert({
              user_id: userId,
              title: 'main_calendar',
              content: { calendarRange, calendarData, calendarHighlights }
            });
        }
      } catch (error) {
        console.error('Error saving calendar:', error);
      }
    }, 1000); // 1s debounce
    return () => clearTimeout(handler);
  }, [calendarRange, calendarData, calendarHighlights, userId, supabase]);

  const days = getCalendarDays(calendarRange.start, calendarRange.end);
  const months = groupDaysByMonth(days);

  // Scroll to today's date cell after load is finished
  useEffect(() => {
    if (!loading) {
      setTimeout(() => {
        const todayEl = document.getElementById('today-cell');
        if (todayEl) {
          todayEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 300);
    }
  }, [loading]);

  // Track visible month in viewport
  useEffect(() => {
    if (loading) return;

    const container = document.getElementById('calendar-months-container');
    if (!container) return;

    const observerOptions = {
      root: container,
      rootMargin: '-50px 0px -50px 0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const monthKey = entry.target.id.replace('month-', '');
          setCurrentVisibleMonth(monthKey);
        }
      });
    }, observerOptions);

    const monthElements = container.querySelectorAll('[id^="month-"]');
    monthElements.forEach((el) => observer.observe(el));

    return () => {
      monthElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [loading]);

  // Day paint highlighting
  const handleDayClick = (dateStr: string) => {
    if (activePaintColor === 'none') {
      setCalendarHighlights(prev => {
        const copy = { ...prev };
        delete copy[dateStr];
        return copy;
      });
      return;
    }
    setCalendarHighlights(prev => ({
      ...prev,
      [dateStr]: activePaintColor
    }));
  };

  const handleTextareaChange = (dateStr: string, val: string) => {
    setCalendarData(d => ({ ...d, [dateStr]: val }));
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-955 text-zinc-900 dark:text-zinc-100 flex flex-col p-0 md:p-6">
      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col min-h-0 relative">

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs uppercase text-zinc-400 font-bold tracking-widest">
            Loading Calendar...
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch relative w-full min-h-0">
            {/* Calendar Month Lists */}
            <div id="calendar-months-container" className="flex-1 space-y-8 overflow-y-auto pr-1 h-full no-scrollbar scroll-smooth w-full pb-20 sm:pb-4">
              {days.length === 0 ? (
                <div className="text-zinc-400 text-center font-semibold py-12">No days in selected range</div>
              ) : (
                Object.entries(months).map(([monthKey, monthDays]) => {
                  const firstDay = monthDays[0];
                  const year = firstDay.getFullYear();
                  const monthName = firstDay.toLocaleString('default', { month: 'long' });
                  const firstWeekday = new Date(year, firstDay.getMonth(), 1).getDay();
                  
                  const gridItems: (Date | null)[] = [];
                  for (let i = 0; i < firstWeekday; i++) {
                    gridItems.push(null);
                  }
                  monthDays.forEach(date => gridItems.push(date));
                  
                  return (
                    <div id={`month-${monthKey}`} key={monthKey} className="space-y-3 scroll-mt-6 px-4 sm:px-0">
                      <h2 className="text-xl sm:text-2xl font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider pl-1">
                        {monthName} {year}
                      </h2>
                      
                      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 bg-zinc-150/60 dark:bg-zinc-900/60 rounded-xl p-1">
                        {/* Day Names Header */}
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, index) => (
                          <div key={index} className="text-center py-1 text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            {d}
                          </div>
                        ))}
                        
                        {/* Day Cells */}
                        {gridItems.map((date, idx) => {
                          if (!date) {
                            return (
                              <div key={`empty-${idx}`} className="h-16 sm:h-24 bg-zinc-50/20 dark:bg-zinc-955/10 rounded-lg border border-transparent"></div>
                            );
                          }
                          
                          const dateStr = date.toISOString().slice(0, 10);
                          const highlightColor = calendarHighlights[dateStr] || 'none';
                          
                          // Color mapping – solid background, white text, no border
                          const HIGHLIGHT_COLORS: Record<string, string> = {
                            green: '#53D769',
                            red: '#FC3D39',
                            blue: '#147EFB',
                            yellow: '#FFCC00',
                          };
                          
                          let inlineStyle: React.CSSProperties = {};
                          const solidColor = HIGHLIGHT_COLORS[highlightColor];
                          if (solidColor) {
                            inlineStyle = { backgroundColor: solidColor, borderColor: 'transparent', color: '#fff' };
                          }
                          
                          const isToday = date.toDateString() === new Date().toDateString();
                          
                          return (
                            <div 
                              key={dateStr}
                              id={isToday ? "today-cell" : undefined}
                              onClick={() => handleDayClick(dateStr)}
                              style={inlineStyle}
                              className={`flex flex-col h-16 sm:h-24 rounded-lg transition-all relative p-1 sm:p-1.5 cursor-pointer group ${
                                highlightColor === 'none' 
                                  ? 'bg-white dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xs' 
                                  : 'border-0'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-0.5">
                                <span 
                                  className={`text-[10px] sm:text-[13px] font-bold px-1 py-0 rounded-md mb-0.5 sm:mb-1 flex items-center justify-center ${
                                    isToday && solidColor
                                      ? 'bg-white font-black'
                                      : isToday 
                                        ? 'bg-red-500 text-white font-black' 
                                        : solidColor
                                          ? 'text-white/90'
                                          : 'text-zinc-400 group-hover:text-zinc-650 dark:group-hover:text-zinc-200'
                                  }`}
                                  style={isToday && solidColor ? { color: solidColor } : undefined}
                                >
                                  {date.getDate()}
                                </span>
                              </div>
                              <textarea
                                onClick={e => e.stopPropagation()}
                                className={`w-full flex-grow resize-none m-0 px-1 pb-0.5 bg-transparent border-none outline-none text-[9px] sm:text-[12px] font-bold no-scrollbar focus:ring-0 leading-tight ${
                                  solidColor ? 'text-white/90 placeholder-white/40' : 'text-zinc-700 dark:text-zinc-300'
                                }`}
                                value={calendarData[dateStr] || ''}
                                onChange={e => handleTextareaChange(dateStr, e.target.value)}
                                placeholder=""
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Toggle Panel Button (Displays when panel is closed) */}
            {!isPanelOpen && (
              <button
                onClick={() => setIsPanelOpen(true)}
                className="absolute bottom-6 right-6 z-30 p-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-zinc-200/20 dark:border-zinc-800/20"
                title="Open Brush Tool"
              >
                <Paintbrush size={20} />
              </button>
            )}

            {/* Floating Collapsible Control Panel (Overlayed at bottom right) */}
            {isPanelOpen && (
              <aside className="absolute bottom-6 right-6 z-30 w-[calc(100%-3rem)] sm:w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-4 shadow-xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    <Paintbrush size={13} className="text-blue-500" />
                    <span>Highlight Brush</span>
                  </div>
                  <button
                    onClick={() => setIsPanelOpen(false)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer text-zinc-400 hover:text-zinc-650"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  <button 
                    onClick={() => setActivePaintColor('none')}
                    className={`h-7 rounded-md border text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                      activePaintColor === 'none' 
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black' 
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-300'
                    }`}
                    title="Brush Eraser"
                  >
                    Clear
                  </button>
                  <button 
                    onClick={() => setActivePaintColor('green')}
                    style={{ backgroundColor: '#53D769', color: '#fff' }}
                    className={`h-7 rounded-md text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                      activePaintColor === 'green' ? 'ring-2 ring-[#53D769] ring-offset-1 dark:ring-offset-zinc-900' : ''
                    }`}
                    title="Study (Green)"
                  >
                    Study
                  </button>
                  <button 
                    onClick={() => setActivePaintColor('red')}
                    style={{ backgroundColor: '#FC3D39', color: '#fff' }}
                    className={`h-7 rounded-md text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                      activePaintColor === 'red' ? 'ring-2 ring-[#FC3D39] ring-offset-1 dark:ring-offset-zinc-900' : ''
                    }`}
                    title="Exam (Red)"
                  >
                    Exam
                  </button>
                  <button 
                    onClick={() => setActivePaintColor('blue')}
                    style={{ backgroundColor: '#147EFB', color: '#fff' }}
                    className={`h-7 rounded-md text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                      activePaintColor === 'blue' ? 'ring-2 ring-[#147EFB] ring-offset-1 dark:ring-offset-zinc-900' : ''
                    }`}
                    title="Revise (Blue)"
                  >
                    Revise
                  </button>
                  <button 
                    onClick={() => setActivePaintColor('yellow')}
                    style={{ backgroundColor: '#FFCC00', color: '#fff' }}
                    className={`h-7 rounded-md text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                      activePaintColor === 'yellow' ? 'ring-2 ring-[#FFCC00] ring-offset-1 dark:ring-offset-zinc-900' : ''
                    }`}
                    title="Rest (Yellow)"
                  >
                    Rest
                  </button>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
