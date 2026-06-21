import React from 'react';
import { 
  Dna, 
  FlaskConical, 
  Atom, 
  Calculator, 
  Languages, 
  Book, 
  BookOpen, 
  Speech, 
  Pencil, 
  Headphones,
  HelpCircle
} from 'lucide-react';

export interface SubjectInfo {
  slug: string;
  name: string;
  examBoard: string;
  subjectName: string;
  color: string;
  level: 'IAL' | 'IGCSE' | 'IELTS';
  iconName: string;
}

// Map iconName strings to Lucide React Component types
export const subjectIcons: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  Dna,
  FlaskConical,
  Atom,
  Calculator,
  Languages,
  Book,
  BookOpen,
  Speech,
  Pencil,
  Headphones
};

export const subjects: SubjectInfo[] = [
  // Edexcel IAL
  { slug: 'biology', name: 'Edexcel IAL Biology', examBoard: 'Edexcel IAL', subjectName: 'Biology', color: '#0fBD8C', level: 'IAL', iconName: 'Dna' },
  { slug: 'chemistry', name: 'Edexcel IAL Chemistry', examBoard: 'Edexcel IAL', subjectName: 'Chemistry', color: '#FF6B6B', level: 'IAL', iconName: 'FlaskConical' },
  { slug: 'physics', name: 'Edexcel IAL Physics', examBoard: 'Edexcel IAL', subjectName: 'Physics', color: '#4081FF', level: 'IAL', iconName: 'Atom' },
  { slug: 'mathematics', name: 'Edexcel IAL Math', examBoard: 'Edexcel IAL', subjectName: 'Math', color: '#ffab1a', level: 'IAL', iconName: 'Calculator' },
  
  // Edexcel IGCSE
  { slug: 'chinese', name: 'Edexcel IGCSE Chinese', examBoard: 'Edexcel IGCSE', subjectName: 'Chinese', color: '#ff3b30', level: 'IGCSE', iconName: 'Languages' },
  { slug: 'english-a', name: 'Edexcel IGCSE English A', examBoard: 'Edexcel IGCSE', subjectName: 'English A', color: '#007aff', level: 'IGCSE', iconName: 'Book' },
  { slug: 'english-b', name: 'Edexcel IGCSE English B', examBoard: 'Edexcel IGCSE', subjectName: 'English B', color: '#9C27B0', level: 'IGCSE', iconName: 'BookOpen' },

  // IELTS
  { slug: 'ielts-reading', name: 'IELTS Reading', examBoard: 'IELTS', subjectName: 'Reading', color: '#007aff', level: 'IELTS', iconName: 'Book' },
  { slug: 'ielts-speaking', name: 'IELTS Speaking', examBoard: 'IELTS', subjectName: 'Speaking', color: '#007aff', level: 'IELTS', iconName: 'Speech' },
  { slug: 'ielts-writing', name: 'IELTS Writing', examBoard: 'IELTS', subjectName: 'Writing', color: '#007aff', level: 'IELTS', iconName: 'Pencil' },
  { slug: 'ielts-listening', name: 'IELTS Listening', examBoard: 'IELTS', subjectName: 'Listening', color: '#007aff', level: 'IELTS', iconName: 'Headphones' }
];

export function getSubjectBySlug(slug: string): SubjectInfo | undefined {
  return subjects.find(s => s.slug === slug);
}

export function getSubjectIcon(iconName: string): React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }> {
  return subjectIcons[iconName] || HelpCircle;
}
