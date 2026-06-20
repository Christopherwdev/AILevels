// Shared subject definitions used across Learn, Chat, and Navbar
export interface SubjectInfo {
  slug: string;
  name: string;
  icon: string; // emoji
  color: string; // hex
  level: 'IAL' | 'IGCSE';
}

export const subjects: SubjectInfo[] = [
  { slug: 'physics', name: 'Physics', icon: '⚡', color: '#147EFB', level: 'IAL' },
  { slug: 'chemistry', name: 'Chemistry', icon: '🧪', color: '#53D769', level: 'IAL' },
  { slug: 'biology', name: 'Biology', icon: '🧬', color: '#FC3D39', level: 'IAL' },
  { slug: 'mathematics', name: 'Mathematics', icon: '📐', color: '#FF9500', level: 'IAL' },
  { slug: 'chinese', name: 'Chinese', icon: '🇨🇳', color: '#FC3158', level: 'IGCSE' },
  { slug: 'english-a', name: 'English A', icon: '📝', color: '#5856D6', level: 'IGCSE' },
  { slug: 'english-b', name: 'English B', icon: '📖', color: '#AF52DE', level: 'IGCSE' },
];

export function getSubjectBySlug(slug: string): SubjectInfo | undefined {
  return subjects.find(s => s.slug === slug);
}
