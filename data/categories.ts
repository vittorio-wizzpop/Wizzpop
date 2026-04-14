import { CategoryKey } from '../types/game';

export const CATEGORIES: Record<CategoryKey, {
  id: CategoryKey;
  emoji: string;
  label: string;
  bg: string;
  text: string;
}> = {
  geo:  { id: 'geo',  emoji: '🌍', label: 'Geografia',        bg: '#E6F1FB', text: '#0C447C' },
  sci:  { id: 'sci',  emoji: '⚗️', label: 'Scienza',          bg: '#EAF3DE', text: '#27500A' },
  art:  { id: 'art',  emoji: '🎨', label: 'Arte & Lett.',     bg: '#EEEDFE', text: '#3C3489' },
  hist: { id: 'hist', emoji: '⚔️', label: 'Storia',           bg: '#FAEEDA', text: '#633806' },
  wild: { id: 'wild', emoji: '⭐', label: 'Cultura Generale', bg: '#FBEAF0', text: '#72243E' },
} as const;
