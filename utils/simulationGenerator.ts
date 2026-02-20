
import { supabase } from '../supabaseClient';
import { Discipline, Session } from '../types';

const DISCIPLINES: Discipline[] = [
  'Escrime',
  'Natation',
  'Obstacles',
  'Course',
  'Tir',
  'Laser Run',
  'Prépa Physique',
  'Médical'
];

const WORK_TYPES: Record<Discipline, string[]> = {
  'Escrime': ['Assauts', 'Leçon individuelle', 'Technique', 'Compétition'],
  'Natation': ['Série VMA', 'Endurance', 'Technique', 'Récupération'],
  'Obstacles': ['Parcours complet', 'Technique franchissement', 'Vitesse'],
  'Course': ['Footing', 'VMA', 'Seuil', 'Sortie longue'],
  'Tir': ['Précision', 'Vitesse', 'Gestion du stress'],
  'Laser Run': ['Combiné', 'Transition', 'Séries tir/course'],
  'Prépa Physique': ['Musculation', 'Gainage', 'Explosivité', 'Mobilité'],
  'Médical': ['Kiné', 'Ostéopathie', 'Récupération active']
};

const COMMENTS: string[] = [
  "Bonnes sensations aujourd'hui.",
  "Un peu de fatigue en fin de séance.",
  "Focus sur la technique réussi.",
  "Séance intense mais productive.",
  "Besoin de plus de récupération.",
  "Très bon rythme sur les séries.",
  "Travail spécifique intéressant.",
  "Météo difficile mais bon mental.",
  "Progression visible sur les chronos.",
  "Léger manque de précision au début."
];

export const generateSimulationData = async (userId: string, onProgress?: (progress: number) => void) => {
  const startDate = new Date('2023-09-01');
  const endDate = new Date(); // Today
  const sessions: Omit<Session, 'id' | 'created_at'>[] = [];
  
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  let processedDays = 0;

  // Define vacation periods for 2023, 2024, 2025, 2026
  const vacations: { start: Date; end: Date }[] = [
    // 2023
    { start: new Date('2023-12-24'), end: new Date('2023-12-28') },
    // 2024
    { start: new Date('2024-04-10'), end: new Date('2024-04-14') },
    { start: new Date('2024-08-05'), end: new Date('2024-08-10') },
    { start: new Date('2024-12-22'), end: new Date('2024-12-27') },
    // 2025
    { start: new Date('2025-03-15'), end: new Date('2025-03-20') },
    { start: new Date('2025-07-20'), end: new Date('2025-07-25') },
    { start: new Date('2025-12-23'), end: new Date('2025-12-28') },
  ];

  const isVacation = (date: Date) => {
    return vacations.some(v => date >= v.start && date <= v.end);
  };

  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    processedDays++;
    if (onProgress) onProgress(Math.floor((processedDays / totalDays) * 100));

    // Skip Sundays
    if (currentDate.getDay() === 0) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Skip Vacations
    if (isVacation(currentDate)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // 2 to 4 sessions per day
    const numSessions = Math.floor(Math.random() * 3) + 2;
    const dayDisciplines = [...DISCIPLINES].sort(() => 0.5 - Math.random()).slice(0, numSessions);

    for (const discipline of dayDisciplines) {
      // Special logic for Medical: only 1-2 times a month
      if (discipline === 'Médical' && Math.random() > 0.1) continue;

      const workTypes = WORK_TYPES[discipline];
      const selectedWorkTypes = [workTypes[Math.floor(Math.random() * workTypes.length)]];
      
      // Add a second work type sometimes
      if (Math.random() > 0.7) {
        const second = workTypes[Math.floor(Math.random() * workTypes.length)];
        if (!selectedWorkTypes.includes(second)) selectedWorkTypes.push(second);
      }

      // Progression factor: sessions later in the period are slightly better/longer
      const progressionFactor = processedDays / totalDays;
      
      let duration = 0;
      let distance = 0;
      let rpe = Math.floor(Math.random() * 5) + 4; // RPE between 4 and 9

      switch (discipline) {
        case 'Natation':
          duration = 60 + Math.floor(Math.random() * 30);
          distance = 2.5 + (Math.random() * 2 * progressionFactor);
          break;
        case 'Course':
          duration = 40 + Math.floor(Math.random() * 40);
          distance = 5 + (Math.random() * 10 * progressionFactor);
          break;
        case 'Laser Run':
          duration = 45 + Math.floor(Math.random() * 30);
          distance = 3 + (Math.random() * 3);
          break;
        case 'Escrime':
          duration = 90 + Math.floor(Math.random() * 60);
          break;
        case 'Obstacles':
          duration = 60 + Math.floor(Math.random() * 30);
          break;
        case 'Prépa Physique':
          duration = 45 + Math.floor(Math.random() * 45);
          break;
        case 'Tir':
          duration = 30 + Math.floor(Math.random() * 30);
          break;
        case 'Médical':
          duration = 30 + Math.floor(Math.random() * 15);
          rpe = 2 + Math.floor(Math.random() * 2);
          break;
      }

      sessions.push({
        user_id: userId,
        discipline,
        date: currentDate.toISOString().split('T')[0],
        duration_minutes: Math.round(duration),
        work_types: selectedWorkTypes,
        distance_km: distance > 0 ? parseFloat(distance.toFixed(2)) : undefined,
        rpe,
        notes: COMMENTS[Math.floor(Math.random() * COMMENTS.length)],
        focus: "Simulation automatique"
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Batch insert in chunks of 100 to avoid payload size limits
  const chunkSize = 100;
  for (let i = 0; i < sessions.length; i += chunkSize) {
    const chunk = sessions.slice(i, i + chunkSize);
    const { error } = await supabase.from('training_sessions').insert(chunk);
    if (error) {
      console.error('Error inserting chunk:', error);
      throw error;
    }
  }

  return sessions.length;
};
