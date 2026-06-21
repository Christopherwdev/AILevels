"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, ChevronRight, Menu } from 'lucide-react';
import { disabledPapersList } from '@/utils/disabled-papers';
import { subjects } from '@/utils/subjects';

interface Paper {
    examBoard: string;
    examLevel: string;
    subject: string;
    paper: string;
    series: string;
    year: number | string;
    isComingSoon: boolean;
    id: string;
    isDisabled?: boolean;
}

// --- CONFIGURATION ---
const papersConfig: Record<string, Record<string, Record<string, string[]>>> = {
    'Edexcel': {
        'IAL': {
            'Physics': ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'],
            'Chemistry': ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'],
            'Biology': ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'],
            'Mathematics': ['P1', 'P2', 'P3', 'P4', 'M1', 'M2', 'M3', 'FP1', 'FP2', 'FP3', 'S1', 'S2', 'S3', 'D1']
        },
        'IGCSE': {
            'Chinese': ['Paper 1', 'Paper 2'],
            'English A': ['Paper 1', 'Paper 2'],
            'English B': ['Paper 1']
        }
    },
    'Cambridge': {
        'IAL': {}, 
        'IGCSE': {} 
    }
};

const allSeries = ['Jan', 'Jun', 'Oct', 'Nov'];
const years = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011];

// Shared config list imported from src/utils/disabled-papers.ts

const getFullMonthName = (abbr: string): string => {
    switch (abbr) {
        case 'Jan': return 'January';
        case 'Jun': return 'June';
        case 'Oct': return 'October';
        case 'Nov': return 'November';
        default: return '';
    }
};

const isPaperDisabled = (paper: Partial<Paper>): boolean => {
    return disabledPapersList.some(disabledEntry => {
        const matchBoard = disabledEntry.examBoard === null || disabledEntry.examBoard === paper.examBoard;
        const matchLevel = disabledEntry.examLevel === null || disabledEntry.examLevel === paper.examLevel;
        const matchSubject = disabledEntry.subject === null || disabledEntry.subject === paper.subject;
        const matchPaper = disabledEntry.paper === null || disabledEntry.paper === paper.paper;
        const matchSeries = disabledEntry.series === null || disabledEntry.series === paper.series;
        const matchYear = disabledEntry.year === null || disabledEntry.year === paper.year;
        return matchBoard && matchLevel && matchSubject && matchPaper && matchSeries && matchYear;
    });
};

const generateAllPapers = (): Paper[] => {
    const generatedPapers: Paper[] = [];
    Object.entries(papersConfig).forEach(([board, levels]) => {
        Object.entries(levels).forEach(([level, subjects]) => {
            if (board === 'Cambridge') {
                const commonSubjects = ['Biology', 'Physics', 'Chemistry', 'Mathematics'];
                commonSubjects.forEach(subject => {
                    const paper: Paper = {
                        examBoard: board,
                        examLevel: level,
                        subject: subject,
                        paper: 'N/A',
                        series: 'N/A',
                        year: 'N/A',
                        isComingSoon: true,
                        id: `${board}_${level}_${subject}_ComingSoon`.replace(/\s/g, '_')
                    };
                    generatedPapers.push(paper);
                });
            } else {
                Object.entries(subjects).forEach(([subject, papers]) => {
                    papers.forEach(paper => {
                        let seriesForThisPaper: string[] = [];

                        if (level === 'IAL') {
                            seriesForThisPaper = ['Jan', 'Jun', 'Oct'];
                            const specificMathematicsPapers = ['FP1', 'FP2', 'FP3', 'S3', 'M3'];
                            if (subject === 'Mathematics' && specificMathematicsPapers.includes(paper)) {
                                seriesForThisPaper = ['Jan', 'Jun'];
                            }
                        } else if (level === 'IGCSE') {
                            seriesForThisPaper = ['Jan', 'Jun', 'Nov'];
                            if (subject === 'Chinese') {
                                seriesForThisPaper = ['Jun', 'Nov'];
                            }
                        }

                        seriesForThisPaper.forEach(serie => {
                            years.forEach(year => {
                                const newPaper: Paper = {
                                    examBoard: board,
                                    examLevel: level,
                                    subject,
                                    paper,
                                    series: serie,
                                    year,
                                    isComingSoon: false,
                                    id: `${board}_${level}_${subject}_${paper}_${serie}_${year}`.replace(/\s/g, '_'),
                                    isDisabled: isPaperDisabled({
                                        examBoard: board,
                                        examLevel: level,
                                        subject,
                                        paper,
                                        series: serie,
                                        year
                                    })
                                };
                                generatedPapers.push(newPaper);
                            });
                        });
                    });
                });
            }
        });
    });

    generatedPapers.sort((a, b) => {
        if (a.isComingSoon && !b.isComingSoon) return 1;
        if (!a.isComingSoon && b.isComingSoon) return -1;
        if (a.isComingSoon && b.isComingSoon) return 0;

        if (typeof a.year === 'number' && typeof b.year === 'number' && a.year !== b.year) return b.year - a.year;
        if (a.examLevel !== b.examLevel) return a.examLevel.localeCompare(b.examLevel);
        if (a.examBoard !== b.examBoard) return a.examBoard.localeCompare(b.examBoard);
        if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
        return a.paper.localeCompare(b.paper);
    });

    return generatedPapers;
};

const allPapers: Paper[] = generateAllPapers();

const normalizeSubject = (subj: string) => {
    if (!subj) return '';
    return subj.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
};

export default function PastPapersPage() {
    const [examLevel, setExamLevel] = useState<string>('IAL');
    const [examBoard, setExamBoard] = useState<string>('Edexcel');
    const [subject, setSubject] = useState<string>('');
    const [unit, setUnit] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isKeywordSearchActive, setIsKeywordSearchActive] = useState<boolean>(false);
    const [filteredPapers, setFilteredPapers] = useState<Paper[]>([]);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
    const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

    const applyFiltersAndSearch = useCallback((query: string) => {
        const lowerCaseQuery = query.toLowerCase().trim();
        setIsKeywordSearchActive(lowerCaseQuery.length > 0);

        let papersToFilter = allPapers.filter(paper =>
            paper.examLevel === examLevel &&
            paper.examBoard === examBoard
        );

        let currentFilteredPapers: Paper[];

        if (lowerCaseQuery.length > 0) {
            currentFilteredPapers = papersToFilter.filter(paper => {
                const paperFullText = `${paper.subject} ${paper.paper} ${paper.series} ${paper.year} ${getFullMonthName(paper.series)}`.toLowerCase();
                return paperFullText.includes(lowerCaseQuery);
            });
        } else {
            currentFilteredPapers = papersToFilter.filter(paper => {
                let matchSubject = true;
                let matchUnit = true;

                if (subject && paper.subject !== subject) {
                    matchSubject = false;
                }

                if (unit && paper.paper !== unit) {
                    matchUnit = false;
                }
                return matchSubject && matchUnit;
            });
        }
        setFilteredPapers(currentFilteredPapers);
    }, [examLevel, examBoard, subject, unit]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const examBoardParam = urlParams.get('examBoard');
        const examLevelParam = urlParams.get('examLevel');
        const subjectParam = urlParams.get('subject');
        const paperParam = urlParams.get('paper');

        if (examBoardParam) setExamBoard(examBoardParam);
        if (examLevelParam) {
            if (examLevelParam === 'IGCSE') {
                setExamLevel('IAL');
            } else {
                setExamLevel(examLevelParam);
            }
        }
        if (subjectParam) setSubject(normalizeSubject(subjectParam));
        if (paperParam) setUnit(paperParam);
        setIsInitialLoad(false);
    }, []);

    useEffect(() => {
        if (isInitialLoad) return;
        const subjectsForCurrentSelection = papersConfig[examBoard]?.[examLevel];
        
        if (subjectsForCurrentSelection && Object.keys(subjectsForCurrentSelection).length > 0) {
            const availableSubjects = Object.keys(subjectsForCurrentSelection);
            if (!subject) {
                setSubject(availableSubjects[0]);
            }
        } else {
            setSubject('');
            setUnit('');
        }
    }, [examBoard, examLevel, isInitialLoad, subject]);

    useEffect(() => {
        if (isInitialLoad) return;
        if (!subject) return;
        const unitsForSubject = papersConfig[examBoard]?.[examLevel]?.[subject];
        
        if (unitsForSubject && unitsForSubject.length > 0) {
            if (!unit) {
                setUnit(unitsForSubject[0]);
            }
        } else {
            setUnit('');
        }
    }, [subject, examBoard, examLevel, isInitialLoad, unit]);

    useEffect(() => {
        applyFiltersAndSearch(searchTerm);
    }, [searchTerm, examLevel, examBoard, subject, unit, applyFiltersAndSearch]);

    useEffect(() => {
        if (isInitialLoad) return;
        const params = new URLSearchParams();
        if (examBoard) params.set('examBoard', examBoard);
        if (examLevel) params.set('examLevel', examLevel);
        if (subject) params.set('subject', subject);
        if (unit) params.set('paper', unit);

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
    }, [examBoard, examLevel, subject, unit, isInitialLoad]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setMobileSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleClearSearch = () => {
        setSearchTerm('');
    };

    const handleExamBoardChange = (newExamBoard: string) => {
        setExamBoard(newExamBoard);
        const subjectsForNewBoard = papersConfig[newExamBoard]?.[examLevel];
        if (subjectsForNewBoard && Object.keys(subjectsForNewBoard).length > 0) {
            const availableSubjects = Object.keys(subjectsForNewBoard);
            if (subject && !availableSubjects.includes(subject)) {
                setSubject(availableSubjects[0]);
                setUnit('');
            }
        } else {
            setSubject('');
            setUnit('');
        }
    };

    const handleExamLevelChange = (newExamLevel: string) => {
        setExamLevel(newExamLevel);
        const subjectsForNewLevel = papersConfig[examBoard]?.[newExamLevel];
        if (subjectsForNewLevel && Object.keys(subjectsForNewLevel).length > 0) {
            const availableSubjects = Object.keys(subjectsForNewLevel);
            if (subject && !availableSubjects.includes(subject)) {
                setSubject(availableSubjects[0]);
                setUnit('');
            }
        } else {
            setSubject('');
            setUnit('');
        }
    };

    const handleSubjectChange = (newSubject: string) => {
        setSubject(newSubject);
        const unitsForNewSubject = papersConfig[examBoard]?.[examLevel]?.[newSubject];
        if (unitsForNewSubject && unitsForNewSubject.length > 0) {
            setUnit(unitsForNewSubject[0]);
        } else {
            setUnit('');
        }
    };

    const handleUnitChange = (newUnit: string) => {
        setUnit(newUnit);
    };

    const handlePaperAction = (paper: Paper, type: 'qp' | 'ms' | 'share') => {
        if (paper.isComingSoon) return;

        if (type === 'qp' || type === 'ms') {
            const params = new URLSearchParams({
                subject: paper.subject,
                paper: paper.paper,
                series: paper.series,
                year: paper.year.toString(),
                examBoard: examBoard,
                examLevel: examLevel
            }).toString();
            window.open(`/past-papers/viewer?${params}&type=${type}`, '_blank');
        } else if (type === 'share') {
            const shareParams = new URLSearchParams({
                examBoard: paper.examBoard,
                examLevel: paper.examLevel,
                subject: paper.subject,
                paper: paper.paper,
                series: paper.series,
                year: paper.year.toString()
            }).toString();
            const shareableUrl = `${window.location.origin}${window.location.pathname}?${shareParams}`;
            navigator.clipboard.writeText(shareableUrl).then(() => {
                const toast = document.createElement('div');
                toast.textContent = 'Copied shareable link!';
                toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-black text-white dark:bg-white dark:text-black border border-black/10 px-4 py-2 rounded-lg shadow-lg text-xs z-50';
                document.body.appendChild(toast);
                setTimeout(() => { toast.remove(); }, 2000);
            });
        }
    };

    const renderPapers = useCallback((papersToRender: Paper[]) => {
        if (papersToRender.length === 0) {
            return (
                <div className="text-center py-16 text-zinc-550 text-sm">
                    No matching papers found.
                </div>
            );
        }

        const papersByYear: Record<string, Paper[]> = {};
        papersToRender.forEach(paper => {
            const yearKey = paper.year === 'N/A' ? 'Coming Soon' : paper.year.toString();
            if (!papersByYear[yearKey]) {
                papersByYear[yearKey] = [];
            }
            papersByYear[yearKey].push(paper);
        });

        return Object.entries(papersByYear)
            .sort(([a], [b]) => {
                if (a === 'Coming Soon') return 1;
                if (b === 'Coming Soon') return -1;
                return parseInt(b) - parseInt(a);
            })
            .map(([year, yearPapers]) => (
                <div key={year} className="space-y-1.5">
                    <h3 className="text-[20px] ml-4 font-bold text-zinc-900 dark:text-zinc-100 ml-1 mt-6 mb-2">
                        {year}
                    </h3>
                    <div className="space-y-1.5">
                        {year === 'Coming Soon' ? (
                            yearPapers.map(paper => (
                                <PaperCard key={paper.id} paper={paper} onAction={handlePaperAction} />
                            ))
                        ) : (
                            Object.entries(yearPapers.reduce((acc, paper) => {
                                if (!acc[paper.series]) acc[paper.series] = [];
                                acc[paper.series].push(paper);
                                return acc;
                            }, {} as Record<string, Paper[]>))
                                .sort(([a], [b]) => {
                                    const seriesOrder: Record<string, number> = { 'Jan': 0, 'Jun': 1, 'Oct': 2, 'Nov': 3 };
                                    return (seriesOrder[a] || 99) - (seriesOrder[b] || 99);
                                })
                                .map(([, seriesPapers]) => (
                                    seriesPapers.map(paper => (
                                        <PaperCard key={paper.id} paper={paper} onAction={handlePaperAction} />
                                    ))
                                ))
                        )}
                    </div>
                </div>
            ));
    }, []);

    const subjectsForCurrentSelection = papersConfig[examBoard]?.[examLevel] || {};
    const unitsForCurrentSubject = subjectsForCurrentSelection[subject] || [];

    return (
        <div className="h-[calc(100vh-4rem)] w-full flex overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/20 transition-colors duration-300">
            {/* Mobile Sidebar Toggle Button */}
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden fixed bottom-6 right-6 p-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded border border-zinc-200 dark:border-zinc-800 z-30 flex items-center justify-center cursor-pointer"
            >
              <Menu size={20} />
            </button>

            {/* Backdrop for Mobile */}
            {mobileSidebarOpen && (
                <div 
                  className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-opacity"
                  onClick={() => setMobileSidebarOpen(false)}
                />
            )}

            {/* Left Sidebar Filter Section */}
            <aside 
              className={`fixed lg:relative top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-6 z-40 lg:z-10 transition-transform duration-300 lg:translate-x-0 overflow-hidden flex flex-col gap-6 ${
                mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
            >
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">Past Papers</h2>
                    <button className="lg:hidden p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-full cursor-pointer" onClick={() => setMobileSidebarOpen(false)}>
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Search Bar Input inside the sidebar */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search papers (e.g. Biology Unit 1 2023)"
                            className="w-full pl-10 pr-8 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs bg-zinc-50 dark:bg-zinc-900/50 dark:text-zinc-100"
                            value={searchTerm}
                            onChange={handleSearchInputChange}
                        />
                        <Search className="absolute left-3 top-2.5 text-zinc-400" size={14} />
                        {searchTerm && (
                            <button onClick={handleClearSearch} className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-650">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">EXAM LEVEL</label>
                        <select
                            className="w-full p-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-zinc-100 cursor-pointer"
                            value={examLevel}
                            onChange={(e) => handleExamLevelChange(e.target.value)}
                            disabled={isKeywordSearchActive}
                        >
                            <option value="IAL">IAL</option>
                            <option value="IGCSE" disabled>IGCSE (Temporarily Disabled)</option>
                        </select>
                    </div>

                    {Object.keys(subjectsForCurrentSelection).length > 0 && (
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">SUBJECT</label>
                            <select
                                className="w-full p-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-zinc-100 cursor-pointer"
                                value={subject}
                                onChange={(e) => handleSubjectChange(e.target.value)}
                                disabled={isKeywordSearchActive}
                            >
                                {Object.keys(subjectsForCurrentSelection).map(subj => (
                                    <option key={subj} value={subj}>{subj}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Unit/Paper Selector */}
                {unitsForCurrentSubject.length > 0 && (
                    <div className="flex flex-col gap-2 bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl">
                        <label className="block text-[10px] font-bold text-zinc-450 dark:text-zinc-400 uppercase tracking-widest mb-1">Select Unit</label>
                        <div className="flex flex-wrap gap-2">
                            {unitsForCurrentSubject.map(u => (
                                <button
                                  key={u}
                                  onClick={() => handleUnitChange(u === unit ? '' : u)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer grow text-center ${
                                      unit === u 
                                          ? 'bg-blue-600 text-white' 
                                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-350 hover:bg-zinc-200 dark:hover:bg-zinc-750'
                                  }`}
                                  disabled={isKeywordSearchActive}
                                >
                                  {u}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content View */}
            <main className="flex-1 overflow-y-auto py-4 sm:py-6 lg:py-8 w-full">
                <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
                    {/* Engine Header Info Block */}
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                                    {examBoard} • {examLevel} {subject && `• ${subject}`} {unit && `• ${unit}`}
                                </h1>
                            </div>
                            <div className="hidden lg:flex items-center gap-2">
                                <span className="px-3 py-1 text-xs font-bold rounded border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900">
                                    {filteredPapers.length} Papers Available
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Papers list output */}
                    <div className="space-y-6">
                        {renderPapers(filteredPapers)}
                    </div>

                    {/* Copyright Disclaimer Footer */}
                    <footer className="mt-12 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded space-y-4 text-xs max-w-4xl">
                        <div className="text-zinc-900 dark:text-zinc-100 font-extrabold">Copyright & Compliance Notice</div>
                        <div className="grid md:grid-cols-2 gap-4 text-[11px] text-zinc-500 leading-relaxed">
                            <div className="space-y-1">
                                <span className="font-bold text-zinc-700 dark:text-zinc-300">1. Ownership & Copyrights</span>
                                <p>All past papers, mark schemes, and materials are properties of Pearson plc / Cambridge Assessment.</p>
                                <p>Precision Edu has no claim, credentials, or rights of ownership over these components.</p>
                            </div>
                            <div className="space-y-1">
                                <span className="font-bold text-zinc-700 dark:text-zinc-300">2. Educational Intent</span>
                                <p>Access is restricted to registered students for academic and revision use only.</p>
                                <p>Copying, resale, or distribution of these resources is strictly prohibited.</p>
                            </div>
                        </div>
                        <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 text-[10px] text-center text-zinc-400">
                            © 2026 Precision Edu | Independent revision platform | Pearson Edexcel & CIE Materials educational utilization.
                        </div>
                    </footer>
                </div>
            </main>
        </div>
    );
}

interface PaperCardProps {
    paper: Paper;
    onAction: (paper: Paper, type: 'qp' | 'ms' | 'share') => void;
}

const PaperCard: React.FC<PaperCardProps> = ({ paper, onAction }) => {
    const seriesDisplay = paper.series === 'N/A' ? '' : `${paper.series} `;
    const yearDisplay = paper.year === 'N/A' ? '' : `${paper.year}`;
    const paperPartDisplay = paper.paper === 'N/A' ? '' : paper.paper;

    const getSubjectColor = (subj: string) => {
        const s = subj.toLowerCase();
        let matched = subjects.find(sub => s.includes(sub.slug) || sub.slug.includes(s));
        if (!matched) {
            if (s.includes('math')) matched = subjects.find(sub => sub.slug === 'mathematics');
            if (s.includes('english')) matched = subjects.find(sub => sub.slug.includes('english'));
        }
        return matched ? matched.color : '#71717a';
    };

    const subjColor = getSubjectColor(paper.subject);

    return (
        <div className={`flex items-center justify-between border rounded-xl py-2.5 px-3 transition-all duration-200 group ${
            paper.isDisabled
                ? 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/40 dark:border-zinc-800/40 opacity-40 select-none'
                : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/60 shadow-xl shadow-zinc-900/5 hover:border-zinc-350 dark:hover:border-zinc-700'
        }`}>
            <div className="flex items-center min-w-0">
                <div className="text-[16px] text-zinc-900 dark:text-zinc-100 truncate">
                    <span style={{ color: paper.isDisabled ? '#71717a' : subjColor }} className="font-bold mr-1.5">{paper.subject}</span>
                    <span className=" text-zinc-850 dark:text-zinc-250 mr-1.5">{paperPartDisplay}</span>
                    <span className="text-zinc-400 dark:text-zinc-500">{seriesDisplay}{yearDisplay}</span>
                    {paper.isComingSoon && <span className="text-[10px] text-zinc-400 uppercase ml-2">(Coming Soon)</span>}
                    {paper.isDisabled && <span className="text-[10px] text-red-500/70 dark:text-red-455/70 font-semibold uppercase ml-2">(Disabled)</span>}
                </div>
            </div>

            {!paper.isComingSoon && (
                <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button
                        onClick={() => !paper.isDisabled && onAction(paper, 'qp')}
                        disabled={paper.isDisabled}
                        className={`px-3 py-1.5 text-center rounded-md text-[11px] font-bold transition-colors ${
                            paper.isDisabled
                                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-605 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                        }`}
                    >
                        Question
                    </button>
                    <button
                        onClick={() => !paper.isDisabled && onAction(paper, 'ms')}
                        disabled={paper.isDisabled}
                        className={`px-3 py-1.5 text-center rounded-md text-[11px] font-bold transition-colors ${
                            paper.isDisabled
                                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-605 cursor-not-allowed'
                                : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 cursor-pointer'
                        }`}
                    >
                        Answer
                    </button>
                </div>
            )}
        </div>
    );
};

PaperCard.displayName = 'PaperCard';
