"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Script from 'next/script';

// --- CONFIGURATION ---
const ialSubjectsData = {
    'Physics': { papers: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'] },
    'Chemistry': { papers: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'] },
    'Biology': { papers: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'] },
    'Math': { papers: ['P1', 'P2', 'P3', 'P4', 'M1', 'M2', 'M3', 'FP1', 'FP2', 'FP3', 'S1', 'S2', 'S3', 'D1', 'D2'] }
};
const ialPaperMaxMarks: Record<string, number> = {
    'Unit 1': 80, 'Unit 2': 80, 'Unit 4': 90, 'Unit 5': 90, 'Unit 3': 50, 'Unit 6': 50,
    'P1': 75, 'P2': 75, 'P3': 75, 'P4': 75, 'M1': 75, 'M2': 75, 'M3': 75,
    'FP1': 75, 'FP2': 75, 'FP3': 75, 'S1': 75, 'S2': 75, 'S3': 75, 'D1': 75, 'D2': 75
};
const ialSeries = ['Jan', 'Jun', 'Oct'];
const ialSeriesOrder: Record<string, number> = { 'Jan': 0, 'Jun': 1, 'Oct': 2 };
const ialMaxYearSelect = 2025;
const ialMaxSeriesSelect = 'Jun';

const igcseSubjectsData = {
     'Chinese': { papers: ['Paper 1', 'Paper 2'] },
     'English A': { papers: ['Paper 1', 'Paper 2'] },
     'English B': { papers: ['Paper 1'] },
};
const igcsePaperMaxMarks: Record<string, Record<string, number>> = {
    'Chinese': {
        'Paper 1': 50,
        'Paper 2': 80
    },
    'English A': {
        'Paper 1': 90,
        'Paper 2': 60
    },
    'English B': {
        'Paper 1': 100
    }
};
const igcseSeries = ['Jan', 'Jun', 'Nov'];
const igcseSeriesOrder: Record<string, number> = { 'Jan': 0, 'Jun': 1, 'Nov': 2 };
const igcseMaxYearSelect = 2025;
const igcseMaxSeriesSelect = 'Nov';

const disabledPapersList = [
    { examBoard: 'Edexcel', examLevel: 'IGCSE', subject: 'Chinese', series: 'Jan', paper: null, year: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Nov", year: 2011, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Nov", year: 2012, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Nov", year: 2013, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Nov", year: 2014, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Nov", year: 2015, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Jun", year: 2015, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Nov", year: 2016, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Nov", year: 2017, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Nov", year: 2018, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Nov", year: 2019, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Jun", year: 2020, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "Chinese", series: "Nov", year: 2022, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Nov", year: 2022, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Jan", year: 2021, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Jun", year: 2020, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Nov", year: 2019, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Nov", year: 2018, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Nov", year: 2017, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Nov", year: 2016, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Nov", year: 2015, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Nov", year: 2014, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Nov", year: 2013, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English A", series: "Nov", year: 2012, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Nov", year: 2022, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Jan", year: 2021, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Jun", year: 2020, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Nov", year: 2019, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Nov", year: 2018, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Nov", year: 2017, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Nov", year: 2016, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Nov", year: 2015, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Nov", year: 2014, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Nov", year: 2013, paper: null },
    { examBoard: "Edexcel", examLevel: "IGCSE", subject: "English B", series: "Nov", year: 2012, paper: null },
];

interface YearSeries {
    year: number;
    series: string;
}

interface AppStateMode {
    selectedPapers: Record<string, string[]>;
    scores: Record<string, string>;
    years: YearSeries[];
}

interface AppStateType {
    currentMode: 'IAL' | 'IGCSE';
    modes: {
        IAL: AppStateMode;
        IGCSE: AppStateMode;
    };
}

const generateYearSeriesRange = (
    startYear: number,
    startSeries: string,
    endYear: number,
    endSeries: string,
    seriesOrderObj: Record<string, number>,
    maxYear: number,
    maxSeries: string
): YearSeries[] => {
    const result: YearSeries[] = [];
    const actualEndYear = Math.min(endYear, maxYear);
    let actualEndSeries = endSeries;
    if (endYear === maxYear && seriesOrderObj[endSeries] > seriesOrderObj[maxSeries]) {
        actualEndSeries = maxSeries;
    }

    for (let year = actualEndYear; year >= startYear; year--) {
        const currentYearSeries: YearSeries[] = [];
        const sortedSeriesKeys = Object.keys(seriesOrderObj).sort((a, b) => seriesOrderObj[a] - seriesOrderObj[b]);

        for (let i = sortedSeriesKeys.length - 1; i >= 0; i--) {
            const serie = sortedSeriesKeys[i];
            if (year === actualEndYear && seriesOrderObj[serie] > seriesOrderObj[actualEndSeries]) {
                continue;
            }
            if (year === startYear && seriesOrderObj[serie] < seriesOrderObj[startSeries]) {
                continue;
            }
            currentYearSeries.push({ year, series: serie });
        }
        currentYearSeries.sort((a, b) => seriesOrderObj[a.series] - seriesOrderObj[b.series]);
        result.push(...currentYearSeries);
    }
    sortYearSeriesList(result, seriesOrderObj);
    return result;
};

const sortYearSeriesList = (list: YearSeries[], seriesOrderObj: Record<string, number>) => {
    list.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return seriesOrderObj[b.series] - seriesOrderObj[a.series];
    });
};

const getFullMonthName = (seriesAbbr: string): string => {
    const months: Record<string, string> = { 'Jan': 'January', 'Jun': 'June', 'Oct': 'October', 'Nov': 'November' };
    return months[seriesAbbr] || seriesAbbr;
};

const calculatePercentile = (scorePercentage: number): string => {
    if (isNaN(scorePercentage)) return '0';
    if (scorePercentage < 0) scorePercentage = 0;
    if (scorePercentage > 100) scorePercentage = 100;

    let percentile: number;
    if (scorePercentage <= 70) {
        percentile = (scorePercentage / 70) * 50;
    } else {
        percentile = 50 + ((scorePercentage - 70) / 30) * 50;
    }
    return percentile.toFixed(0);
};

// --- ScoreCell Component ---
interface ScoreCellProps {
    id: string;
    score: string;
    subject: string;
    paper: string;
    year: number;
    series: string;
    mode: 'IAL' | 'IGCSE';
    maxMark: number;
    isDisabled: boolean;
    onScoreChange: (id: string, newScore: string, subject: string, paper: string) => void;
    onCellFocus: (cellData: { id: string, subject: string, paper: string, year: number, series: string, mode: 'IAL' | 'IGCSE' }) => void;
}

const ScoreCell: React.FC<ScoreCellProps> = React.memo(({
    id,
    score,
    subject,
    paper,
    year,
    series,
    mode,
    maxMark,
    isDisabled,
    onScoreChange,
    onCellFocus
}) => {
    const cellRef = useRef<HTMLDivElement>(null);
    const [currentInput, setCurrentInput] = useState<string>(score);

    useEffect(() => {
        if (cellRef.current) {
            if (cellRef.current !== document.activeElement || currentInput !== score) {
                cellRef.current.textContent = score;
                setCurrentInput(score);
            }
        }
    }, [score]);

    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        const newValue = e.currentTarget.textContent || '';
        setCurrentInput(newValue);
        onScoreChange(id, newValue, subject, paper);
    }, [id, onScoreChange, subject, paper]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
        const finalValue = e.currentTarget.textContent || '';
        onScoreChange(id, finalValue, subject, paper);
    }, [id, onScoreChange, subject, paper]);

    const handleFocus = useCallback(() => {
        onCellFocus({ id, subject, paper, year, series, mode });
    }, [id, subject, paper, year, series, mode, onCellFocus]);

    const percentage = (currentInput && !isNaN(parseFloat(currentInput)) && maxMark) ?
        ((parseFloat(currentInput) / maxMark) * 100) : NaN;

    const hasScore = !isNaN(percentage);
    let bgColor = '';
    if (hasScore) {
        if (percentage >= 90) bgColor = 'var(--color-90)';
        else if (percentage >= 80) bgColor = 'var(--color-80)';
        else if (percentage >= 60) bgColor = 'var(--color-70)';
        else if (percentage >= 30) bgColor = 'var(--color-50)';
        else bgColor = 'var(--color-fail)';
    }

    return (
        <div
            ref={cellRef}
            className={`score-cell ${isDisabled ? 'disabled' : ''} ${hasScore ? 'has-score' : ''}`}
            contentEditable={!isDisabled}
            onInput={handleInput}
            onBlur={handleBlur}
            onFocus={handleFocus}
            style={{ backgroundColor: bgColor }}
            data-cell-id={id}
            suppressContentEditableWarning={true}
        />
    );
});

ScoreCell.displayName = 'ScoreCell';

// --- Main App Component ---
export default function App() {
    const [appState, setAppState] = useState<AppStateType>(() => {
        return {
            currentMode: 'IAL',
            modes: {
                IAL: {
                    selectedPapers: {
                        'Math': ['P1', 'P2', 'P3', 'P4'],
                        'Physics': ['Unit 1', 'Unit 2']
                    },
                    scores: {},
                    years: generateYearSeriesRange(2019, 'Jan', 2025, 'Jun', ialSeriesOrder, ialMaxYearSelect, ialMaxSeriesSelect)
                },
                IGCSE: {
                    selectedPapers: {
                        'Math A': ['Paper 1H', 'Paper 2H'],
                        'Chinese': ['Paper 1H']
                    },
                    scores: {},
                    years: generateYearSeriesRange(2010, 'Jan', 2025, 'Nov', igcseSeriesOrder, igcseMaxYearSelect, igcseMaxSeriesSelect)
                }
            }
        };
    });

    const [userId, setUserId] = useState<string | null>(null);
    const currentMode: 'IAL' | 'IGCSE' = appState.currentMode;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeCellData, setActiveCellData] = useState<{ id: string, subject: string, paper: string, year: number, series: string, mode: 'IAL' | 'IGCSE' } | null>(null);
    const [isBottomActionsVisible, setIsBottomActionsVisible] = useState(false);
    const [selectedMeanStats, setSelectedMeanStats] = useState<{ subject: string; paper: string } | null>(null);
    const bottomActionsRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    const [isExamLevelDropdownOpen, setIsExamLevelDropdownOpen] = useState(false);

    const getCurrentSubjectsData = useCallback(() => {
        return appState.currentMode === 'IAL' ? ialSubjectsData : igcseSubjectsData;
    }, [appState.currentMode]);

    const getPaperMaxMarks = useCallback((subject: string, paper: string): number => {
        if (appState.currentMode === 'IAL') {
            return ialPaperMaxMarks[paper] || 0;
        } else {
            const subjectMarks = igcsePaperMaxMarks[subject];
            if (subjectMarks && subjectMarks[paper]) {
                return subjectMarks[paper];
            }
            return 0;
        }
    }, [appState.currentMode]);

    const getCurrentSeries = useCallback((mode: 'IAL' | 'IGCSE' = appState.currentMode) => {
        return mode === 'IAL' ? ialSeries : igcseSeries;
    }, [appState.currentMode]);

    const getCurrentSeriesOrder = useCallback((mode: 'IAL' | 'IGCSE' = appState.currentMode) => {
        return mode === 'IAL' ? ialSeriesOrder : igcseSeriesOrder;
    }, [appState.currentMode]);

    const getCurrentMaxYearSelect = useCallback(() => {
        return appState.currentMode === 'IAL' ? ialMaxYearSelect : igcseMaxYearSelect;
    }, [appState.currentMode]);

    const getCurrentMaxSeriesSelect = useCallback(() => {
        return appState.currentMode === 'IAL' ? ialMaxSeriesSelect : igcseMaxSeriesSelect;
    }, [appState.currentMode]);

    const getFlatPaperList = useCallback(() => {
        const list: { subject: string; paper: string }[] = [];
        const currentSubjectsData = getCurrentSubjectsData();
        const currentSelectedPapers = appState.modes[currentMode as 'IAL' | 'IGCSE'].selectedPapers;

        Object.keys(currentSubjectsData).forEach(subject => {
            if (currentSelectedPapers[subject] && Array.isArray(currentSelectedPapers[subject])) {
                const sortedPapers = (currentSubjectsData as any)[subject].papers.filter((p: string) => currentSelectedPapers[subject].includes(p));
                sortedPapers.forEach((paper: string) => {
                    list.push({ subject, paper });
                });
            }
        });
        return list;
    }, [appState.currentMode, currentMode, appState.modes, getCurrentSubjectsData]);

    const calculateMeanScore = useCallback((subject: string, paper: string): number | null => {
        let totalScore = 0;
        let count = 0;
        const currentScores = appState.modes[currentMode as 'IAL' | 'IGCSE'].scores;
        const currentYears = appState.modes[currentMode as 'IAL' | 'IGCSE'].years;

        currentYears.forEach(({ year, series: serie }) => {
            const cellId = `${appState.currentMode}_${year}_${serie}_${subject}_${paper}`.replace(/\s/g, '_');
            const scoreStr = currentScores[cellId];
            const score = parseFloat(scoreStr);

            if (!isNaN(score) && scoreStr !== 'N/A') {
                totalScore += score;
                count++;
            }
        });

        return count > 0 ? totalScore / count : null;
    }, [appState.currentMode, currentMode, appState.modes]);

    // Load dashboard state from Supabase on mount
    useEffect(() => {
        async function loadDashboardState() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);
            
            const { data: scoresData } = await supabase
                .from('dashboard_scores')
                .select('content')
                .eq('user_id', user.id)
                .eq('title', 'main_scores')
                .maybeSingle();
                
            if (scoresData?.content) {
                setAppState(prev => {
                    const loadedState = scoresData.content.appState || prev;
                    if (scoresData.content.scores) {
                        return {
                            ...loadedState,
                            modes: {
                                ...loadedState.modes,
                                IAL: {
                                    ...loadedState.modes.IAL,
                                    scores: scoresData.content.scores.IAL || loadedState.modes.IAL.scores
                                },
                                IGCSE: {
                                    ...loadedState.modes.IGCSE,
                                    scores: scoresData.content.scores.IGCSE || loadedState.modes.IGCSE.scores
                                }
                            }
                        };
                    }
                    return loadedState;
                });
            }
        }
        loadDashboardState();
        // eslint-disable-next-line
    }, []);

    // Save dashboard state to Supabase on change (debounced)
    useEffect(() => {
        if (!userId) return;
        const handler = setTimeout(async () => {
            try {
                const supabase = createClient();
                
                const { data: existingScores } = await supabase
                    .from('dashboard_scores')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('title', 'main_scores')
                    .maybeSingle();
                
                if (existingScores) {
                    await supabase
                        .from('dashboard_scores')
                        .update({ 
                            content: { 
                                appState,
                                scores: {
                                    IAL: appState.modes.IAL.scores,
                                    IGCSE: appState.modes.IGCSE.scores
                                }
                            }
                        })
                        .eq('id', existingScores.id);
                } else {
                    await supabase
                        .from('dashboard_scores')
                        .insert({
                            user_id: userId,
                            title: 'main_scores',
                            content: { 
                                appState,
                                scores: {
                                    IAL: appState.modes.IAL.scores,
                                    IGCSE: appState.modes.IGCSE.scores
                                }
                            }
                        });
                }
            } catch (error) {
                console.error('Error saving dashboard state:', error);
            }
        }, 1000); // 1s debounce
        return () => clearTimeout(handler);
    }, [appState, userId]);

    // Close exam level dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('#exam-level-select-table') && !target.closest('.exam-level-dropdown')) {
                setIsExamLevelDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Detect mobile mode
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Dismiss modals on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedMeanStats(null);
                setIsModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Position bottom actions based on active cell position
    useEffect(() => {
        if (!activeCellData || !bottomActionsRef.current) return;

        const positionBottomActions = () => {
            const bottomActions = bottomActionsRef.current;
            if (!bottomActions) return;

            const cellElement = document.querySelector(`[data-cell-id="${activeCellData.id}"]`) as HTMLElement;
            if (!cellElement) return;

            const cellRect = cellElement.getBoundingClientRect();
            const bottomActionsRect = bottomActions.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const midScreenY = viewportHeight / 2;
            const midScreenX = viewportWidth / 2;

            let left = 0;
            let top = 0;

            if (isMobile) {
                left = (viewportWidth - bottomActionsRect.width) / 2;
                if (cellRect.top < midScreenY) {
                    top = cellRect.bottom + 30;
                } else {
                    top = cellRect.top - bottomActionsRect.height - 30;
                }
            } else {
                const isCellInBottomRight = cellRect.bottom > midScreenY && cellRect.right > (midScreenX * 1.5);
                if (isCellInBottomRight) {
                    top = cellRect.top - bottomActionsRect.height - 30;
                    left = viewportWidth - bottomActionsRect.width - 30;
                } else {
                    top = viewportHeight - bottomActionsRect.height - 30;
                    left = viewportWidth - bottomActionsRect.width - 30;
                }
            }

            left = Math.max(30, Math.min(viewportWidth - bottomActionsRect.width - 30, left));
            top = Math.max(30, Math.min(viewportHeight - bottomActionsRect.height - 30, top));

            bottomActions.style.left = `${left}px`;
            bottomActions.style.top = `${top}px`;
        };

        positionBottomActions();
        window.addEventListener('scroll', positionBottomActions);
        window.addEventListener('resize', positionBottomActions);
        return () => {
            window.removeEventListener('scroll', positionBottomActions);
            window.removeEventListener('resize', positionBottomActions);
        };
    }, [activeCellData, isMobile, isBottomActionsVisible]);

    const handleScoreChange = useCallback((id: string, newScore: string, subject: string, paper: string) => {
        setAppState(prevState => {
            const newState = { ...prevState };
            newState.modes[prevState.currentMode as 'IAL' | 'IGCSE'].scores = {
                ...newState.modes[prevState.currentMode as 'IAL' | 'IGCSE'].scores,
                [id]: newScore
            };
            return newState;
        });
        setActiveCellData(prevData => {
            if (prevData && prevData.id === id) {
                return { ...prevData, score: newScore };
            }
            return prevData;
        });
    }, []);

    const handleCellFocus = useCallback((cellData: { id: string, subject: string, paper: string, year: number, series: string, mode: 'IAL' | 'IGCSE' }) => {
        setActiveCellData(cellData);
        setIsBottomActionsVisible(true);
    }, []);

    const handlePaperSelectionChange = useCallback((subject: string, paper: string, isChecked: boolean) => {
        setAppState(prevState => {
            const newState = { ...prevState };
            const currentSelectedPapers = { ...newState.modes[prevState.currentMode as 'IAL' | 'IGCSE'].selectedPapers };

            if (!currentSelectedPapers[subject]) {
                currentSelectedPapers[subject] = [];
            }

            if (isChecked) {
                if (!currentSelectedPapers[subject].includes(paper)) {
                    currentSelectedPapers[subject].push(paper);
                }
            } else {
                currentSelectedPapers[subject] = currentSelectedPapers[subject].filter(p => p !== paper);
            }
            newState.modes[prevState.currentMode as 'IAL' | 'IGCSE'].selectedPapers = currentSelectedPapers;
            return newState;
        });
    }, []);

    const handleSelectAllChange = useCallback((subject: string, isChecked: boolean) => {
        setAppState(prevState => {
            const newState = { ...prevState };
            const currentSubjectsData = prevState.currentMode === 'IAL' ? ialSubjectsData : igcseSubjectsData;
            const papers = (currentSubjectsData as any)[subject]?.papers || [];

            if (isChecked) {
                newState.modes[prevState.currentMode as 'IAL' | 'IGCSE'].selectedPapers[subject] = [...papers];
            } else {
                newState.modes[prevState.currentMode as 'IAL' | 'IGCSE'].selectedPapers[subject] = [];
            }
            return newState;
        });
    }, []);

    const handleSetYearRangeAndCloseModal = useCallback(() => {
        const startYear = parseInt((document.getElementById('start-year') as HTMLSelectElement).value);
        const startSeries = (document.getElementById('start-series') as HTMLSelectElement).value;
        const endYear = parseInt((document.getElementById('end-year') as HTMLSelectElement).value);
        const endSeries = (document.getElementById('end-series') as HTMLSelectElement).value;

        const currentSeriesOrderObj = getCurrentSeriesOrder();
        const startDateWeight = startYear * 100 + currentSeriesOrderObj[startSeries];
        const endDateWeight = endYear * 100 + currentSeriesOrderObj[endSeries];

        const yearRangeErrorElement = document.getElementById('year-range-error');
        if (startDateWeight > endDateWeight) {
            yearRangeErrorElement?.classList.remove('hidden');
            return;
        } else {
            yearRangeErrorElement?.classList.add('hidden');
        }

        setAppState(prevState => {
            const newState = { ...prevState };
            const newYears = generateYearSeriesRange(
                startYear, startSeries, endYear, endSeries,
                currentSeriesOrderObj, getCurrentMaxYearSelect(), getCurrentMaxSeriesSelect()
            );
            newState.modes[prevState.currentMode as 'IAL' | 'IGCSE'].years = newYears;
            return newState;
        });
        setIsModalOpen(false);
    }, [getCurrentSeriesOrder, getCurrentMaxYearSelect, getCurrentMaxSeriesSelect]);

    const switchMode = useCallback((newMode: 'IAL' | 'IGCSE') => {
        setAppState(prevState => ({
            ...prevState,
            currentMode: newMode
        }));
        setIsBottomActionsVisible(false);
    }, []);



    const handleGoToPaper = useCallback((type: 'qp' | 'ms') => {
        if (!activeCellData) return;
        const { subject, paper, year, series, mode: examLevel } = activeCellData;
        const examBoard = "Edexcel";

        const params = new URLSearchParams({
            subject: subject,
            paper: paper,
            series: series,
            year: year.toString(),
            examBoard: examBoard,
            examLevel: examLevel
        }).toString();

        window.open(`/past-papers/viewer?${params}&type=${type}`, '_blank');
    }, [activeCellData]);

    const hideBottomActions = useCallback(() => {
        setIsBottomActionsVisible(false);
    }, []);

    // --- ApexCharts logic ---
    const updateChart = () => {
        if (activeCellData && chartRef.current && typeof window !== 'undefined' && (window as any).ApexCharts) {
            const { subject, paper, mode } = activeCellData;
            const currentScores = appState.modes[mode as 'IAL' | 'IGCSE'].scores;
            const cellId = activeCellData.id;
            const rawScore = currentScores[cellId] || '';
            const maxMark = getPaperMaxMarks(subject, paper);

            let percentage = 0;
            if (rawScore && !isNaN(parseFloat(rawScore)) && maxMark && maxMark > 0) {
                percentage = Math.min(100, (parseFloat(rawScore) / maxMark) * 100);
            }

            chartRef.current.innerHTML = '';
            const chartOptions = {
                chart: {
                    type: "area",
                    height: 40,
                    toolbar: { show: false },
                    sparkline: { enabled: true },
                    animations: { enabled: false },
                    parentHeightOffset: 0
                },
                dataLabels: { enabled: false },
                stroke: { curve: 'smooth', width: 1, colors: ['#007aff'] },
                series: [{
                    name: "Distribution",
                    data: [1, 2, 5, 10, 20, 40, 70, 90, 100, 95, 80, 60, 40, 20, 10, 5, 2, 1, 0.5, 0.2]
                }],
                fill: {
                    type: "gradient",
                    gradient: {
                        shadeIntensity: 1,
                        opacityFrom: 0.7,
                        opacityTo: 0.9,
                        stops: [0, 90, 100],
                        colorStops: [{
                            offset: 0, color: '#007aff', opacity: 0.3
                        }, {
                            offset: 100, color: '#007aff', opacity: 0.1
                        }]
                    }
                },
                xaxis: {
                    categories: Array.from({ length: 20 }, (_, i) => `${i * 5}%`),
                    labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false }, tooltip: { enabled: false }
                },
                yaxis: { show: false },
                grid: { show: false, padding: { left: -5, right: -5, top: -5, bottom: -5 } },
                tooltip: { enabled: false }
            };

            const chartInstance = new (window as any).ApexCharts(chartRef.current, chartOptions);
            chartInstance.render();
        }
    };

    useEffect(() => {
        updateChart();
    }, [activeCellData, appState.modes]);

    const renderSubjectSelection = useCallback(() => {
        const currentSubjectsData = getCurrentSubjectsData();
        const currentSelectedPapers = appState.modes[currentMode as 'IAL' | 'IGCSE'].selectedPapers;

        return Object.entries(currentSubjectsData).map(([subject, data]) => {
            const allPapersSelected = data.papers.every(paper => currentSelectedPapers[subject]?.includes(paper));

            return (
                <div key={subject} className="mb-6">
                    <div className="flex items-baseline justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2 mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">{subject}</h3>
                        <button
                            onClick={() => handleSelectAllChange(subject, !allPapersSelected)}
                            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-850 dark:hover:text-zinc-200 cursor-pointer"
                        >
                            {allPapersSelected ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                        {data.papers.map(paper => {
                            const isChecked = currentSelectedPapers[subject]?.includes(paper) || false;
                            return (
                                <label
                                    key={paper}
                                    className={`flex items-center justify-center py-2 px-3 rounded text-xs font-bold border cursor-pointer transition-all duration-150 text-center ${
                                        isChecked
                                            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:border-zinc-100'
                                            : 'bg-white text-zinc-650 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-955 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-900'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="sr-only"
                                        checked={isChecked}
                                        onChange={(e) => handlePaperSelectionChange(subject, paper, e.target.checked)}
                                    />
                                    {paper}
                                </label>
                            );
                        })}
                    </div>
                </div>
            );
        });
    }, [currentMode, appState.modes, getCurrentSubjectsData, handlePaperSelectionChange, handleSelectAllChange]);

    const renderYearRangeSelectors = useCallback(() => {
        const currentSeriesArr = getCurrentSeries();
        const currentMaxYear = getCurrentMaxYearSelect();
        const currentYearsList = appState.modes[currentMode as 'IAL' | 'IGCSE'].years;

        let initialStartYear = 2019;
        let initialStartSeries = 'Jan';
        let initialEndYear = 2025;
        let initialEndSeries = 'Jun';

        if (currentYearsList.length > 0) {
            const latestYearSeries = currentYearsList[0];
            const earliestYearSeries = currentYearsList[currentYearsList.length - 1];
            initialStartYear = earliestYearSeries.year;
            initialStartSeries = earliestYearSeries.series;
            initialEndYear = latestYearSeries.year;
            initialEndSeries = latestYearSeries.series;
        } else {
            if (appState.currentMode === 'IGCSE') {
                initialStartYear = 2010;
                initialEndSeries = 'Nov';
            }
        }

        const currentYearValue = new Date().getFullYear();
        const yearsOptions = [];
        for (let year = Math.max(currentYearValue, currentMaxYear); year >= 2000; year--) {
            yearsOptions.push(<option key={year} value={year}>{year}</option>);
        }

        const seriesOptions = currentSeriesArr.map(s => (
            <option key={s} value={s}>{s}</option>
        ));

        return (
            <div id="year-range-section" className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">Set Tracking Year Range</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Start Point</label>
                        <div className="flex gap-2">
                            <select id="start-year" className="flex-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 rounded p-2 text-xs font-semibold outline-none"
                                defaultValue={initialStartYear}>
                                {yearsOptions}
                            </select>
                            <select id="start-series" className="flex-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 rounded p-2 text-xs font-semibold outline-none"
                                defaultValue={initialStartSeries}>
                                {seriesOptions}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">End Point</label>
                        <div className="flex gap-2">
                            <select id="end-year" className="flex-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 rounded p-2 text-xs font-semibold outline-none"
                                defaultValue={initialEndYear}>
                                {yearsOptions}
                            </select>
                            <select id="end-series" className="flex-1 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955 rounded p-2 text-xs font-semibold outline-none"
                                defaultValue={initialEndSeries}>
                                {seriesOptions}
                            </select>
                        </div>
                    </div>
                </div>
                <p id="year-range-error" className="text-red-500 text-xs font-semibold mt-3 hidden">Start date cannot be after end date.</p>
            </div>
        );
    }, [currentMode, getCurrentSeries, getCurrentMaxYearSelect, appState.modes, appState.currentMode]);

    const renderPaperGraphs = useCallback(() => {
        if (!activeCellData) return null;

        const { subject, paper, year, series, mode } = activeCellData;
        const currentScores = appState.modes[mode as 'IAL' | 'IGCSE'].scores;
        const cellId = `${mode}_${year}_${series}_${subject}_${paper}`.replace(/\s/g, '_');
        const rawScore = currentScores[cellId] || '';
        const maxMark = getPaperMaxMarks(subject, paper);

        let percentage = 0;
        if (rawScore && !isNaN(parseFloat(rawScore)) && maxMark && maxMark > 0) {
            percentage = Math.min(100, (parseFloat(rawScore) / maxMark) * 100);
        }
        const currentPercentile = calculatePercentile(percentage);

        return (
            <div className="overlay-graphs-container w-full">
                <div className="overlay-graph bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'left' }}>
                        <div className="overlay-graph-title text-zinc-500 dark:text-zinc-400">Grade: A*</div>
                        <div className="overlay-graph-title text-zinc-700 dark:text-zinc-300">UMS: <span className="text-center mt-1 font-bold">{rawScore || 0} / {maxMark || 0}</span></div>
                    </div>
                    <div className="progress-bar-container">
                        <div className="progress-bar" style={{ width: `${percentage}%` }}></div>
                    </div>
                </div>
                <div className="overlay-graph bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="overlay-graph-title text-zinc-500 dark:text-zinc-400">{currentPercentile}th Percentile</div>
                    <div id="chart-skewed-dist" ref={chartRef}></div>
                </div>
            </div>
        );
    }, [activeCellData, appState.modes, getPaperMaxMarks]);

    const renderStatsModal = () => {
        if (!selectedMeanStats) return null;
        const { subject, paper } = selectedMeanStats;
        const currentScores = appState.modes[currentMode as 'IAL' | 'IGCSE'].scores;
        const currentYears = appState.modes[currentMode as 'IAL' | 'IGCSE'].years;
        const maxMark = getPaperMaxMarks(subject, paper);

        // Gather all sittings chronologically
        const paperScores: { year: number; series: string; score: number; percentage: number; label: string }[] = [];
        const sortedYearsForStats = [...currentYears].reverse();
        sortedYearsForStats.forEach(({ year, series: serie }) => {
            const cellId = `${appState.currentMode}_${year}_${serie}_${subject}_${paper}`.replace(/\s/g, '_');
            const scoreStr = currentScores[cellId];
            if (scoreStr && scoreStr !== 'N/A' && !isNaN(parseFloat(scoreStr))) {
                const val = parseFloat(scoreStr);
                const pct = maxMark > 0 ? (val / maxMark) * 100 : 0;
                paperScores.push({ year, series: serie, score: val, percentage: pct, label: `${serie} '${year.toString().slice(-2)}` });
            }
        });

        const attempts   = paperScores.length;
        const meanScore  = attempts > 0 ? paperScores.reduce((s, p) => s + p.score, 0) / attempts : null;
        const meanPct    = attempts > 0 ? paperScores.reduce((s, p) => s + p.percentage, 0) / attempts : null;
        const peakScore  = attempts > 0 ? Math.max(...paperScores.map(p => p.score)) : null;
        const lowestScore= attempts > 0 ? Math.min(...paperScores.map(p => p.score)) : null;
        const stdDev     = attempts > 1 && meanPct !== null
            ? Math.sqrt(paperScores.reduce((s, p) => s + Math.pow(p.percentage - meanPct, 2), 0) / attempts) : null;

        const gradeFromPct = (p: number | null) => {
            if (p === null) return 'N/A';
            if (p >= 90) return 'A*'; if (p >= 80) return 'A';
            if (p >= 70) return 'B';  if (p >= 60) return 'C';
            if (p >= 50) return 'D';  return 'U';
        };
        const gradeEstimate = gradeFromPct(meanPct);

        let predictedPct = 0;
        if (attempts === 1) predictedPct = paperScores[0].percentage;
        else if (attempts === 2) predictedPct = (paperScores[0].percentage + paperScores[1].percentage * 2) / 3;
        else if (attempts >= 3) {
            const l = paperScores; const n = l.length;
            predictedPct = (l[n-3].percentage + l[n-2].percentage * 2 + l[n-1].percentage * 3) / 6;
        }
        const predictedGrade = attempts > 0 ? gradeFromPct(predictedPct) : 'N/A';
        const predictedScore = maxMark > 0 ? (predictedPct / 100) * maxMark : 0;
        const trendUp = paperScores.length >= 2 &&
            paperScores[paperScores.length - 1].percentage > paperScores[0].percentage;

        // Compare data: mean % across all papers in the current mode
        const flatList = getFlatPaperList();
        const compareData = flatList.map(({ subject: s, paper: p }) => {
            const scores: number[] = [];
            sortedYearsForStats.forEach(({ year, series: serie }) => {
                const cid = `${appState.currentMode}_${year}_${serie}_${s}_${p}`.replace(/\s/g, '_');
                const v = currentScores[cid];
                if (v && !isNaN(parseFloat(v))) scores.push(parseFloat(v));
            });
            const mMark = getPaperMaxMarks(s, p);
            const mPct = scores.length > 0 && mMark > 0
                ? (scores.reduce((a, b) => a + b, 0) / scores.length / mMark) * 100
                : null;
            return { label: `${s} ${p}`, pct: mPct, isCurrent: s === subject && p === paper };
        }).filter(d => d.pct !== null) as { label: string; pct: number; isCurrent: boolean }[];

        // SVG chart helpers
        const svgW = 480; const svgH = 160;
        const pl = 36; const pr = 12; const pt = 12; const pb = 28;
        const cW = svgW - pl - pr; const cH = svgH - pt - pb;
        const gX = (i: number) => attempts <= 1 ? pl + cW / 2 : pl + (i / (attempts - 1)) * cW;
        const gY = (pct: number) => pt + cH - (Math.min(100, pct) / 100) * cH;
        const linePoints = paperScores.map((ps, i) => `${gX(i)},${gY(ps.percentage)}`);
        const linePath = linePoints.length > 0 ? `M ${linePoints.join(' L ')}` : '';
        const areaPath = linePoints.length > 0
            ? `M ${gX(0)},${pt + cH} L ${linePoints.join(' L ')} L ${gX(attempts - 1)},${pt + cH} Z`
            : '';

        const exportChart = () => {
            const svg = document.getElementById('stats-chart-svg') as SVGSVGElement | null;
            if (!svg) return;
            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            canvas.width = svgW * 2; canvas.height = svgH * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
            const img = new window.Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const a = document.createElement('a');
                a.download = `${subject}_${paper}_trend.png`;
                a.href = canvas.toDataURL('image/png');
                a.click();
            };
            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        };

        return (
            <div className="modal-overlay fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" onClick={() => setSelectedMeanStats(null)}>
                <div className="modal-content w-full" style={{ maxWidth: '860px' }} onClick={(e) => e.stopPropagation()}>

                    {/* Header */}
                    <div className="modal-header flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
                                {subject} · {paper}
                            </h2>
                            <p className="text-[10px] text-zinc-400 mt-0.5 uppercase tracking-wider">
                                {currentMode} · {attempts} attempt{attempts !== 1 ? 's' : ''} · Max {maxMark} marks
                            </p>
                        </div>
                        <button className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer" onClick={() => setSelectedMeanStats(null)}>
                            <X size={15} />
                        </button>
                    </div>

                    {/* Two-pane body */}
                    <div className="modal-body" style={{ padding: 0, maxHeight: '78vh', overflowY: 'auto' }}>
                        {attempts === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-400 px-8">
                                <p className="font-semibold text-sm text-zinc-600 dark:text-zinc-300 mb-1">No data recorded</p>
                                <p className="text-xs max-w-xs">Enter scores for {subject} {paper} in the dashboard grid to unlock analytics.</p>
                            </div>
                        ) : (
                            <div className="flex divide-x divide-zinc-200 dark:divide-zinc-800" style={{ minHeight: '420px' }}>

                                {/* ── LEFT PANE ── */}
                                <div className="flex-1 min-w-0 p-5 space-y-5">

                                    {/* Stat cards */}
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Mean Score', value: meanScore !== null ? `${meanScore.toFixed(1)} / ${maxMark}` : '—', sub: meanPct !== null ? `${meanPct.toFixed(1)}%` : '' },
                                            { label: 'Peak Score', value: peakScore !== null ? String(peakScore) : '—', sub: peakScore !== null && maxMark > 0 ? `${((peakScore / maxMark) * 100).toFixed(0)}%` : '' },
                                            { label: 'Grade Est.', value: gradeEstimate, sub: meanPct !== null ? `${meanPct.toFixed(0)}% mean` : '' },
                                        ].map(({ label, value, sub }) => (
                                            <div key={label} className="p-3 rounded bg-zinc-50 dark:bg-zinc-900  text-center">
                                                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{label}</div>
                                                <div className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 leading-none">{value}</div>
                                                {sub && <div className="text-[10px] text-zinc-400 mt-0.5">{sub}</div>}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Trend chart */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Score Trend</span>
                                            <button onClick={exportChart} className="btn-notion-white px-2 py-1 cursor-pointer" style={{ fontSize: '10px' }}>↓ Export PNG</button>
                                        </div>
                                        <svg id="stats-chart-svg" width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="overflow-visible">
                                            <defs>
                                                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                                                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                                                </linearGradient>
                                            </defs>
                                            {/* Grade band backgrounds */}
                                            {[
                                                { min: 90, max: 100, c: 'rgba(22,163,74,0.07)' },
                                                { min: 80, max: 90,  c: 'rgba(37,99,235,0.07)' },
                                                { min: 60, max: 80,  c: 'rgba(217,119,6,0.06)' },
                                                { min: 0,  max: 60,  c: 'rgba(220,38,38,0.05)' },
                                            ].map(({ min, max, c }) => (
                                                <rect key={min} x={pl} y={gY(max)} width={cW} height={gY(min) - gY(max)} fill={c} />
                                            ))}
                                            {/* Grid lines */}
                                            {[30, 60, 80, 90].map(pct => (
                                                <g key={pct}>
                                                    <line x1={pl} y1={gY(pct)} x2={pl + cW} y2={gY(pct)} stroke="currentColor" strokeDasharray="3 4" className="text-zinc-200 dark:text-zinc-800" strokeWidth="0.8" />
                                                    <text x={pl - 6} y={gY(pct) + 3} textAnchor="end" fontSize="7" fontWeight="700" className="fill-zinc-400 dark:fill-zinc-500">{pct}%</text>
                                                </g>
                                            ))}
                                            {/* Area */}
                                            {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
                                            {/* Trend line */}
                                            {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
                                            {/* Mean dashed line */}
                                            {meanPct !== null && <line x1={pl} y1={gY(meanPct)} x2={pl + cW} y2={gY(meanPct)} stroke="#d97706" strokeWidth="1.2" strokeDasharray="5 3" />}
                                            {/* Data points */}
                                            {paperScores.map((ps, i) => {
                                                const cx = gX(i); const cy = gY(ps.percentage);
                                                const dc = ps.percentage >= 90 ? '#16a34a' : ps.percentage >= 80 ? '#2563eb' : ps.percentage >= 60 ? '#d97706' : ps.percentage >= 30 ? '#ea580c' : '#dc2626';
                                                return (
                                                    <g key={i}>
                                                        <circle cx={cx} cy={cy} r="5" fill={dc} />
                                                        <circle cx={cx} cy={cy} r="2.5" fill="white" />
                                                        <text x={cx} y={cy - 9} textAnchor="middle" fontSize="8" fontWeight="700" fill={dc}>{ps.score}</text>
                                                        <text x={cx} y={pt + cH + 16} textAnchor="middle" fontSize="7.5" fontWeight="600" className="fill-zinc-400 dark:fill-zinc-500">{ps.label}</text>
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                        <div className="flex items-center gap-4 mt-1">
                                            <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-semibold uppercase">
                                                <div className="w-5 h-0.5 rounded" style={{ background: '#2563eb' }} />Trend
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] text-zinc-400 font-semibold uppercase">
                                                <div className="w-5" style={{ borderTop: '1.5px dashed #d97706' }} />Mean
                                            </div>
                                        </div>
                                    </div>

                                    {/* Compare with other papers */}
                                    {compareData.length > 1 && (
                                        <div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">Compare with other papers</span>
                                            <div className="space-y-1.5">
                                                {compareData.map(({ label, pct, isCurrent }) => (
                                                    <div key={label} className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-semibold w-28 truncate shrink-0 ${isCurrent ? 'text-zinc-900 dark:text-zinc-100 font-bold' : 'text-zinc-400'}`}>{label}</span>
                                                        <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: isCurrent ? '#2563eb' : 'rgba(120,120,120,0.3)' }} />
                                                        </div>
                                                        <span className={`text-[10px] font-bold w-9 text-right shrink-0 ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'}`}>{pct.toFixed(0)}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── RIGHT PANE ── */}
                                <div className="w-56 shrink-0 p-5 space-y-5 bg-zinc-50/60 dark:bg-zinc-950/60">

                                    {/* Prediction */}
                                    <div>
                                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Prediction</div>
                                        <div className="p-3 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center space-y-1">
                                            <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 leading-none">{attempts > 0 ? predictedScore.toFixed(0) : '—'}</div>
                                            {maxMark > 0 && attempts > 0 && <div className="text-[10px] text-zinc-400">out of {maxMark}</div>}
                                            {attempts > 0 && (
                                                <div className="inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-1"
                                                    style={{ background: predictedPct >= 80 ? '#16a34a' : predictedPct >= 60 ? '#d97706' : '#dc2626', color: 'white' }}>
                                                    Grade {predictedGrade} · {predictedPct.toFixed(0)}%
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Detail stats */}
                                    <div>
                                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Details</div>
                                        <div className="space-y-0">
                                            {[
                                                { k: 'Lowest',  v: lowestScore !== null ? `${lowestScore} / ${maxMark}` : '—' },
                                                { k: 'Std Dev', v: stdDev !== null ? `±${stdDev.toFixed(1)}%` : 'N/A' },
                                                { k: 'Trend',   v: attempts >= 2 ? (trendUp ? '↑ Improving' : '↓ Declining') : 'Need ≥2' },
                                            ].map(({ k, v }) => (
                                                <div key={k} className="flex justify-between items-center py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                                                    <span className="text-zinc-400 font-medium text-[10px] uppercase tracking-wide">{k}</span>
                                                    <span className={`font-bold text-[11px] ${k === 'Trend' && attempts >= 2 ? (trendUp ? 'text-green-600' : 'text-red-500') : 'text-zinc-700 dark:text-zinc-300'}`}>{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Grade distribution */}
                                    {meanPct !== null && (
                                        <div>
                                            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Grade Distribution</div>
                                            <div className="space-y-1.5">
                                                {(['A*','A','B','C','D','U'] as const).map(g => {
                                                    const count = paperScores.filter(p => gradeFromPct(p.percentage) === g).length;
                                                    const gpct  = attempts > 0 ? (count / attempts) * 100 : 0;
                                                    const col   = g === 'A*' ? '#16a34a' : g === 'A' ? '#2563eb' : g === 'B' ? '#d97706' : g === 'C' ? '#ea580c' : '#dc2626';
                                                    return (
                                                        <div key={g} className="flex items-center gap-1.5">
                                                            <span className="text-[9px] font-extrabold w-4 shrink-0" style={{ color: col }}>{g}</span>
                                                            <div className="flex-1 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                                                                <div className="h-full rounded-full" style={{ width: `${gpct}%`, background: col }} />
                                                            </div>
                                                            <span className="text-[9px] text-zinc-400 font-semibold w-4 text-right">{count}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Open past papers */}
                                    <div className="pt-1">
                                        <button
                                            onClick={() => {
                                                const params = new URLSearchParams({ subject, paper, examBoard: 'Edexcel', examLevel: currentMode });
                                                window.open(`/past-papers?${params}`, '_blank');
                                            }}
                                            className="w-full btn-notion-white text-center"
                                            style={{ fontSize: '10px' }}
                                        >
                                            Open Past Papers →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button className="btn-notion-grey px-5 py-1.5 text-xs" onClick={() => setSelectedMeanStats(null)}>Close</button>
                    </div>
                </div>
            </div>
        );
    };



    const flatPaperList = getFlatPaperList();
    const currentYears = appState.modes[currentMode as 'IAL' | 'IGCSE'].years;
    const noPapersSelected = flatPaperList.length === 0;

    return (
        <div 
            id="app-container" 
            className="w-full flex-1 flex flex-col box-border relative min-h-0 bg-zinc-50 dark:bg-zinc-950"
        >
            <Script src="https://cdn.jsdelivr.net/npm/apexcharts" strategy="lazyOnload" onLoad={updateChart} />

            <style>{`
                .table-container {
                    max-width: 100%;
                    height: calc(100vh - 160px);
                    overflow: auto;
                    overscroll-behavior: none;
                    border: 1px solid var(--card-border);
                    border-radius: 4px;
                    background-color: var(--card-bg);
                    position: relative;
                }
                
                @media (min-width: 1024px) {
                    .table-container {
                        height: calc(100vh - 165px);
                    }
                }
                .table-container::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .table-container::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.1);
                    border-radius: 3px;
                }
                .dark .table-container::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                }
                table {
                    border-collapse: separate;
                    border-spacing: 0;
                    width: 100%;
                }
                th, td {
                    border: none;
                    border-bottom: 1px solid var(--card-border);
                    border-right: 1px solid rgba(120, 120, 120, 0.05);
                    padding: 0;
                    white-space: nowrap;
                    text-align: center;
                    position: relative;
                }
                th:last-child, td:last-child {
                    border-right: none;
                }
                td {
                    min-width: 90px;
                    height: 36px;
                }
                th {
                    background-color: var(--card-bg);
                    position: sticky;
                    top: 0;
                    z-index: 20;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--foreground);
                    letter-spacing: 0.025em;
                }
                tr:hover td {
                    background-color: rgba(120, 120, 120, 0.015);
                }
                td:first-child {
                    position: sticky;
                    left: 0;
                    z-index: 11;
                    background-color: var(--card-bg);
                    font-weight: 600;
                    border-right: 1px solid var(--card-border);
                }
                th:first-child {
                    position: sticky;
                    left: 0;
                    z-index: 30;
                    background-color: var(--card-bg);
                    padding: 0px;
                    min-width: 120px;
                    border-right: 1px solid var(--card-border);
                }
                #exam-level-select-table {
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                #exam-level-select-table:hover {
                    opacity: 0.95;
                }
                .exam-level-dropdown {
                    animation: dropdownFadeIn 0.15s ease-out;
                }
                @keyframes dropdownFadeIn {
                    from { opacity: 0; transform: translateY(-6px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .score-cell {
                    width: 100%;
                    height: 36px;
                    line-height: 36px;
                    text-align: center;
                    font-size: 0.75rem;
                    color: var(--foreground);
                    font-weight: 600;
                    border-radius: 0px !important;
                    margin: 0px !important;
                    border: none !important;
                    transition: background-color 0.15s ease;
                    overflow: hidden;
                    white-space: nowrap;
                    cursor: text;
                }
                .score-cell.has-score {
                    color: #ffffff !important;
                }
                .btn-primary {
                    background-color: var(--primary-color);
                    color: white;
                    padding: 0.45rem 1.25rem;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 0.75rem;
                    transition: background-color 0.15s ease;
                    cursor: pointer;
                    border: none;
                }
                .btn-primary:hover {
                    background-color: var(--primary-hover);
                }
                .btn-secondary {
                    background-color: var(--grey-bg);
                    color: var(--foreground);
                    padding: 0.45rem 1.25rem;
                    border-radius: 4px;
                    font-weight: 600;
                    font-size: 0.75rem;
                    transition: background-color 0.15s ease;
                    cursor: pointer;
                    border: none;
                }
                .btn-secondary:hover {
                    background-color: var(--grey-hover);
                }
                .modal-overlay {
                    background-color: rgba(9, 9, 11, 0.4);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                }
                .modal-content {
                    background-color: var(--card-bg);
                    border: 1px solid var(--card-border);
                    border-radius: 4px;
                    max-width: 90vw;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                }
                .modal-header {
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid var(--card-border);
                }
                .modal-body {
                    padding: 1.5rem;
                    flex-grow: 1;
                    overflow-y: auto;
                }
                .modal-footer {
                    padding: 1rem 1.5rem;
                    background-color: rgba(120,120,120,0.01);
                    border-top: 1px solid var(--card-border);
                    display: flex;
                    justify-content: flex-end;
                    border-radius: 0 0 4px 4px;
                }
                .overlay-graphs-container {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    margin-top: 0.75rem;
                    width: 100%;
                }
                .overlay-graph {
                    flex-shrink: 0;
                    width: 50%;
                    height: 90px;
                    border-radius: 6px;
                    padding: 6px 10px;
                    align-items: start;
                }
                .overlay-graph-title {
                    font-size: 11px;
                    font-weight: 600;
                    text-align: left;
                    margin-bottom: 2px;
                }
                .progress-bar-container {
                    width: 100%;
                    height: 8px;
                    background-color: rgba(0,0,0,0.1);
                    border-radius: 4px;
                    overflow: hidden;
                    margin: 6px auto 0;
                }
                .dark .progress-bar-container {
                    background-color: rgba(255,255,255,0.1);
                }
                .progress-bar {
                    height: 100%;
                    background-color: var(--primary-color);
                    transition: width 0.3s ease-in-out;
                    border-radius: 4px;
                }
                .mean-score-row {
                    font-weight: 700;
                    background-color: var(--card-bg);
                    position: sticky;
                    bottom: 0;
                    z-index: 15;
                }
                .mean-score-row td {
                    background-color: var(--card-bg);
                    border-top: 2px solid var(--card-border);
                    font-size: 0.85rem !important;
                    font-weight: 800 !important;
                }
                .mean-score-row td:first-child {
                    background-color: var(--card-bg);
                    color: #000000 !important;
                    border-right: 1px solid var(--card-border);
                }
                .dark .mean-score-row td:first-child {
                    color: var(--foreground) !important;
                }
                .mean-cell {
                    color: #000000 !important;
                    font-size: 0.85rem !important;
                    font-weight: 800 !important;
                    cursor: pointer !important;
                }
                .dark .mean-cell:not(.has-score) {
                    color: var(--foreground) !important;
                }
            `}</style>

            {/* Main Scores Dashboard Layout */}
            <div className="p-4 sm:p-6 flex-1 flex flex-col min-h-0">
                <div id="table-container" className={`table-container rounded bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 ${noPapersSelected ? 'hidden' : ''}`}>
                    <table id="scores-table">
                        <thead id="table-head">
                            <tr>
                                <th>
                                    <div className="relative flex items-center justify-between gap-1 h-full py-1 px-2.5">
                                        <div className="relative">
                                            <button
                                                id="exam-level-select-table"
                                                className="flex items-center gap-1 text-xs py-1 px-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded text-zinc-800 dark:text-zinc-200 font-bold transition-all duration-200 cursor-pointer uppercase tracking-wider bg-transparent border-none shadow-none"
                                                onClick={() => setIsExamLevelDropdownOpen(!isExamLevelDropdownOpen)}
                                                style={{ border: 'none', boxShadow: 'none' }}
                                            >
                                                {appState.currentMode}
                                                <svg 
                                                    className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${isExamLevelDropdownOpen ? 'rotate-180' : ''}`}
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            {isExamLevelDropdownOpen && (
                                                <div className="exam-level-dropdown absolute top-full mt-2 left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded py-1 w-28 z-50">
                                                    {(['IAL', 'IGCSE'] as const).map(mode => (
                                                        <button
                                                            key={mode}
                                                            className={`block w-full text-left px-4 py-2 text-xs font-bold transition-colors ${
                                                                appState.currentMode === mode
                                                                    ? "text-zinc-900 bg-zinc-100 dark:text-white dark:bg-zinc-800" 
                                                                    : "text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-850"
                                                            }`}
                                                            onClick={() => {
                                                                switchMode(mode);
                                                                setIsExamLevelDropdownOpen(false);
                                                            }}
                                                        >
                                                            {mode}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            id="open-select-papers-modal-btn-table-head"
                                            className="flex items-center justify-center cursor-pointer p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded text-zinc-400 hover:text-zinc-805 dark:hover:text-zinc-200 transition-colors border-none bg-transparent"
                                            onClick={() => setIsModalOpen(true)}
                                            title="Select Subjects & Papers"
                                        >
                                            <Menu size={15} />
                                        </button>
                                    </div>
                                </th>
                                {flatPaperList.map(({ subject, paper }) => (
                                    <th key={`${subject}-${paper}`}>
                                        <div className="text-zinc-900 dark:text-zinc-100 font-extrabold">{subject}</div>
                                        <div className="font-normal text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{paper}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody id="table-body">
                            {currentYears.map(({ year, series: serie }) => (
                                <tr key={`${year}-${serie}`}>
                                    <td className="text-zinc-600 dark:text-zinc-400 text-xs px-3 font-semibold">
                                        {year} {serie}
                                    </td>
                                    {flatPaperList.map(({ subject, paper }) => {
                                        const cellId = `${appState.currentMode}_${year}_${serie}_${subject}_${paper}`.replace(/\s/g, '_');
                                        const score = appState.modes[currentMode as 'IAL' | 'IGCSE'].scores[cellId] || '';

                                        const isDisabled = disabledPapersList.some(item =>
                                            item.examLevel === appState.currentMode &&
                                            item.subject === subject &&
                                            item.series === serie &&
                                            (item.paper === null || item.paper === paper) &&
                                            (item.year === null || item.year === year)
                                        ) || (appState.currentMode === 'IAL' && serie === 'Oct' && paper.startsWith('FP'));

                                        return (
                                            <td key={cellId}>
                                                <ScoreCell
                                                    id={cellId}
                                                    score={score}
                                                    subject={subject}
                                                    paper={paper}
                                                    year={year}
                                                    series={serie}
                                                    mode={appState.currentMode}
                                                    maxMark={getPaperMaxMarks(subject, paper)}
                                                    isDisabled={isDisabled}
                                                    onScoreChange={handleScoreChange}
                                                    onCellFocus={handleCellFocus}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot id="table-foot">
                            <tr className="mean-score-row">
                                <td>MEAN</td>
                                {flatPaperList.map(({ subject, paper }) => {
                                    const mean = calculateMeanScore(subject, paper);
                                    const meanText = mean !== null ? mean.toFixed(1) : 'N/A';
                                    const maxMark = getPaperMaxMarks(subject, paper);
                                    const hasScore = mean !== null;

                                    return (
                                        <td key={`mean-${subject}-${paper}`}>
                                            <div
                                                className={`score-cell mean-cell cursor-pointer hover:opacity-90 active:scale-95 transition-all duration-150 ${hasScore ? 'has-score' : ''}`}
                                                onClick={() => setSelectedMeanStats({ subject, paper })}
                                                title={`Click to view ${subject} ${paper} statistics`}
                                                style={{
                                                    backgroundColor: (() => {
                                                        let bgColor = '';
                                                        if (mean !== null && maxMark > 0) {
                                                            const percentage = (mean / maxMark) * 100;
                                                            if (percentage >= 90) bgColor = 'var(--color-90)';
                                                            else if (percentage >= 80) bgColor = 'var(--color-80)';
                                                            else if (percentage >= 60) bgColor = 'var(--color-70)';
                                                            else if (percentage >= 30) bgColor = 'var(--color-50)';
                                                            else bgColor = 'var(--color-fail)';
                                                        }
                                                        return bgColor;
                                                    })()
                                                }}
                                            >
                                                {meanText}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {noPapersSelected && (
                    <div id="no-papers-state" className="flex-1 flex flex-col items-center justify-center bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 rounded p-12 text-center text-zinc-555">
                        <p className="mb-4 font-semibold text-lg">No papers selected. Setup your curriculum tracking dashboard.</p>
                        <button id="select-papers-intro-btn" className="btn-primary flex items-center gap-2 px-6 py-3 font-semibold" onClick={() => setIsModalOpen(true)}>
                            <span>Select Papers</span>
                        </button>
                    </div>
                )}

                <div
                    id="bottom-actions"
                    ref={bottomActionsRef}
                    className={`fixed p-4 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded z-50 flex flex-col items-center w-[240px] pt-5 pb-4 transition-all duration-300 ${isBottomActionsVisible ? 'opacity-100 visible translate-y-0 scale-100' : 'opacity-0 invisible translate-y-2 scale-95'}`}
                >
                    <button id="close-bottom-actions-btn" className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={hideBottomActions}>
                        <X size={13} />
                    </button>
                    <div id="active-cell-info" className="-mt-1 leading-tight text-zinc-800 dark:text-zinc-200 text-xs mb-3 flex flex-col w-full text-left">
                        {activeCellData ? (
                            <>
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider truncate max-w-[210px]">
                                    {activeCellData.subject} • {activeCellData.paper}
                                </span>
                                <div className="flex items-baseline justify-between mt-1 gap-2">
                                    <span className="text-base font-extrabold tracking-tight">
                                        {activeCellData.series} {activeCellData.year}
                                    </span>
                                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                        {(() => {
                                            const score = appState.modes[activeCellData.mode as 'IAL' | 'IGCSE'].scores[activeCellData.id];
                                            const maxMark = getPaperMaxMarks(activeCellData.subject, activeCellData.paper);
                                            if (score && !isNaN(parseFloat(score)) && maxMark) {
                                                const percentage = ((parseFloat(score) / maxMark) * 100).toFixed(0);
                                                return `${score}/${maxMark} (${percentage}%)`;
                                            } else if (score === 'N/A') {
                                                return 'N/A';
                                            }
                                            return '—';
                                        })()}
                                    </span>
                                </div>
                            </>
                        ) : null}
                    </div>
                    <div className="flex space-x-2 w-full">
                        <button 
                            id="goto-qp-btn" 
                            className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer text-center btn-notion-black" 
                            onClick={() => handleGoToPaper('qp')}
                        >
                            Question
                        </button>
                        <button 
                            id="goto-ms-btn" 
                            className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer text-center btn-notion-grey" 
                            onClick={() => handleGoToPaper('ms')}
                        >
                            Answer
                        </button>
                    </div>
                </div>
            </div>

            {/* Config Modal */}
            {isModalOpen && (
                <div className="modal-overlay fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">Select Subjects and Papers</h2>
                            <p className="text-sm text-zinc-500 mt-1">Choose the papers you want to track. Changes are saved automatically.</p>
                        </div>
                        <div className="modal-body no-scrollbar">
                            <div className="mb-6 flex justify-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
                                <div className="inline-flex rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-850 p-1">
                                    {(['IAL', 'IGCSE'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            onClick={() => switchMode(mode)}
                                            className={`px-6 py-1.5 text-xs font-bold transition-all rounded cursor-pointer ${
                                                appState.currentMode === mode 
                                                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800' 
                                                    : 'text-zinc-550 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
                                            }`}
                                        >
                                            {mode}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                {renderSubjectSelection()}
                            </div>
                            {renderYearRangeSelectors()}
                        </div>
                        <div className="modal-footer">
                            <button id="close-modal-btn" className="btn-primary px-6 py-2" onClick={handleSetYearRangeAndCloseModal}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedMeanStats && renderStatsModal()}
        </div>
    );
}

