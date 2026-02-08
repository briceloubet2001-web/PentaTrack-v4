
export type Discipline = 
  | 'Escrime' 
  | 'Natation' 
  | 'Obstacles' 
  | 'Course' 
  | 'Tir' 
  | 'Laser Run' 
  | 'Prépa Physique' 
  | 'Médical';

export type UserRole = 'athlete' | 'coach';
export type Club = 'RMA' | 'SALANQUE';

export interface User {
  id: string;
  email: string;
  name: string;
  club: Club;
  role: UserRole;
  active: boolean;
}

export interface Session {
  id: string;
  user_id: string; // Nom de colonne DB
  discipline: Discipline;
  date: string;
  duration_minutes: number; // Nom de colonne DB
  work_types: string[]; // Nom de colonne DB
  distance_km?: number; // Nom de colonne DB
  notes?: string;
  rpe: number;
  focus?: string;
  created_at?: string;
}

export type StatsPeriod = 'day' | 'week' | 'month' | 'year' | 'custom';
