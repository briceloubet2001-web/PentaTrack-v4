
import { Discipline } from './types';

export const DISCIPLINE_CONFIG: Record<Discipline, { 
  workTypes: string[]; 
  hasDistance: boolean; 
  hasDuration: boolean;
  color: string;
  hexColor: string;
  icon: string;
}> = {
  'Escrime': {
    workTypes: ['Assauts', 'Déplacements', 'Leçon'],
    hasDistance: false,
    hasDuration: true,
    color: 'bg-blue-600',
    hexColor: '#2563eb',
    icon: '⚔️'
  },
  'Natation': {
    workTypes: ['Technique', 'Vitesse', 'Aérobie', 'Récupération'],
    hasDistance: true,
    hasDuration: true,
    color: 'bg-cyan-500',
    hexColor: '#06b6d4',
    icon: '🏊'
  },
  'Obstacles': {
    workTypes: ['Technique', 'Enchaînement', 'Test', 'Endurance', 'Répétition'],
    hasDistance: false,
    hasDuration: true,
    color: 'bg-orange-600',
    hexColor: '#ea580c',
    icon: '🚧'
  },
  'Course': {
    workTypes: ['Footing', 'Seuil 1', 'Seuil 2', 'VMA courte', 'VMA longue'],
    hasDistance: true,
    hasDuration: true,
    color: 'bg-green-600',
    hexColor: '#16a34a',
    icon: '🏃'
  },
  'Tir': {
    workTypes: ['Séance individuelle', 'Séance collective', 'Confrontations'],
    hasDistance: false,
    hasDuration: true,
    color: 'bg-red-600',
    hexColor: '#dc2626',
    icon: '🎯'
  },
  'Laser Run': {
    workTypes: ['Footing', 'Seuil 1', 'Seuil 2', 'VMA courte', 'VMA longue'],
    hasDistance: true,
    hasDuration: true,
    color: 'bg-purple-600',
    hexColor: '#9333ea',
    icon: '🔫🏃'
  },
  'Prépa Physique': {
    workTypes: [],
    hasDistance: false,
    hasDuration: true,
    color: 'bg-slate-700',
    hexColor: '#334155',
    icon: '🏋️'
  },
  'Médical': {
    workTypes: ['Kiné', 'Psy', 'Préparation Mentale', 'Osthéo'],
    hasDistance: false,
    hasDuration: true,
    color: 'bg-emerald-500',
    hexColor: '#10b981',
    icon: '🏥'
  }
};
