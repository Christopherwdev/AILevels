"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Paintbrush, X, CalendarCheck } from 'lucide-react';

// Generate an array of Date objects for a given year-month (0-indexed month)
function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d++) days.push(new Date(year, month, d));
  return days;
}

// Returns { year, month } shifted by `delta` months from a base
function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

// Unique key for a month
function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [calendarData, setCalendarData] = useState<Record<string, string>>({});
  const [calendarHighlights, setCalendarHighlights] = useState<Record<string, 'green' | 'red' | 'blue' | 'yellow' | 'none'>>({});
  const [activePaintColor, setActivePaintColor] = useState<'green' | 'red' | 'blue' | 'yellow' | 'none'>('none');
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Infinite scroll: list of { year, month } to render
  const today = new Date();
  const [monthsList, setMonthsList] = useState<{ year: number; month: number }[]>(() => {
    const list = [];
    for (let i = -3; i <= 6; i++) {
      list.push(shiftMonth(today.getFullYear(), today.getMonth(), i));
    }
    return list;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);

  // Auto-collapse on mobile
  useEffect(() => {
    if (window.innerWidth < 1024) setIsPanelOpen(false);
  }, []);

  // Load from Supabase
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from('dashboard_calendar')
        .select('content')
        .eq('user_id', user.id)
        .eq('title', 'main_calendar')
        .maybeSingle();
      if (data?.content) {
        setCalendarData(data.content.calendarData || {});
        setCalendarHighlights(data.content.calendarHighlights || {});
      }
      setLoading(false);
    })();
  }, [router, supabase]);

  // Auto-save (debounced)
  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(async () => {
      try {
        const { data: existing } = await supabase
          .from('dashboard_calendar').select('id')
          .eq('user_id', userId).eq('title', 'main_calendar').maybeSingle();
        const payload = { calendarData, calendarHighlights };
        if (existing) {
          await supabase.from('dashboard_calendar').update({ content: payload }).eq('id', existing.id);
        } else {
          await supabase.from('dashboard_calendar').insert({ user_id: userId, title: 'main_calendar', content: payload });
        }
      } catch (e) { console.error(e); }
    }, 1200);
    return () => clearTimeout(t);
  }, [calendarData, calendarHighlights, userId, supabase]);

  // Scroll to today once loaded
  useEffect(() => {
    if (!loading && !initialScrollDone.current) {
      initialScrollDone.current = true;
      setTimeout(() => {
        document.getElementById('today-cell')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 150);
    }
  }, [loading]);

  // Prepend months when near top
  const prependMonths = useCallback(() => {
    setMonthsList(prev => {
      const first = prev[0];
      const newMonths = [];
      for (let i = 4; i >= 1; i--) {
        newMonths.push(shiftMonth(first.year, first.month, -i));
      }
      return [...newMonths, ...prev];
    });
  }, []);

  // Append months when near bottom
  const appendMonths = useCallback(() => {
    setMonthsList(prev => {
      const last = prev[prev.length - 1];
      const newMonths = [];
      for (let i = 1; i <= 4; i++) {
        newMonths.push(shiftMonth(last.year, last.month, i));
      }
      return [...prev, ...newMonths];
    });
  }, []);

  // IntersectionObserver for infinite scroll sentinels
  useEffect(() => {
    if (loading) return;
    const opts = { threshold: 0.1 };

    const topObs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        const container = containerRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;
        prependMonths();
        // Maintain scroll position after prepend
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop += container.scrollHeight - prevScrollHeight;
          }
        });
      }
    }, opts);

    const bottomObs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) appendMonths();
    }, opts);

    if (topSentinelRef.current) topObs.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) bottomObs.observe(bottomSentinelRef.current);

    return () => { topObs.disconnect(); bottomObs.disconnect(); };
  }, [loading, prependMonths, appendMonths]);

  const scrollToToday = () => {
    // Ensure today's month is in the list
    const tk = monthKey(today.getFullYear(), today.getMonth());
    const inList = monthsList.some(m => monthKey(m.year, m.month) === tk);
    if (!inList) {
      setMonthsList(prev => {
        const list = [];
        for (let i = -3; i <= 6; i++) list.push(shiftMonth(today.getFullYear(), today.getMonth(), i));
        return list;
      });
      setTimeout(() => {
        document.getElementById('today-cell')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 200);
    } else {
      document.getElementById('today-cell')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  };

  const handleDayClick = (dateStr: string) => {
    if (activePaintColor === 'none') {
      setCalendarHighlights(prev => { const c = { ...prev }; delete c[dateStr]; return c; });
    } else {
      setCalendarHighlights(prev => ({ ...prev, [dateStr]: activePaintColor }));
    }
  };

  const handleTextareaChange = (dateStr: string, val: string) => {
    setCalendarData(d => ({ ...d, [dateStr]: val }));
  };

  const HIGHLIGHT_COLORS: Record<string, string> = {
    green: 'var(--color-green-highlight)',
    red: 'var(--color-red-highlight)',
    blue: 'var(--color-blue-highlight)',
    yellow: 'var(--color-yellow-highlight)',
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col relative">

      {/* Floating Control Panel */}
      {isPanelOpen && (
        <aside className="absolute bottom-[84px] right-[24px] z-30 w-[calc(100%-3rem)] sm:w-72 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paintbrush size={13} className="text-blue-500" />
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Highlight</span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Today button */}
              <button
                onClick={scrollToToday}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Go to today"
              >
                <CalendarCheck size={11} />
                Today
              </button>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer text-zinc-400"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={() => setActivePaintColor('none')}
              className={`h-7 rounded-md border text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                activePaintColor === 'none'
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-black'
                  : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-650 dark:text-zinc-300'
              }`}
            >Clear</button>
            {(['green', 'red', 'blue', 'yellow'] as const).map(color => (
              <button
                key={color}
                onClick={() => setActivePaintColor(color)}
                className={`h-7 rounded-md text-[10px] font-bold flex items-center justify-center cursor-pointer transition-all capitalize`}
                style={{
                  backgroundColor: HIGHLIGHT_COLORS[color],
                  color: '#fff',
                  ...(activePaintColor === color ? { outline: `2px solid ${HIGHLIGHT_COLORS[color]}`, outlineOffset: '2px' } : {})
                }}
              >
                {color === 'green' ? 'Study' : color === 'red' ? 'Exam' : color === 'blue' ? 'Revise' : 'Rest'}
              </button>
            ))}
          </div>
        </aside>
      )}

      <div className="max-w-7xl w-full mx-auto flex-1 flex flex-col min-h-0 relative">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs uppercase text-zinc-400 font-bold tracking-widest">
            Loading…
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 relative w-full">
            {/* Scrollable calendar */}
            <div
              ref={containerRef}
              id="calendar-months-container"
              className="flex-1 overflow-y-auto w-full pb-24 sm:pb-6 px-4 sm:px-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              {/* Top sentinel — triggers prepend */}
              <div ref={topSentinelRef} className="h-1" />

              <div className="space-y-8">
                {monthsList.map(({ year, month }) => {
                  const mk = monthKey(year, month);
                  const days = getMonthDays(year, month);
                  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
                  const firstWeekday = new Date(year, month, 1).getDay();
                  const gridItems: (Date | null)[] = [];
                  for (let i = 0; i < firstWeekday; i++) gridItems.push(null);
                  days.forEach(d => gridItems.push(d));

                  return (
                    <div id={`month-${mk}`} key={mk} className="space-y-3 scroll-mt-6">
                      <h2 className="text-xl sm:text-2xl font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-wider pl-1">
                        {monthName} {year}
                      </h2>
                      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 bg-zinc-150/60 dark:bg-zinc-900/60 rounded-xl p-1">
                        {['S','M','T','W','T','F','S'].map((d, i) => (
                          <div key={i} className="text-center py-1 text-[9px] font-extrabold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{d}</div>
                        ))}
                        {gridItems.map((date, idx) => {
                          if (!date) return <div key={`e-${idx}`} className="h-16 sm:h-24 bg-zinc-50/20 dark:bg-zinc-950/10 rounded-lg border border-transparent" />;
                          const dateStr = date.toISOString().slice(0, 10);
                          const highlightColor = calendarHighlights[dateStr] || 'none';
                          const solidColor = HIGHLIGHT_COLORS[highlightColor];
                          const inlineStyle: React.CSSProperties = solidColor
                            ? { backgroundColor: solidColor, borderColor: 'transparent', color: '#fff' }
                            : {};
                          const isToday = date.toDateString() === today.toDateString();
                          return (
                            <div
                              key={dateStr}
                              id={isToday ? 'today-cell' : undefined}
                              onClick={() => handleDayClick(dateStr)}
                              style={inlineStyle}
                              className={`flex flex-col h-16 sm:h-24 rounded-lg transition-all relative p-1 sm:p-1.5 cursor-pointer group ${
                                !solidColor
                                  ? 'bg-white dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/60 hover:border-zinc-300 dark:hover:border-zinc-700'
                                  : 'border-0'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-0.5">
                                <span
                                  className={`text-[10px] sm:text-[13px] font-bold px-1 py-0 rounded-md mb-0.5 sm:mb-1 flex items-center justify-center ${
                                    isToday && solidColor ? 'bg-white font-black'
                                    : isToday ? 'bg-red-500 text-white font-black'
                                    : solidColor ? 'text-white/90'
                                    : 'text-zinc-400 group-hover:text-zinc-650 dark:group-hover:text-zinc-200'
                                  }`}
                                  style={isToday && solidColor ? { color: solidColor } : undefined}
                                >
                                  {date.getDate()}
                                </span>
                              </div>
                              <textarea
                                onClick={e => e.stopPropagation()}
                                className={`w-full flex-grow resize-none m-0 px-1 pb-0.5 bg-transparent border-none outline-none text-[9px] sm:text-[12px] font-bold focus:ring-0 leading-tight ${
                                  solidColor ? 'text-white/90 placeholder-white/40' : 'text-zinc-700 dark:text-zinc-300'
                                }`}
                                style={{ scrollbarWidth: 'none' } as React.CSSProperties}
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
                })}
              </div>

              {/* Bottom sentinel — triggers append */}
              <div ref={bottomSentinelRef} className="h-1" />
            </div>

            {/* Toggle Panel FAB (when closed) */}
            {!isPanelOpen && (
              <div className="fixed bottom-20 right-6 z-[80] flex items-center justify-end pointer-events-auto">
                <button
                  onClick={() => setIsPanelOpen(true)}
                  className="w-10 h-10 flex items-center justify-center bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-2xl hover:scale-105 hover:-translate-y-0.5 transition-all cursor-pointer hover:opacity-90 active:scale-95"
                  title="Open Brush Tool"
                >
                  <Paintbrush size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
