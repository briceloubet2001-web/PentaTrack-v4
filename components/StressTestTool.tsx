
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  BeakerIcon, 
  UserGroupIcon, 
  BoltIcon, 
  TrashIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
  IdentificationIcon
} from '@heroicons/react/24/outline';
import { Discipline } from '../types';
import { DISCIPLINE_CONFIG } from '../constants';

interface StressTestToolProps {
  currentUserId: string;
  onRefresh: () => void;
}

const TEST_CLUB = 'CLUB_TEST_STRESS';
const EMAIL_PREFIX = 'test_500_';
const USER_COUNT = 500;
const SESSIONS_PER_USER = 50;

const StressTestTool: React.FC<StressTestToolProps> = ({ currentUserId, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [serviceRoleKey, setServiceRoleKey] = useState('');

  const supabaseUrl = 'https://xshmjbkhrtvtiflstvug.supabase.co';

  const getAdminClient = () => {
    if (!serviceRoleKey.trim()) throw new Error("La Service Role Key est requise.");
    return createClient(supabaseUrl, serviceRoleKey);
  };

  const generateUsers = async () => {
    if (!confirm(`Créer ${USER_COUNT} utilisateurs de test ?`)) return;
    setLoading(true);
    setStatus('Initialisation de la création des utilisateurs...');
    setProgress(0);
    
    try {
      const adminClient = getAdminClient();
      
      for (let i = 1; i <= USER_COUNT; i++) {
        const email = `${EMAIL_PREFIX}${i}@pentatrack.fr`;
        const name = `Athlète Test ${i}`;
        
        setStatus(`Création de ${email}...`);
        
        // 1. Créer l'user auth (automatiquement confirmé)
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password: 'password123',
          email_confirm: true,
          user_metadata: { role: 'athlete' }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            console.log(`${email} existe déjà, passage au suivant.`);
          } else {
            throw authError;
          }
        }

        if (authData.user) {
          // 2. Créer le profil
          const { error: profileError } = await adminClient.from('profiles').upsert({
            id: authData.user.id,
            email,
            name,
            club: TEST_CLUB,
            role: 'athlete',
            active: true
          });
          if (profileError) throw profileError;
        }

        setProgress(Math.round((i / USER_COUNT) * 100));
      }
      
      setStatus(`${USER_COUNT} utilisateurs créés avec succès !`);
    } catch (err: any) {
      setStatus(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSessions = async () => {
    if (!confirm(`Générer ${USER_COUNT * SESSIONS_PER_USER} sessions (50 par athlète) ?`)) return;
    setLoading(true);
    setStatus('Récupération des IDs des athlètes de test...');
    setProgress(0);

    try {
      const adminClient = getAdminClient();
      
      const { data: testUsers, error: fetchError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('club', TEST_CLUB)
        .eq('role', 'athlete');

      if (fetchError) throw fetchError;
      if (!testUsers || testUsers.length === 0) throw new Error("Aucun utilisateur de test trouvé. Créez les d'abord.");

      const disciplines = Object.keys(DISCIPLINE_CONFIG) as Discipline[];
      const totalSessionsToGenerate = testUsers.length * SESSIONS_PER_USER;
      let generatedCount = 0;
      let batch: any[] = [];

      for (const user of testUsers) {
        for (let i = 0; i < SESSIONS_PER_USER; i++) {
          const disc = disciplines[Math.floor(Math.random() * disciplines.length)];
          const config = DISCIPLINE_CONFIG[disc];
          
          // Date aléatoire sur les 180 derniers jours
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 180));

          batch.push({
            user_id: user.id,
            discipline: disc,
            date: date.toISOString().split('T')[0],
            duration_minutes: 20 + Math.floor(Math.random() * 100),
            distance_km: config.hasDistance ? (1 + Math.random() * 10).toFixed(1) : null,
            rpe: 1 + Math.floor(Math.random() * 10),
            work_types: config.workTypes.length > 0 ? [config.workTypes[Math.floor(Math.random() * config.workTypes.length)]] : [],
            notes: "Session générée automatiquement pour Stress Test."
          });

          // Bulk Insert par 1000 pour la performance
          if (batch.length >= 1000) {
            const { error: insertError } = await adminClient.from('training_sessions').insert(batch);
            if (insertError) throw insertError;
            generatedCount += batch.length;
            batch = [];
            setProgress(Math.round((generatedCount / totalSessionsToGenerate) * 100));
            setStatus(`Injection : ${generatedCount} / ${totalSessionsToGenerate} sessions...`);
          }
        }
      }

      // Dernier batch
      if (batch.length > 0) {
        const { error: insertError } = await adminClient.from('training_sessions').insert(batch);
        if (insertError) throw insertError;
        generatedCount += batch.length;
      }

      setStatus(`Succès : ${generatedCount} sessions injectées !`);
      setProgress(100);
    } catch (err: any) {
      setStatus(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const switchClub = async (toTest: boolean) => {
    setLoading(true);
    setStatus(toTest ? "Migration vers le club de test..." : "Retour vers votre club réel...");
    try {
      const adminClient = getAdminClient();
      const newClub = toTest ? TEST_CLUB : 'RMA';
      
      const { error } = await adminClient
        .from('profiles')
        .update({ club: newClub, role: 'coach' })
        .eq('id', currentUserId);
      
      if (error) throw error;
      
      setStatus("Changement réussi. Rechargement...");
      window.location.reload();
    } catch (err: any) {
      setStatus(`Erreur : ${err.message}`);
      setLoading(false);
    }
  };

  const clearTestData = async () => {
    if (!confirm("Voulez-vous vraiment supprimer TOUS les utilisateurs de test et leurs sessions ?")) return;
    setLoading(true);
    setStatus('Nettoyage de la base de données...');
    
    try {
      const adminClient = getAdminClient();
      
      // 1. Supprimer les sessions
      setStatus("Suppression des sessions...");
      const { error: sessionError } = await adminClient
        .from('training_sessions')
        .delete()
        .filter('notes', 'eq', 'Session générée automatiquement pour Stress Test.');
      if (sessionError) throw sessionError;

      // 2. Supprimer les profils et les users (via admin)
      setStatus("Suppression des comptes utilisateurs...");
      const { data: usersToDelete } = await adminClient
        .from('profiles')
        .select('id')
        .ilike('email', `${EMAIL_PREFIX}%`);
      
      if (usersToDelete) {
        for (const u of usersToDelete) {
          await adminClient.auth.admin.deleteUser(u.id);
        }
      }

      setStatus('Nettoyage terminé !');
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

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
        <div className="flex gap-2 text-amber-800 font-bold text-xs uppercase items-center">
          <ShieldExclamationIcon className="w-4 h-4" />
          Accès Admin Requis
        </div>
        <input 
          type="password"
          placeholder="Entrez votre SERVICE_ROLE_KEY..."
          value={serviceRoleKey}
          onChange={(e) => setServiceRoleKey(e.target.value)}
          className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 outline-none shadow-inner"
        />
        <p className="text-[10px] text-amber-700 leading-relaxed italic">
          Cette clé permet de créer des utilisateurs sans confirmation email. Ne l'utilisez jamais sur un ordinateur public.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button 
          onClick={generateUsers}
          disabled={loading || !serviceRoleKey}
          className="flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          <UserGroupIcon className="w-5 h-5" />
          1. Créer 500 Athlètes
        </button>

        <button 
          onClick={generateSessions}
          disabled={loading || !serviceRoleKey}
          className="flex items-center justify-center gap-2 bg-amber-500 text-white p-4 rounded-2xl font-bold text-sm hover:bg-amber-600 transition-all disabled:opacity-50 shadow-md"
        >
          <BoltIcon className="w-5 h-5" />
          2. Injecter 25k Sessions
        </button>

        <button 
          onClick={() => switchClub(true)}
          disabled={loading || !serviceRoleKey}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white p-4 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md"
        >
          <IdentificationIcon className="w-5 h-5" />
          3. Mode Coach de Test
        </button>

        <button 
          onClick={() => switchClub(false)}
          disabled={loading || !serviceRoleKey}
          className="flex items-center justify-center gap-2 bg-slate-100 text-slate-600 p-4 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Retour Club Réel
        </button>
      </div>

      <button 
        onClick={clearTestData}
        disabled={loading || !serviceRoleKey}
        className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 p-4 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all border border-red-100 disabled:opacity-50"
      >
        <TrashIcon className="w-5 h-5" />
        Nettoyage Complet (Reset)
      </button>

      {(loading || status) && (
        <div className="space-y-3 pt-2">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>Statut : {status}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-amber-500 transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StressTestTool;
