
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  BeakerIcon, 
  UserGroupIcon, 
  BoltIcon, 
  TrashIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
  IdentificationIcon,
  LockClosedIcon,
  SparklesIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';
import { Discipline } from '../types';
import { DISCIPLINE_CONFIG } from '../constants';

interface StressTestToolProps {
  currentUserId: string;
  onRefresh: () => void;
}

const TEST_CLUB = 'CLUB_TEST_STRESS';
const EMAIL_PREFIX = 'test_500_';
const REAL_SIM_PREFIX = 'athlete_pro_';
const USER_COUNT = 500;
const SESSIONS_PER_USER = 50;

const REAL_SIM_USER_COUNT = 50;
const REAL_SIM_DAYS = 365;
const REAL_SIM_NOTE = 'Simulation Réaliste 1 an';

const StressTestTool: React.FC<StressTestToolProps> = ({ currentUserId, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [showSecurityReminder, setShowSecurityReminder] = useState(false);

  const supabaseUrl = 'https://xshmjbkhrtvtiflstvug.supabase.co';

  const getAdminClient = () => {
    if (!serviceRoleKey.trim()) throw new Error("La Service Role Key est requise.");
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  };

  const createTestUser = async (adminClient: any, email: string, name: string) => {
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: 'password123',
      email_confirm: true,
      user_metadata: { role: 'athlete' }
    });

    let userId = authData?.user?.id;

    if (authError) {
      if (authError.message.includes('already registered')) {
        const { data: existingUser } = await adminClient.from('profiles').select('id').eq('email', email).single();
        if (existingUser) userId = existingUser.id;
      } else {
        throw authError;
      }
    }

    if (userId) {
      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: userId,
        email,
        name,
        club: TEST_CLUB,
        role: 'athlete',
        active: true
      });
      if (profileError) throw profileError;
    }
    return userId;
  };

  const generateUsers = async () => {
    if (!confirm(`Créer ${USER_COUNT} utilisateurs de test ?`)) return;
    setLoading(true);
    setStatus('Création massive des utilisateurs...');
    setProgress(0);
    
    try {
      const adminClient = getAdminClient();
      for (let i = 1; i <= USER_COUNT; i++) {
        const email = `${EMAIL_PREFIX}${i}@pentatrack.fr`;
        await createTestUser(adminClient, email, `Athlète Test ${i}`);
        setProgress(Math.round((i / USER_COUNT) * 100));
        setStatus(`Création : ${i}/${USER_COUNT}`);
      }
      setStatus(`${USER_COUNT} utilisateurs créés !`);
    } catch (err: any) {
      setStatus(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateRealisticSimulation = async () => {
    if (!confirm(`Générer une simulation PRO (50 athlètes x 1 an x 3 sessions/jour) ? Soit ~55 000 sessions.`)) return;
    setLoading(true);
    setStatus('Phase 1 : Création/Récupération des 50 athlètes PRO...');
    setProgress(0);

    try {
      const adminClient = getAdminClient();
      const userIds: string[] = [];

      // 1. S'assurer que les 50 utilisateurs existent
      for (let i = 1; i <= REAL_SIM_USER_COUNT; i++) {
        const email = `${REAL_SIM_PREFIX}${i}@pentatrack.fr`;
        const id = await createTestUser(adminClient, email, `Pro Athlète ${i}`);
        if (id) userIds.push(id);
        setProgress(Math.round((i / REAL_SIM_USER_COUNT) * 20)); // 20% pour cette phase
      }

      setStatus('Phase 2 : Génération du calendrier annuel (Microcycles)...');
      
      const randomize = (val: number) => val * (0.85 + Math.random() * 0.3);
      let batch: any[] = [];
      let totalGenerated = 0;
      const totalExpected = REAL_SIM_USER_COUNT * REAL_SIM_DAYS * 2.5; // Approx 2.5 sessions/jour

      for (let d = 0; d < REAL_SIM_DAYS; d++) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay(); // 0=Dimanche

        for (const uid of userIds) {
          const dailySessions: any[] = [];

          // Logique de Microcycle
          if (dayOfWeek === 1) { // Lundi
            dailySessions.push({ discipline: 'Escrime', dur: 45, work: ['Leçon'], rpe: 5 });
            dailySessions.push({ discipline: 'Course', dur: 60, dist: 8, work: ['VMA courte'], rpe: 8 });
            dailySessions.push({ discipline: 'Natation', dur: 45, dist: 2, work: ['Technique'], rpe: 4 });
          } else if (dayOfWeek === 2) { // Mardi
            dailySessions.push({ discipline: 'Natation', dur: 60, dist: 3.5, work: ['Aérobie'], rpe: 6 });
            dailySessions.push({ discipline: 'Prépa Physique', dur: 60, rpe: 7 });
            dailySessions.push({ discipline: 'Tir', dur: 45, work: ['Séance individuelle'], rpe: 3 });
          } else if (dayOfWeek === 3) { // Mercredi
            dailySessions.push({ discipline: 'Laser Run', dur: 60, dist: 6, work: ['Confrontations'], rpe: 9 });
            dailySessions.push({ discipline: 'Natation', dur: 60, dist: 3, work: ['Aérobie'], rpe: 5 });
            dailySessions.push({ discipline: 'Médical', dur: 30, work: ['Kiné'], rpe: 1 });
          } else if (dayOfWeek === 4) { // Jeudi
            dailySessions.push({ discipline: 'Escrime', dur: 90, work: ['Assauts'], rpe: 7 });
            dailySessions.push({ discipline: 'Course', dur: 45, dist: 7, work: ['Footing'], rpe: 4 });
          } else if (dayOfWeek === 5) { // Vendredi
            dailySessions.push({ discipline: 'Course', dur: 60, dist: 12, work: ['Seuil 2'], rpe: 8 });
            dailySessions.push({ discipline: 'Natation', dur: 45, dist: 2.5, work: ['Vitesse'], rpe: 7 });
            dailySessions.push({ discipline: 'Prépa Physique', dur: 45, rpe: 6 });
          } else if (dayOfWeek === 6) { // Samedi
            dailySessions.push({ discipline: 'Obstacles', dur: 60, work: ['Enchaînement'], rpe: 8 });
            dailySessions.push({ discipline: 'Tir', dur: 60, work: ['Séance collective'], rpe: 4 });
            dailySessions.push({ discipline: 'Natation', dur: 30, dist: 1.5, work: ['Récupération'], rpe: 2 });
          } else { // Dimanche
            dailySessions.push({ discipline: 'Course', dur: 90, dist: 16, work: ['Footing'], rpe: 5 });
            dailySessions.push({ discipline: 'Médical', dur: 45, work: ['Préparation Mentale'], rpe: 1 });
          }

          dailySessions.forEach(s => {
            batch.push({
              user_id: uid,
              discipline: s.discipline,
              date: dateStr,
              duration_minutes: Math.round(randomize(s.dur)),
              distance_km: s.dist ? parseFloat(randomize(s.dist).toFixed(1)) : null,
              rpe: Math.min(10, Math.max(1, Math.round(randomize(s.rpe)))),
              work_types: s.work || [],
              notes: REAL_SIM_NOTE
            });
          });

          if (batch.length >= 2000) {
            const { error } = await adminClient.from('training_sessions').insert(batch);
            if (error) throw error;
            totalGenerated += batch.length;
            batch = [];
            const prog = 20 + Math.round((totalGenerated / totalExpected) * 80);
            setProgress(Math.min(99, prog));
            setStatus(`Injection massive : ${totalGenerated} sessions...`);
          }
        }
      }

      if (batch.length > 0) {
        await adminClient.from('training_sessions').insert(batch);
        totalGenerated += batch.length;
      }

      setStatus(`Succès : ${totalGenerated} sessions pro injectées sur 1 an !`);
      setProgress(100);
    } catch (err: any) {
      setStatus(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSessions = async () => {
    if (!confirm(`Générer ${USER_COUNT * SESSIONS_PER_USER} sessions aléatoires ?`)) return;
    setLoading(true);
    setStatus('Injection aléatoire standard...');
    setProgress(0);

    try {
      const adminClient = getAdminClient();
      const { data: testUsers } = await adminClient.from('profiles').select('id').eq('club', TEST_CLUB).eq('role', 'athlete');
      if (!testUsers || testUsers.length === 0) throw new Error("Créez d'abord les 500 athlètes.");

      const disciplines = Object.keys(DISCIPLINE_CONFIG) as Discipline[];
      let batch: any[] = [];
      let count = 0;
      const total = testUsers.length * SESSIONS_PER_USER;

      for (const user of testUsers) {
        for (let i = 0; i < SESSIONS_PER_USER; i++) {
          const disc = disciplines[Math.floor(Math.random() * disciplines.length)];
          const config = DISCIPLINE_CONFIG[disc];
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 180));

          batch.push({
            user_id: user.id,
            discipline: disc,
            date: date.toISOString().split('T')[0],
            duration_minutes: 20 + Math.floor(Math.random() * 100),
            distance_km: config.hasDistance ? parseFloat((1 + Math.random() * 10).toFixed(1)) : null,
            rpe: 1 + Math.floor(Math.random() * 10),
            work_types: config.workTypes.length > 0 ? [config.workTypes[Math.floor(Math.random() * config.workTypes.length)]] : [],
            notes: "Session générée automatiquement pour Stress Test."
          });

          if (batch.length >= 2000) {
            await adminClient.from('training_sessions').insert(batch);
            count += batch.length;
            batch = [];
            setProgress(Math.round((count / total) * 100));
            setStatus(`Injection : ${count}/${total}`);
          }
        }
      }
      if (batch.length > 0) await adminClient.from('training_sessions').insert(batch);
      setStatus('Injection terminée !');
    } catch (err: any) {
      setStatus(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const switchClub = async (toTest: boolean) => {
    setLoading(true);
    setStatus(toTest ? "Migration vers club de test..." : "Retour club réel...");
    try {
      const adminClient = getAdminClient();
      await adminClient.from('profiles').update({ club: toTest ? TEST_CLUB : 'RMA', role: 'coach' }).eq('id', currentUserId);
      window.location.reload();
    } catch (err: any) {
      setStatus(`Erreur : ${err.message}`);
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    if (!confirm("Supprimer TOUS les athlètes de test (500 + Pro) et leurs sessions ?")) return;
    setLoading(true);
    setStatus('Nettoyage global...');
    
    try {
      const adminClient = getAdminClient();
      
      setStatus("Suppression des sessions (Notes de test)...");
      await adminClient.from('training_sessions').delete().or(`notes.eq.Session générée automatiquement pour Stress Test.,notes.eq.${REAL_SIM_NOTE}`);

      setStatus("Récupération des comptes de test...");
      const { data: users } = await adminClient.from('profiles').select('id,email').or(`email.ilike.${EMAIL_PREFIX}%,email.ilike.${REAL_SIM_PREFIX}%`);
      
      if (users) {
        for (let i = 0; i < users.length; i++) {
          await adminClient.auth.admin.deleteUser(users[i].id);
          setProgress(Math.round(((i + 1) / users.length) * 100));
          setStatus(`Suppression comptes : ${i+1}/${users.length}`);
        }
      }

      setStatus('Nettoyage terminé !');
      setShowSecurityReminder(true);
      onRefresh();
    } catch (err: any) {
      setStatus(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-amber-200 mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
          <BeakerIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Laboratoire de Performance</h3>
          <p className="text-[10px] text-amber-600 uppercase tracking-widest font-black">Stress Test & Simulation Massive</p>
        </div>
      </div>

      {showSecurityReminder && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex gap-3 animate-in zoom-in">
          <LockClosedIcon className="w-6 h-6 text-green-600" />
          <div className="text-xs text-green-800">
            <p className="font-bold">Ménage terminé !</p>
            <p>Pensez à refermer le SQL Bunker dans Supabase.</p>
          </div>
        </div>
      )}

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
        <div className="flex gap-2 text-amber-800 font-bold text-xs uppercase items-center">
          <ShieldExclamationIcon className="w-4 h-4" />
          SERVICE_ROLE_KEY
        </div>
        <input 
          type="password"
          placeholder="Clé secrète admin..."
          value={serviceRoleKey}
          onChange={(e) => setServiceRoleKey(e.target.value)}
          className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button 
          onClick={generateRealisticSimulation}
          disabled={loading || !serviceRoleKey}
          className="sm:col-span-2 flex items-center justify-center gap-2 bg-indigo-600 text-white p-5 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg hover:scale-[1.02]"
        >
          <SparklesIcon className="w-6 h-6" />
          Générer Simulation PRO (1 An / 50 Athlètes)
        </button>

        <button 
          onClick={generateUsers}
          disabled={loading || !serviceRoleKey}
          className="flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-2xl font-bold text-sm hover:bg-slate-800 disabled:opacity-50"
        >
          <UserGroupIcon className="w-5 h-5" />
          Créer 500 Athlètes
        </button>

        <button 
          onClick={generateSessions}
          disabled={loading || !serviceRoleKey}
          className="flex items-center justify-center gap-2 bg-amber-500 text-white p-4 rounded-2xl font-bold text-sm hover:bg-amber-600 disabled:opacity-50 shadow-md"
        >
          <BoltIcon className="w-5 h-5" />
          Sessions Aléatoires
        </button>

        <button 
          onClick={() => switchClub(true)}
          disabled={loading || !serviceRoleKey}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-2xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <IdentificationIcon className="w-5 h-5" />
          Mode Coach Test
        </button>

        <button 
          onClick={() => switchClub(false)}
          disabled={loading || !serviceRoleKey}
          className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 p-4 rounded-2xl font-bold text-sm hover:bg-slate-200 disabled:opacity-50"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Club Réel
        </button>
      </div>

      <button 
        onClick={clearTestData}
        disabled={loading || !serviceRoleKey}
        className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 p-4 rounded-2xl font-bold text-sm hover:bg-red-100 border border-red-100 disabled:opacity-50"
      >
        <TrashIcon className="w-5 h-5" />
        Nettoyage Complet (Reset)
      </button>

      {(loading || status) && (
        <div className="space-y-3 pt-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span className="truncate max-w-[80%]">{status}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${status.includes('Simulation') ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StressTestTool;
