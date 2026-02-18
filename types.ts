
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
// On passe en string pour accepter n'importe quel club venant de la DB
export type Club = string;

export interface ClubInfo {
  id: string;
  name: string;
  slug: string;
  coach_secret: string;
  primary_color: string;
  secondary_color?: string;
  logo_url?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  club: Club;
  role: UserRole;
  active: boolean;
  password_last_changed_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  discipline: Discipline;
  date: string;
  duration_minutes: number;
  work_types: string[];
  distance_km?: number;
  notes?: string;
  rpe: number;
  focus?: string;
  created_at?: string;
}

export type StatsPeriod = 'day' | 'week' | 'month' | 'year' | 'custom';
