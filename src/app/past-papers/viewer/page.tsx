"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Printer, Download, Play, Pause, RotateCcw, Settings, 
  Columns, Maximize2, BookOpen, Edit3, Volume2, 
  CheckCircle, Menu, X, FileText
} from 'lucide-react';
import { disabledPapersList } from '@/utils/disabled-papers';

interface PaperData {
    subject: string;
    paper: string;
    series: string;
    year: string;
    examBoard: string;
    examLevel: string;
    type?: string;
}

interface TimerState {
    totalSeconds: number;
    initialTotalSeconds: number;
    isRunning: boolean;
}

const EXAM_MONTH_MAP: { [key: string]: string } = {
    'Jan': 'January',
    'Jun': 'June',
    'Oct': 'October',
    'Nov': 'November'
};

const IAL_SUBJECT_PREFIXES: { [key: string]: string } = {
    'Physics': 'WPH',
    'Chemistry': 'WCH',
    'Biology': 'WBI'
};

const DEFAULT_DURATIONS_SECONDS = {
    'Math': (1 * 3600) + (30 * 60), // 1 hour 30 minutes
    'OtherSubjects': {
        'Unit 1-2': (1 * 3600) + (30 * 60), // 1 hour 30 minutes
        'Unit 3/6': (1 * 3600) + (20 * 60), // 1 hour 20 minutes
        'Unit 4-5': (1 * 3600) + (45 * 60),  // 1 hour 45 minutes
        'Chi Paper 1': (0 * 3600) + (30 * 60),
        'Chi Paper 2': (1 * 3600) + (45 * 60),
        'EngA Paper 1': (2 * 3600) + (15 * 60), // 2 hours 15 minutes
        'EngA Paper 2': (1 * 3600) + (30 * 60), // 1 hour 30 minutes
        'EngB Paper 1': (3 * 3600) + (0 * 60)  // 3 hours
    }
};

const BASE_PDF_URL = 'https://ugcmwhrwsowuzbfrduba.supabase.co/storage/v1/object/public';

const getFullMonthName = (abbr: string): string => {
    return EXAM_MONTH_MAP[abbr] || abbr;
};

const getSpecificPaperCode = (subject: string, paper: string, year?: string, series?: string): string => {
    if (subject === 'Math') {
        const paperPrefixMatch = paper.match(/^(P|M|FP|S|D)/i);
        const paperNumberMatch = paper.match(/\d+$/);

        if (!paperPrefixMatch || !paperNumberMatch) return '';

        const prefixChar = paperPrefixMatch[1].toUpperCase();
        const number = paperNumberMatch[0];

        switch (prefixChar) {
            case 'P': return `WMA1${number}`;
            case 'M': return `WME0${number}`;
            case 'S': return `WST0${number}`;
            case 'D': return `WDM1${number}`;
            case 'FP': return `WFM0${number}`;
            default: return '';
        }
    } else {
        const prefix = IAL_SUBJECT_PREFIXES[subject as string];
        const unitNumberMatch = paper.match(/Unit\s*(\d+)/i);
        if (prefix && unitNumberMatch && unitNumberMatch[1]) {
            let codeDigit = '1';
            if (year && series) {
                const y = parseInt(year, 10);
                const s = series.toLowerCase();
                if (y < 2019 || (y === 2019 && s === 'jan')) {
                    codeDigit = '0';
                } else {
                    codeDigit = '1';
                }
            }
            return `${prefix}${codeDigit}${unitNumberMatch[1]}`;
        }
    }
    return '';
};

const getPdfUrl = (type: 'qp' | 'ms', currentPaperData: PaperData): string => {
    const abbreviatedMonth = currentPaperData.series;
    const fullMonth = getFullMonthName(currentPaperData.series);
    const year = currentPaperData.year;
    const subject = currentPaperData.subject;
    const paper = currentPaperData.paper;
    const examLevel = currentPaperData.examLevel;

    const folder = type === 'qp' ? 'Question-paper' : 'Mark-scheme';
    const filenamePrefix = type === 'qp' ? 'Questionpaper' : 'Markscheme';

    let filenameIdentifier = '';

    if (examLevel === 'IGCSE') {
        const paperNumberMatch = paper.match(/\d+$/);
        if (paper.toLowerCase().startsWith('paper') && paperNumberMatch) {
            filenameIdentifier = `Paper${paperNumberMatch[0]}`;
        } else {
            filenameIdentifier = paper.replace(/\s+/g, '');
        }
    } else { // IAL
        if (subject === 'Math') {
            const mathPaperNumberMatch = paper.match(/\d+$/);
            if (mathPaperNumberMatch) {
                filenameIdentifier = `Unit${mathPaperNumberMatch[0]}`;
            } else {
                filenameIdentifier = paper.replace(/\s+/g, '');
            }
        } else {
            const unitMatch = paper.match(/Unit\s*(\d+)/i);
            if (unitMatch) {
                filenameIdentifier = `Unit${unitMatch[1]}`;
            } else {
                filenameIdentifier = paper.replace(/\s+/g, '');
            }
        }
    }

    const specificPaperCode = getSpecificPaperCode(subject, paper, year, abbreviatedMonth);
    const filenameBase = `${filenamePrefix}-${filenameIdentifier}`;
    const codePart = specificPaperCode ? `(${specificPaperCode})` : '';

    let mappedSubject = subject;
    if (subject === 'English A') {
        mappedSubject = 'English Language A';
    } else if (subject === 'English B') {
        mappedSubject = 'English Language B';
    }

    const cleanSubject = subject.trim().toLowerCase();
    const isIAL = examLevel?.trim().toUpperCase() === 'IAL' ||
        ['physics', 'chemistry', 'biology', 'math', 'mathematics'].includes(cleanSubject);

    const yearMonthFolder = isIAL
        ? `${year}/${year} ${abbreviatedMonth}`
        : `${year} ${abbreviatedMonth}`;

    return `${BASE_PDF_URL}/${mappedSubject}/${yearMonthFolder}/${folder}/${filenameBase}${codePart}-${fullMonth}${year}.pdf`;
};

const getAudioUrl = (series: string, year: string, language: string, paper: string): string => {
    const abbreviatedMonth = series;
    const fullMonth = getFullMonthName(series);
    const paperNumber = paper.replace(/\s/g, '');

    return `${BASE_PDF_URL}/Chinese/${year} ${abbreviatedMonth}/Listening-Examinations-MP3/Recording-${paperNumber}(${language})-${fullMonth}${year}.mp3`;
};

function ViewerContent() {
    const searchParams = useSearchParams();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const msIframeRef = useRef<HTMLIFrameElement>(null);

    // State variables
    const [paperTitle, setPaperTitle] = useState<string>('Loading Paper...');
    const [qpPdfUrl, setQpPdfUrl] = useState<string>('');
    const [msPdfUrl, setMsPdfUrl] = useState<string>('');
    const [currentMode, setCurrentMode] = useState<'doPaper' | 'reviewPaper'>('doPaper');
    const [currentLayout, setCurrentLayout] = useState<'fullScreen' | 'splitScreen'>('splitScreen');
    const [timer, setTimer] = useState<TimerState>({ totalSeconds: 0, initialTotalSeconds: 0, isRunning: false });
    const [showTimerSettingsModal, setShowTimerSettingsModal] = useState<boolean>(false);
    const [modalTime, setModalTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
    const [paperData, setPaperData] = useState<PaperData>({
        subject: '', paper: '', series: '', year: '', examBoard: '', examLevel: ''
    });
    const [showAudioPlayerButton, setShowAudioPlayerButton] = useState<boolean>(false);
    const [showCompactAudioPlayer, setShowCompactAudioPlayer] = useState<boolean>(false);
    const [audioLanguage, setAudioLanguage] = useState<string>('Mandarin');
    const audioPlayerRef = useRef<HTMLAudioElement>(null);

    const [writtenAnswers, setWrittenAnswers] = useState<string>('');
    const [showWrittenAnswersInReview, setShowWrittenAnswersInReview] = useState<boolean>(false);
    const [showSaveIndicator, setShowSaveIndicator] = useState<boolean>(false);

    // New state for mobile options popup
    const [showMobileOptions, setShowMobileOptions] = useState<boolean>(false);
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isPaperUnavailable, setIsPaperUnavailable] = useState<boolean>(false);
    const [isIOS, setIsIOS] = useState<boolean>(false);
    const [qpFailed, setQpFailed] = useState<boolean>(false);
    const [msFailed, setMsFailed] = useState<boolean>(false);

    // Helper Functions
    const getUrlParams = useCallback((): PaperData => {
        const data: Partial<PaperData> = {};
        for (const [key, value] of searchParams.entries()) {
            (data as any)[key] = value;
        }
        return data as PaperData;
    }, [searchParams]);

    const setDefaultTimerDuration = useCallback((currentPaperData: PaperData) => {
        const subject = currentPaperData.subject;
        const paper = currentPaperData.paper;
        let durationInSeconds = 0;

        if (subject === 'Math') {
            durationInSeconds = DEFAULT_DURATIONS_SECONDS.Math;
        } else if (subject === 'Chinese') {
            const unitMatch = paper.match(/Paper\s*(\d+)/i);
            if (unitMatch && unitMatch[1]) {
                const unitNumber = parseInt(unitMatch[1]);
                if (unitNumber === 1) {
                    durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['Chi Paper 1'];
                } else if (unitNumber === 2) {
                    durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['Chi Paper 2'];
                }
            } else {
                durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['Unit 1-2'];
            }
        } else if (subject === 'English A') {
            const unitMatch = paper.match(/Paper\s*(\d+)/i);
            if (unitMatch && unitMatch[1]) {
                const unitNumber = parseInt(unitMatch[1]);
                if (unitNumber === 1) {
                    durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['EngA Paper 1'];
                } else if (unitNumber === 2) {
                    durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['EngA Paper 2'];
                }
            } else {
                durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['Unit 1-2'];
            }
        } else if (subject === 'English B') {
            const unitMatch = paper.match(/Paper\s*(\d+)/i);
            if (unitMatch && unitMatch[1]) {
                const unitNumber = parseInt(unitMatch[1]);
                if (unitNumber === 1) {
                    durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['EngB Paper 1'];
                }
            } else {
                durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['Unit 1-2'];
            }
        } else {
            const unitMatch = paper.match(/Unit\s*(\d+)/i);
            if (unitMatch && unitMatch[1]) {
                const unitNumber = parseInt(unitMatch[1]);
                if (unitNumber >= 1 && unitNumber <= 2) {
                    durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['Unit 1-2'];
                } else if (unitNumber === 3 || unitNumber === 6) {
                    durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['Unit 3/6'];
                } else if (unitNumber >= 4 && unitNumber <= 5) {
                    durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['Unit 4-5'];
                } else {
                    durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['Unit 1-2'];
                }
            } else {
                durationInSeconds = DEFAULT_DURATIONS_SECONDS.OtherSubjects['Unit 1-2'];
            }
        }
        setTimer(prev => ({ ...prev, totalSeconds: durationInSeconds, initialTotalSeconds: durationInSeconds }));
    }, []);

    const formatTime = useCallback((seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return [hours, minutes, remainingSeconds]
            .map(unit => String(unit).padStart(2, '0'))
            .join(':');
    }, []);

    const toggleTimer = useCallback(() => {
        setTimer(prev => ({ ...prev, isRunning: !prev.isRunning }));
    }, []);

    const resetTimer = useCallback(() => {
        setTimer(prev => ({ ...prev, totalSeconds: prev.initialTotalSeconds, isRunning: false }));
    }, []);

    const openTimerSettings = useCallback(() => {
        const hours = Math.floor(timer.totalSeconds / 3600);
        const minutes = Math.floor((timer.totalSeconds % 3600) / 60);
        const seconds = timer.totalSeconds % 60;
        setModalTime({ hours, minutes, seconds });
        setShowTimerSettingsModal(true);
    }, [timer.totalSeconds]);

    const closeTimerSettings = useCallback(() => {
        setShowTimerSettingsModal(false);
    }, []);

    const setTimerFromInput = useCallback(() => {
        const newDuration = (modalTime.hours * 3600) + (modalTime.minutes * 60) + modalTime.seconds;
        setTimer(prev => ({
            ...prev,
            totalSeconds: newDuration,
            initialTotalSeconds: newDuration,
            isRunning: prev.isRunning
        }));
        setShowTimerSettingsModal(false);
    }, [modalTime.hours, modalTime.minutes, modalTime.seconds]);

    const toggleCompactAudioPlayer = useCallback(() => {
        setShowCompactAudioPlayer(prev => !prev);
    }, []);

    const handleModeSwitch = useCallback((newMode: 'doPaper' | 'reviewPaper') => {
        setCurrentMode(newMode);
        if (newMode === 'reviewPaper') {
            setShowWrittenAnswersInReview(false);
        }
    }, []);

    const closeCompactAudioPlayer = useCallback(() => {
        setShowCompactAudioPlayer(false);
    }, []);

    const updateAudioLanguage = useCallback((lang: string) => {
        setAudioLanguage(lang);
        if (audioPlayerRef.current) {
            const newAudioUrl = getAudioUrl(paperData.series, paperData.year, lang, paperData.paper);
            const wasPlaying = !audioPlayerRef.current.paused;
            audioPlayerRef.current.src = newAudioUrl;
            audioPlayerRef.current.load();
            if (wasPlaying) {
                audioPlayerRef.current.play().catch(e => console.error("Audio playback failed:", e));
            }
        }
    }, [paperData]);

    const handleWrittenAnswersChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setWrittenAnswers(event.target.value);
    }, []);

    const toggleMobileOptions = useCallback(() => {
        setShowMobileOptions(prev => !prev);
    }, []);

    const closeMobileOptions = useCallback(() => {
        setShowMobileOptions(false);
    }, []);

    const checkMobileSize = useCallback(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);

    const triggerPrint = () => {
        try {
            const iframe = currentMode === 'doPaper' ? iframeRef.current : msIframeRef.current;
            if (iframe?.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } else {
                window.print();
            }
        } catch (e) {
            window.print();
        }
    };

    // Effects
    useEffect(() => {
        const params = getUrlParams();
        setPaperData(params);

        if (!params.subject || !params.paper || !params.series || !params.year) {
            setPaperTitle("Error: Paper details missing in URL.");
            return;
        }

        // Check if paper is disabled/unavailable
        const isDisabled = disabledPapersList.some(disabledEntry => {
            const matchBoard = disabledEntry.examBoard === null || disabledEntry.examBoard === params.examBoard;
            const matchLevel = disabledEntry.examLevel === null || disabledEntry.examLevel === params.examLevel;
            const matchSubject = disabledEntry.subject === null || disabledEntry.subject === params.subject;
            const matchPaper = disabledEntry.paper === null || disabledEntry.paper === params.paper;
            const matchSeries = disabledEntry.series === null || disabledEntry.series === params.series;
            const matchYear = disabledEntry.year === null || disabledEntry.year === parseInt(params.year, 10);
            return matchBoard && matchLevel && matchSubject && matchPaper && matchSeries && matchYear;
        });

        if (isDisabled) {
            setIsPaperUnavailable(true);
            return;
        }

        setPaperTitle(`${params.subject} ${params.paper} (${params.series} ${params.year})`);
        const qpUrl = getPdfUrl('qp', params);
        const msUrl = getPdfUrl('ms', params);
        setQpPdfUrl(qpUrl);
        setMsPdfUrl(msUrl);

        // Async check URL existence to avoid raw AWS/Supabase 404 errors inside iframe
        const checkUrl = async (url: string, setFailed: (val: boolean) => void) => {
            if (!url) return;
            try {
                const res = await fetch(url, { method: 'HEAD' });
                if (!res.ok) {
                    setFailed(true);
                }
            } catch (err) {
                // If fetch fails (CORS block), do a quick GET check with ignore-cors or trust the URL
            }
        };
        checkUrl(qpUrl, setQpFailed);
        checkUrl(msUrl, setMsFailed);

        const initialPdfType = params.type || 'qp';
        if (initialPdfType === 'ms') {
            setCurrentMode('reviewPaper');
        } else {
            setCurrentMode('doPaper');
        }
        setCurrentLayout('splitScreen');

        setDefaultTimerDuration(params);

        if (params.subject === 'Chinese' && params.examLevel === 'IGCSE' && params.paper.toLowerCase().includes('paper 1')) {
            setShowAudioPlayerButton(true);
            if (audioPlayerRef.current) {
                audioPlayerRef.current.src = getAudioUrl(params.series, params.year, 'Mandarin', params.paper);
            }
        } else {
            setShowAudioPlayerButton(false);
        }

        const savedAnswers = localStorage.getItem(`answers_${params.subject}_${params.paper}_${params.series}_${params.year}`);
        if (savedAnswers) {
            setWrittenAnswers(savedAnswers);
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (event: MediaQueryListEvent) => {
            document.documentElement.classList.toggle('dark', event.matches);
        };
        document.documentElement.classList.toggle('dark', mediaQuery.matches);
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [getUrlParams, setDefaultTimerDuration]);

    // Timer interval effect
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (timer.isRunning && timer.totalSeconds > 0) {
            interval = setInterval(() => {
                setTimer(prev => ({ ...prev, totalSeconds: prev.totalSeconds - 1 }));
            }, 1000);
        } else if (timer.totalSeconds === 0 && timer.isRunning) {
            setTimer(prev => ({ ...prev, isRunning: false }));
            console.log("Time's up!");
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [timer.isRunning, timer.totalSeconds]);



    // Mobile and iOS size detection effect
    useEffect(() => {
        checkMobileSize();
        const handleResize = () => checkMobileSize();
        window.addEventListener('resize', handleResize);

        const checkIOS = () => {
            const ua = window.navigator.userAgent;
            const ipad = ua.match(/(iPad)/g) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
            const iphone = ua.match(/(iPhone)/g);
            setIsIOS(!!(ipad || iphone));
        };
        checkIOS();

        return () => window.removeEventListener('resize', handleResize);
    }, [checkMobileSize]);

    // Save written answers to localStorage whenever they change
    useEffect(() => {
        if (paperData.subject && paperData.paper && paperData.series && paperData.year) {
            const key = `answers_${paperData.subject}_${paperData.paper}_${paperData.series}_${paperData.year}`;
            localStorage.setItem(key, writtenAnswers);
            
            setShowSaveIndicator(true);
            const t = setTimeout(() => setShowSaveIndicator(false), 2000);
            return () => clearTimeout(t);
        }
    }, [writtenAnswers, paperData.subject, paperData.paper, paperData.series, paperData.year]);

    const getIframeSrc = useCallback((originalUrl: string) => {
        if (!originalUrl) return '';
        if (isIOS) {
            return `https://docs.google.com/viewer?url=${encodeURIComponent(originalUrl)}&embedded=true`;
        }
        return `${originalUrl}#toolbar=0&navpanes=0&zoom=70&view=FitH`;
    }, [isIOS]);

    // Render logic for panel visibility
    const renderPanelLayout = () => {
        let qpPanelClasses = 'flex-grow relative h-full';
        let rightPanelClasses = 'flex-grow h-full border-l border-zinc-200 dark:border-zinc-800';
        let showAnswerTextarea = false;
        let showMsIframe = false;

        if (currentMode === 'doPaper') {
            if (currentLayout === 'fullScreen') {
                qpPanelClasses += ' w-full';
                rightPanelClasses += ' hidden';
            } else {
                if (isMobile) {
                    qpPanelClasses += ' w-full h-1/2';
                    rightPanelClasses += ' w-full h-1/2 border-l-0 border-t';
                } else {
                    qpPanelClasses += ' w-1/2 h-full';
                    rightPanelClasses += ' w-1/2 h-full';
                }
                showAnswerTextarea = true;
            }
        } else { // reviewPaper
            if (currentLayout === 'fullScreen') {
                qpPanelClasses += ' hidden';
                rightPanelClasses += ' w-full border-l-0';
                showMsIframe = true;
            } else {
                if (isMobile) {
                    qpPanelClasses += ' w-full h-1/2';
                    rightPanelClasses += ' w-full h-1/2 border-l-0 border-t';
                } else {
                    qpPanelClasses += ' w-1/2 h-full';
                    rightPanelClasses += ' w-1/2 h-full';
                }
                showMsIframe = true;
            }
        }

        return (
            <div id="content-area" className={`flex-grow overflow-hidden ${isMobile && currentLayout === 'splitScreen' ? 'flex flex-col' : 'flex'}`}>
                <div id="qp-panel" className={qpPanelClasses}>
                    {currentMode === 'reviewPaper' && currentLayout === 'splitScreen' && showWrittenAnswersInReview ? (
                        <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-900">
                            <textarea 
                                className="w-full h-full p-4 resize-none focus:outline-none border-0 focus:ring-0 bg-transparent dark:text-zinc-100 font-sans"
                                placeholder="Write your answers here..."
                                value={writtenAnswers}
                                onChange={handleWrittenAnswersChange}
                            />
                        </div>
                    ) : (
                         qpFailed ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-50/50 dark:bg-zinc-900/50 text-center select-none">
                                <FileText size={24} className="text-zinc-400 mb-2" />
                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-200">this specific paper is not available yet</p>
                                <p className="text-[10px] text-zinc-450 mt-1 max-w-[220px]">We are uploading missing exam papers daily. Check back soon!</p>
                            </div>
                        ) : (
                            <iframe 
                                ref={iframeRef}
                                id="qp-iframe" 
                                className="pdf-frame w-full h-full" 
                                src={getIframeSrc(qpPdfUrl)}
                                title="Question Paper"
                            ></iframe>
                        )
                    )}
                </div>

                <div id="right-panel" className={rightPanelClasses}>
                    {showAnswerTextarea && (
                        <div className="w-full h-full flex flex-col bg-white dark:bg-zinc-900">
                            <textarea 
                                className="flex-grow p-4 resize-none focus:outline-none border-0 focus:ring-0 bg-transparent dark:text-zinc-100 font-sans"
                                placeholder="Type or format your answers here..."
                                value={writtenAnswers}
                                onChange={handleWrittenAnswersChange}
                            />
                        </div>
                    )}
                    {showMsIframe && (
                        msFailed ? (
                            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-50/50 dark:bg-zinc-900/50 text-center select-none border-l border-zinc-200/20 dark:border-zinc-800/20">
                                <FileText size={24} className="text-zinc-400 mb-2" />
                                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-200">this specific marking scheme is not available yet</p>
                                <p className="text-[10px] text-zinc-450 mt-1 max-w-[220px]">Marking schemes are usually uploaded alongside question papers.</p>
                            </div>
                        ) : (
                            <iframe 
                                ref={msIframeRef}
                                id="ms-iframe" 
                                className="pdf-frame w-full h-full" 
                                src={getIframeSrc(msPdfUrl)}
                            ></iframe>
                        )
                    )}
                </div>
            </div>
        );
    };

    if (isPaperUnavailable) {
        return (
            <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6 animate-pulse">
                    <BookOpen size={32} />
                </div>
                <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mb-2">Past Paper Not Available</h1>
                <p className="text-xs text-zinc-450 max-w-sm leading-relaxed mb-6">
                    The requested exam past paper or marking scheme is currently not uploaded or is restricted. Please try selecting a different series or year.
                </p>
                <button
                    onClick={() => window.close()}
                    className="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-xl text-xs font-bold transition hover:opacity-90 shadow-sm cursor-pointer"
                >
                    Close Viewer Window
                </button>
            </div>
        );
    }

    return (
        <div className="antialiased h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 select-none">
            <style>
                {`
                .pdf-frame {
                    width: 100%;
                    height: 100%;
                    border: none;
                }
                .timer-display {
                    font-variant-numeric: tabular-nums;
                }
                .modal-overlay {
                    background-color: rgba(0, 0, 0, 0.7);
                }
                .nav-btn-active {
                    background-color: var(--primary-color);
                    color: white;
                }
                .nav-btn-inactive {
                    background-color: transparent;
                    color: #555552;
                }
                .dark .nav-btn-inactive {
                    color: #a0a09d;
                }
                .nav-btn-inactive:hover {
                    background-color: rgba(120, 120, 120, 0.08);
                }
                `}
            </style>

            {/* Top Navbar */}
            <header className="h-12 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800 px-2 flex justify-between items-center sticky top-0 z-50 flex-shrink-0">
                {/* Header Left */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <Link href="/past-papers" className="flex items-center gap-1.5 group pr-1">
                        <img
                            src="/Precision Logo.svg"
                            alt="Precision Logo"
                            className="h-5 w-auto transition-all duration-300 group-hover:opacity-90 dark:invert"
                        />
                        <span className="bg-zinc-900 text-white dark:bg-zinc-800 dark:text-zinc-100 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all duration-300">
                            Edu
                        </span>
                    </Link>
                    <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 hidden lg:block"></div>
                    <div className="flex flex-col hidden lg:flex">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider leading-none">
                            {currentMode === 'doPaper' ? 'Active Exam Sitting' : 'Evaluation Mode'}
                        </span>
                        <span className="text-xs font-bold uppercase mt-0.5 truncate max-w-[200px] text-zinc-800 dark:text-zinc-200" title={paperTitle}>
                            {paperTitle}
                        </span>
                    </div>
                </div>

                {/* Header Middle - Unified Status & Control Dock */}
                <div className="flex-shrink-0 flex items-center bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 shadow-sm h-8">
                    {/* Timer Controls */}
                    <div className="flex items-center gap-1 px-1.5 border-r border-zinc-200 dark:border-zinc-800 h-full">
                        <span className="timer-display text-xs font-mono font-bold text-zinc-750 dark:text-zinc-300 select-none">
                            {formatTime(timer.totalSeconds)}
                        </span>
                        <button 
                            onClick={toggleTimer}
                            className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-350 transition-colors cursor-pointer"
                            title={timer.isRunning ? "Pause Timer" : "Start Timer"}
                        >
                            {timer.isRunning ? <Pause size={11} /> : <Play size={11} />}
                        </button>
                        <button 
                            onClick={resetTimer}
                            className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-350 transition-colors cursor-pointer"
                            title="Reset Timer"
                        >
                            <RotateCcw size={11} />
                        </button>
                        <button 
                            onClick={openTimerSettings}
                            className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-350 transition-colors cursor-pointer"
                            title="Timer Settings"
                        >
                            <Settings size={11} />
                        </button>
                    </div>

                    {/* Mode Toggle Controls */}
                    <div className="flex gap-0.5 px-1 border-r border-zinc-200 dark:border-zinc-800 h-full items-center">
                        <button
                            onClick={() => handleModeSwitch('doPaper')}
                            className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md flex items-center gap-1 transition-all h-6 cursor-pointer ${
                                currentMode === 'doPaper' ? 'nav-btn-active' : 'nav-btn-inactive'
                            }`}
                        >
                            <Edit3 size={10} />
                            <span className="hidden md:inline">Do Paper</span>
                        </button>
                        <button
                            onClick={() => handleModeSwitch('reviewPaper')}
                            className={`px-2.5 py-0.5 text-[11px] font-bold rounded-md flex items-center gap-1 transition-all h-6 cursor-pointer ${
                                currentMode === 'reviewPaper' ? 'nav-btn-active' : 'nav-btn-inactive'
                            }`}
                        >
                            <BookOpen size={10} />
                            <span className="hidden md:inline">Review</span>
                        </button>
                    </div>

                    {/* Layout Toggle Controls */}
                    <div className="flex gap-0.5 px-1 h-full items-center">
                        <button
                            onClick={() => setCurrentLayout('splitScreen')}
                            className={`p-1 rounded-md flex items-center justify-center transition-all h-6 w-6 cursor-pointer ${
                                currentLayout === 'splitScreen' ? 'nav-btn-active' : 'nav-btn-inactive'
                            }`}
                            title="Split Screen"
                        >
                            <Columns size={11} />
                        </button>
                        <button
                            onClick={() => setCurrentLayout('fullScreen')}
                            className={`p-1 rounded-md flex items-center justify-center transition-all h-6 w-6 cursor-pointer ${
                                currentLayout === 'fullScreen' ? 'nav-btn-active' : 'nav-btn-inactive'
                            }`}
                            title="Full Screen View"
                        >
                            <Maximize2 size={11} />
                        </button>
                    </div>
                </div>

                {/* Header Right */}
                <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
                    {/* Audio Overlay Button (for Chinese Listening papers) */}
                    {showAudioPlayerButton && (
                        <button
                            onClick={toggleCompactAudioPlayer}
                            className={`h-8 w-8 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-700 dark:text-zinc-300 transition cursor-pointer ${showCompactAudioPlayer ? 'bg-zinc-100 dark:bg-zinc-900' : ''}`}
                            title="Listening Audio Player"
                        >
                            <Volume2 size={13} />
                        </button>
                    )}

                    {/* Review Mode Option: Toggle Notepad on Left panel */}
                    {currentMode === 'reviewPaper' && currentLayout === 'splitScreen' && (
                        <button
                            onClick={() => setShowWrittenAnswersInReview(prev => !prev)}
                            className={`h-8 px-2.5 border rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                showWrittenAnswersInReview 
                                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900 dark:text-blue-400' 
                                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                            }`}
                        >
                            <Edit3 size={11} />
                            <span>My Answers</span>
                        </button>
                    )}

                    <button 
                        onClick={() => window.open(currentMode === 'doPaper' ? qpPdfUrl : msPdfUrl, '_blank')}
                        className="chess-btn chess-btn-black text-xs px-2.5 h-8"
                    >
                        <Download size={12} />
                        <span className="hidden lg:inline">Get PDF</span>
                    </button>
                </div>
            </header>

            {/* Audio Player Panel (Chinese papers only) */}
            {showAudioPlayerButton && showCompactAudioPlayer && (
                <div className="chess-card absolute right-4 top-16 p-4 shadow-xl z-50 flex flex-col gap-3 w-72 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            <Volume2 size={14} className="text-blue-500" />
                            Chinese Listening Audio
                        </div>
                        <button onClick={closeCompactAudioPlayer} className="text-zinc-400 hover:text-zinc-650">
                            <X size={14} />
                        </button>
                    </div>
                    <audio ref={audioPlayerRef} controls className="w-full h-8"></audio>
                    <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-zinc-505 dark:text-zinc-400 font-bold text-[10px] tracking-wider uppercase">Dialect Option</span>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    type="radio"
                                    name="audioLanguage"
                                    value="Mandarin"
                                    checked={audioLanguage === 'Mandarin'}
                                    onChange={(e) => updateAudioLanguage(e.target.value)}
                                    className="cursor-pointer text-blue-600 focus:ring-blue-500 h-3 w-3"
                                />
                                <span className="text-[11px] text-zinc-700 dark:text-zinc-350">Mandarin</span>
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                    type="radio"
                                    name="audioLanguage"
                                    value="Cantonese"
                                    checked={audioLanguage === 'Cantonese'}
                                    onChange={(e) => updateAudioLanguage(e.target.value)}
                                    className="cursor-pointer text-blue-600 focus:ring-blue-500 h-3 w-3"
                                />
                                <span className="text-[11px] text-zinc-700 dark:text-zinc-350">Cantonese</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Split Panel Contents */}
            {renderPanelLayout()}

            {/* Timer Settings Modal overlay */}
            {showTimerSettingsModal && (
                <div className="fixed inset-0 modal-overlay flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="modal-content w-full max-w-sm p-6 flex flex-col gap-4 text-center animate-in zoom-in-95 duration-250">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-1.5">
                            <Settings size={15} />
                            Adjust Sitting Timer
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Modify hours, minutes, or seconds below to alter your session limit.
                        </p>
                        
                        {/* Custom inputs grid */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Hours</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={modalTime.hours}
                                    onChange={(e) => setModalTime(prev => ({ ...prev, hours: Math.max(0, Math.min(23, parseInt(e.target.value) || 0)) }))}
                                    className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-center font-mono font-bold text-sm bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-zinc-100"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Minutes</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={modalTime.minutes}
                                    onChange={(e) => setModalTime(prev => ({ ...prev, minutes: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) }))}
                                    className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-center font-mono font-bold text-sm bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-zinc-100"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold">Seconds</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={modalTime.seconds}
                                    onChange={(e) => setModalTime(prev => ({ ...prev, seconds: Math.max(0, Math.min(59, parseInt(e.target.value) || 0)) }))}
                                    className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-center font-mono font-bold text-sm bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-zinc-100"
                                />
                            </div>
                        </div>
                        
                        {/* Footer button controls */}
                        <div className="flex gap-2 mt-2">
                            <button
                                onClick={closeTimerSettings}
                                className="chess-btn chess-btn-secondary flex-1 py-2 text-xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={setTimerFromInput}
                                className="chess-btn chess-btn-primary flex-1 py-2 text-xs"
                            >
                                Apply Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PastPapersViewerPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-xs uppercase text-zinc-500">
                Loading Viewer Environment...
            </div>
        }>
            <ViewerContent />
        </Suspense>
    );
}
