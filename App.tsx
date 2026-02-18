
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  PlusIcon, 
  HomeIcon, 
  ChartBarIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  BellAlertIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { supabase } from './supabaseClient';
import { User, Session, ClubInfo } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SessionForm from './components/SessionForm';
import Stats from './components/Stats';
import BackupTool from './components/BackupTool';

type Tab = 'home' | 'stats' | 'add' | 'profile';

const ADMIN_EMAIL = 'briceloubet2001@gmail.com';

// Interface pour l'événement d'installation PWA
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentClubInfo, setCurrentClubInfo] = useState<ClubInfo | null>(null);
  const [availableClubs, setAvailableClubs] = useState<ClubInfo[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  
  // Suivi de la dernière sauvegarde
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(localStorage.getItem('penta_last_backup'));

  const fetchClubs = async () => {
    const { data, error } = await supabase.from('clubs').select('*');
    if (!error && data) setAvailableClubs(data);
  };

  const fetchSessions = useCallback(async (userId: string, role: string, club: string) => {
    // Retour à la limite standard de 1 000 sessions pour la stabilité
    let query = supabase.from('training_sessions').select('*').order('date', { ascending: false }).limit(1000);
    
    if (role === 'athlete') {
      query = query.eq('user_id', userId);
    } else {
      const { data: clubUserIds } = await supabase.from('profiles').select('id').eq('club', club);
      if (clubUserIds) {
        const ids = clubUserIds.map(u => u.id);
        query = query.in('user_id', ids);
      }
    }

    const { data, error } = await query;
    if (!error && data) setSessions(data);
  }, []);

  const fetchClubUsers = useCallback(async (club: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('club', club);
    if (!error && data) setAllUsers(data);
  }, []);

  const loadUserData = useCallback(async (userAuth: any) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userAuth.id)
      .single();

    if (error || !profile) {
      setCurrentUser(null);
      return;
    }

    if (!profile.active && profile.role === 'athlete') {
      setAuthError("Votre compte est en attente de validation par l'entraîneur.");
      setCurrentUser(profile);
      return;
    }

    setCurrentUser(profile);
    
    const { data: clubData } = await supabase
      .from('clubs')
      .select('*')
      .eq('name', profile.club)
      .single();
    if (clubData) {
      setCurrentClubInfo(clubData);
      document.documentElement.style.setProperty('--club-primary', clubData.primary_color);
      document.documentElement.style.setProperty('--club-secondary', clubData.secondary_color || clubData.primary_color);
    }

    fetchSessions(profile.id, profile.role, profile.club);
    if (profile.role === 'coach') {
      fetchClubUsers(profile.club);
    }
  }, [fetchSessions, fetchClubUsers]);

  useEffect(() => {
    fetchClubs();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUserData(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUserData(session.user);
      } else {
        setCurrentUser(null);
        setCurrentClubInfo(null);
        setSessions([]);
        setAllUsers([]);
        setSelectedAthleteId(null);
      }
    });

    // Écouter l'événement d'installation PWA
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [loadUserData]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleToggleUserStatus = async (userId: string, active: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ active })
      .eq('id', userId);
    if (!error && currentUser) fetchClubUsers(currentUser.club);
  };

  const handleRejectUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error && currentUser) fetchClubUsers(currentUser.club);
  };

  const handleSaveSession = async (sessionData: any) => {
    if (!currentUser) return;

    if (editingSession) {
      const { error } = await supabase
        .from('training_sessions')
        .update(sessionData)
        .eq('id', editingSession.id);
      if (!error) {
        setEditingSession(null);
        setActiveTab('home');
        fetchSessions(currentUser.id, currentUser.role, currentUser.club);
      }
    } else {
      const { error } = await supabase
        .from('training_sessions')
        .insert([{ ...sessionData, user_id: currentUser.id }]);
      if (!error) {
        setActiveTab('home');
        fetchSessions(currentUser.id, currentUser.role, currentUser.club);
      }
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Supprimer cette séance ?')) return;
    const { error } = await supabase.from('training_sessions').delete().eq('id', id);
    if (!error && currentUser) fetchSessions(currentUser.id, currentUser.role, currentUser.club);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAuthError(null);
  };

  const handleBackupDone = () => {
    const now = new Date().toISOString();
    localStorage.setItem('penta_last_backup', now);
    setLastBackupDate(now);
  };

  const needsBackup = useMemo(() => {
    if (!lastBackupDate) return true;
    const last = new Date(lastBackupDate).getTime();
    const now = Date.now();
    return (now - last) > 24 * 60 * 60 * 1000; // Plus de 24h
  }, [lastBackupDate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!currentUser || (currentUser.role === 'athlete' && !currentUser.active)) {
    return (
      <Login 
        availableClubs={availableClubs} 
        onLoginSuccess={() => {}} 
        externalError={authError}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Dashboard 
            currentUser={currentUser} 
            currentClubInfo={currentClubInfo}
            sessions={sessions} 
            allUsers={allUsers}
            onDelete={handleDeleteSession}
            onEdit={(s) => { setEditingSession(s); setActiveTab('add'); }}
            onToggleUserStatus={handleToggleUserStatus}
            onRejectUser={handleRejectUser}
            onViewStats={(athleteId) => { setSelectedAthleteId(athleteId); setActiveTab('stats'); }}
            onRefreshUsers={() => fetchClubUsers(currentUser.club)}
            selectedAthleteId={selectedAthleteId}
            onSelectAthlete={setSelectedAthleteId}
          />
        );
      case 'stats':
        return (
          <Stats 
            sessions={sessions} 
            currentUser={currentUser} 
            allUsers={allUsers} 
            selectedAthleteId={selectedAthleteId || undefined} 
          />
        );
      case 'add':
        return (
          <SessionForm 
            currentUser={currentUser} 
            initialSession={editingSession || undefined}
            onSave={handleSaveSession}
            onCancel={() => { setEditingSession(null); setActiveTab('home'); }}
          />
        );
      case 'profile':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto pb-12">
            <header>
              <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
              <p className="text-slate-500">Gère tes informations personnelles.</p>
            </header>
            
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-club-primary flex items-center justify-center text-white text-2xl font-bold">
                {currentUser.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{currentUser.name}</h2>
                <p className="text-slate-500 text-sm">{currentUser.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {currentUser.role}
                  </span>
                  <span className="bg-club-secondary text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    {currentUser.club}
                  </span>
                </div>
              </div>
            </div>

            {deferredPrompt && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl space-y-3">
                <div className="flex gap-3">
                  <ArrowDownTrayIcon className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">Application non installée</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Installe PentaTrack sur ton écran d'accueil pour un accès plus rapide et une meilleure expérience.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleInstallApp}
                  className="w-full bg-amber-500 text-white font-bold py-3 rounded-2xl hover:bg-amber-600 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  Installer maintenant
                </button>
              </div>
            )}

            {currentUser.email === ADMIN_EMAIL && needsBackup && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                <BellAlertIcon className="w-6 h-6 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Action Requise</h4>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Brice, aucune sauvegarde n'a été effectuée depuis plus de 24h. Pense à sécuriser les données du club ci-dessous.
                  </p>
                </div>
              </div>
            )}

            {currentUser.email === ADMIN_EMAIL && (
              <BackupTool onBackupComplete={handleBackupDone} />
            )}

            <div className="space-y-3">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-3 bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all border border-red-100"
              >
                <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                Se déconnecter
              </button>
            </div>
            
            <div className="text-center pt-8 opacity-20">
              <p className="text-xs font-bold uppercase tracking-widest">PentaTrack v5.6</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-32 px-4 pt-8 md:max-w-6xl md:mx-auto">
      {renderContent()}

      <nav className="fixed bottom-6 left-4 right-4 bg-slate-900/95 backdrop-blur-md rounded-3xl p-2 shadow-2xl flex justify-around items-center border border-white/10 z-50 md:max-w-xl md:mx-auto md:left-1/2 md:-translate-x-1/2">
        <NavButton active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setEditingSession(null); }} icon={<HomeIcon className="w-6 h-6" />} label="Accueil" />
        <NavButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<ChartBarIcon className="w-6 h-6" />} label="Stats" />
        {currentUser.role === 'athlete' && (
          <button 
            onClick={() => { setEditingSession(null); setActiveTab('add'); }}
            className="w-14 h-14 -mt-8 bg-club-primary text-white rounded-full flex items-center justify-center shadow-lg border-4 border-slate-900 transition-transform active:scale-90"
            style={{ backgroundColor: 'var(--club-primary)' }}
          >
            <PlusIcon className="w-8 h-8" />
          </button>
        )}
        <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserCircleIcon className="w-6 h-6" />} label="Profil" />
      </nav>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  className?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, className }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-300 p-2 rounded-2xl min-w-[60px] ${className} ${active ? 'text-white' : 'text-slate-400 hover:text-white/60'}`}
  >
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
      {icon}
    </div>
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
