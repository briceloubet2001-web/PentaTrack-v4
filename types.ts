
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
  password?: string;
  name: string;
  club: Club;
  role: UserRole;
  active: boolean; // Managed by coach
}

export interface Session {
  id: string;
  userId: string; // Owner of the session
  discipline: Discipline;
  date: string;
  durationMinutes: number;
  workTypes: string[];
  distanceKm?: number;
  notes?: string;
  shootingDone?: boolean;
  rpe: number;
  focus?: string;
}

export type StatsPeriod = 'day' | 'week' | 'month' | 'year' | 'custom';
