"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSubjectBySlug, getSubjectIcon } from '@/utils/subjects';
import { BookOpen, Play, FileText, ExternalLink, Clock, ChevronRight } from 'lucide-react';

type Tab = 'notes' | 'videos' | 'past-papers';

// Sample notes data per subject
const notesData: Record<string, { title: string; description: string; topics: string[] }[]> = {
  physics: [
    { title: 'Unit 1 — Mechanics', description: 'Kinematics, dynamics, energy, and momentum', topics: ['Scalars & Vectors', 'Kinematics', "Newton's Laws", 'Work & Energy', 'Momentum'] },
    { title: 'Unit 2 — Waves & Electricity', description: 'Wave properties, DC circuits, and resistivity', topics: ['Wave Properties', 'Superposition', 'DC Circuits', 'Resistivity', 'EMF & Internal Resistance'] },
    { title: 'Unit 4 — Further Mechanics & Fields', description: 'Circular motion, oscillations, gravitational and electric fields', topics: ['Circular Motion', 'SHM', 'Gravitational Fields', 'Electric Fields', 'Capacitors'] },
    { title: 'Unit 5 — Thermodynamics & Nuclear', description: 'Thermal physics, nuclear decay, and particle physics', topics: ['Thermal Energy', 'Ideal Gases', 'Nuclear Decay', 'Particle Physics', 'Radioactivity'] },
  ],
  chemistry: [
    { title: 'Unit 1 — Structure & Bonding', description: 'Atomic structure, bonding, and energetics', topics: ['Atomic Structure', 'Ionic Bonding', 'Covalent Bonding', 'Energetics', 'Redox'] },
    { title: 'Unit 2 — Organic Chemistry I', description: 'Introduction to organic chemistry and mechanisms', topics: ['Alkanes', 'Alkenes', 'Alcohols', 'Halogenoalkanes', 'Reaction Mechanisms'] },
    { title: 'Unit 4 — Rates & Equilibria', description: 'Chemical kinetics, equilibria, and acids/bases', topics: ['Rates of Reaction', 'Chemical Equilibrium', 'Acids & Bases', 'pH Calculations', 'Buffer Solutions'] },
    { title: 'Unit 5 — Transition Metals & Organic II', description: 'Transition metal chemistry and advanced organic', topics: ['Transition Metals', 'Ligand Substitution', 'Aldehydes & Ketones', 'Carboxylic Acids', 'Amines'] },
  ],
  biology: [
    { title: 'Unit 1 — Molecules & Cells', description: 'Biological molecules, enzymes, and cell structure', topics: ['Carbohydrates', 'Proteins', 'Lipids', 'Enzymes', 'Cell Structure'] },
    { title: 'Unit 2 — Exchange & Transport', description: 'Gas exchange, circulation, and transport in plants', topics: ['Gas Exchange', 'Heart & Circulation', 'Haemoglobin', 'Plant Transport', 'Water Potential'] },
    { title: 'Unit 4 — Ecology & Genetics', description: 'Populations, succession, inheritance, and selection', topics: ['Ecosystems', 'Populations', 'Inheritance', 'Natural Selection', 'Speciation'] },
    { title: 'Unit 5 — Control & Coordination', description: 'Nervous system, hormones, and homeostasis', topics: ['Nervous System', 'Muscle Contraction', 'Homeostasis', 'Gene Expression', 'DNA Technology'] },
  ],
  mathematics: [
    { title: 'Pure Mathematics 1', description: 'Algebra, coordinate geometry, and calculus basics', topics: ['Algebra & Functions', 'Coordinate Geometry', 'Sequences & Series', 'Differentiation', 'Integration'] },
    { title: 'Pure Mathematics 2', description: 'Trigonometry, exponentials, and proof', topics: ['Trigonometry', 'Exponentials & Logs', 'Proof', 'Binomial Expansion', 'Partial Fractions'] },
    { title: 'Statistics 1', description: 'Probability, distributions, and hypothesis testing', topics: ['Data Representation', 'Probability', 'Binomial Distribution', 'Normal Distribution', 'Hypothesis Testing'] },
    { title: 'Mechanics 1', description: 'Forces, motion, and moments', topics: ['Kinematics', 'Dynamics', 'Statics', 'Moments', 'Vectors'] },
  ],
  chinese: [
    { title: 'Paper 1 — Listening', description: 'Listening comprehension and response techniques', topics: ['Dialogue Comprehension', 'Monologue Analysis', 'Note Completion', 'Multiple Choice', 'Summary Writing'] },
    { title: 'Paper 2 — Reading & Writing', description: 'Reading comprehension and extended writing', topics: ['Reading Passages', 'Character Recognition', 'Essay Writing', 'Translation', 'Summary'] },
  ],
  'english-a': [
    { title: 'Paper 1 — Non-Fiction', description: 'Anthology and unseen non-fiction analysis', topics: ['Anthology Texts', 'Language Analysis', 'Writer\u2019s Techniques', 'Comparison', 'Directed Writing'] },
    { title: 'Paper 2 — Poetry & Prose', description: 'Poetry and prose literary analysis', topics: ['Poetry Analysis', 'Prose Passages', 'Character Analysis', 'Theme Exploration', 'Comparative Writing'] },
  ],
  'english-b': [
    { title: 'Paper 1 — Extended Essay', description: 'Extended essay and comprehension', topics: ['Comprehension', 'Summary Writing', 'Argumentative Essay', 'Descriptive Writing', 'Narrative Writing'] },
  ],
};

// Sample videos per subject
const videosData: Record<string, { title: string; channel: string; duration: string; thumbnail: string; url: string }[]> = {
  physics: [
    { title: 'Unit 1 Complete Revision — Mechanics', channel: 'Physics Online', duration: '1:24:30', thumbnail: '', url: '#' },
    { title: 'Waves & Electricity Key Concepts', channel: 'Science Shorts', duration: '45:12', thumbnail: '', url: '#' },
    { title: 'Fields & Particle Physics — Unit 4/5', channel: 'A Level Physics', duration: '2:10:00', thumbnail: '', url: '#' },
  ],
  chemistry: [
    { title: 'Organic Chemistry Mechanisms Masterclass', channel: 'ChemGuide', duration: '1:55:00', thumbnail: '', url: '#' },
    { title: 'Energetics & Kinetics Revision', channel: 'Chemistry Academy', duration: '58:30', thumbnail: '', url: '#' },
    { title: 'Transition Metals Complete Guide', channel: 'Chem Tutor Pro', duration: '1:12:45', thumbnail: '', url: '#' },
  ],
  biology: [
    { title: 'Biological Molecules — Full Revision', channel: 'Biology Boost', duration: '1:30:00', thumbnail: '', url: '#' },
    { title: 'Gas Exchange & Transport Systems', channel: 'Bio Explained', duration: '52:20', thumbnail: '', url: '#' },
    { title: 'Genetics & Inheritance Crash Course', channel: 'A Level Bio', duration: '1:08:15', thumbnail: '', url: '#' },
  ],
  mathematics: [
    { title: 'Pure Mathematics 1 — Full Course', channel: 'Maths Made Easy', duration: '3:20:00', thumbnail: '', url: '#' },
    { title: 'Statistics S1 Revision Guide', channel: 'ExamSolutions', duration: '1:45:00', thumbnail: '', url: '#' },
    { title: 'Mechanics M1 Worked Examples', channel: 'TL Maths', duration: '2:00:00', thumbnail: '', url: '#' },
  ],
  chinese: [
    { title: 'IGCSE Chinese Listening Practice', channel: 'Chinese Academy', duration: '45:00', thumbnail: '', url: '#' },
    { title: 'Essay Writing Techniques', channel: 'IGCSE Chinese Hub', duration: '32:15', thumbnail: '', url: '#' },
  ],
  'english-a': [
    { title: 'Anthology Walkthrough', channel: 'English Literature', duration: '1:10:00', thumbnail: '', url: '#' },
    { title: 'Poetry Analysis Techniques', channel: 'A Level English', duration: '55:30', thumbnail: '', url: '#' },
  ],
  'english-b': [
    { title: 'Extended Essay Writing Guide', channel: 'IGCSE English', duration: '40:00', thumbnail: '', url: '#' },
  ],
};

export default function LearnSubjectPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.subject as string;
  const subject = getSubjectBySlug(slug);
  const [activeTab, setActiveTab] = useState<Tab>('notes');

  if (!subject) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-center space-y-3">
          <p className="text-zinc-400 text-sm font-semibold">Subject not found</p>
          <button onClick={() => router.push('/dashboard')} className="text-blue-500 text-xs font-bold hover:underline cursor-pointer">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const notes = notesData[slug] || [];
  const videos = videosData[slug] || [];

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'notes', label: 'Notes', icon: <BookOpen size={14} /> },
    { key: 'videos', label: 'Videos', icon: <Play size={14} /> },
    { key: 'past-papers', label: 'Past Papers', icon: <FileText size={14} /> },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-950">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ background: `radial-gradient(circle at 30% 50%, ${subject.color}, transparent 60%)` }} />
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center gap-4">
            {(() => {
              const SubjectIcon = getSubjectIcon(subject.iconName);
              return (
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-black shadow-lg flex-shrink-0"
                  style={{ backgroundColor: subject.color }}
                >
                  <SubjectIcon size={24} className="text-white" />
                </div>
              );
            })()}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">
                Edexcel {subject.level}
              </p>
              <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                {subject.name}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.key === 'past-papers') {
                  router.push('/past-papers');
                  return;
                }
                setActiveTab(tab.key);
              }}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === tab.key && tab.key !== 'past-papers'
                  ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'past-papers' && <ExternalLink size={10} className="ml-0.5 opacity-50" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'notes' && (
          <div className="grid gap-5 md:grid-cols-2">
            {notes.map((note, i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200/60 dark:border-zinc-800/60 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">{note.title}</h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{note.description}</p>
                  </div>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: subject.color + '15', color: subject.color }}
                  >
                    <BookOpen size={14} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {note.topics.map((topic, j) => (
                    <span
                      key={j}
                      className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, i) => (
              <a
                key={i}
                href={video.url}
                className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200/60 dark:border-zinc-800/60 hover:shadow-md transition-all group block"
              >
                {/* Video Thumbnail Placeholder */}
                <div
                  className="h-36 flex items-center justify-center relative"
                  style={{ backgroundColor: subject.color + '10' }}
                >
                  <div className="w-12 h-12 rounded-full bg-white/90 dark:bg-zinc-900/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play size={20} style={{ color: subject.color }} className="ml-0.5" />
                  </div>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-bold rounded flex items-center gap-1">
                    <Clock size={9} />
                    {video.duration}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mb-1 line-clamp-2">{video.title}</h3>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{video.channel}</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
