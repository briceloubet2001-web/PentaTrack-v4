import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  PlusIcon, 
  HomeIcon, 
  ChartBarIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  BellAlertIcon,
  ArrowDownTrayIcon,
  KeyIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import { supabase } from './supabaseClient';
import { User, Session, ClubInfo, Tab } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import SessionForm from './components/SessionForm';
import Stats from './components/Stats';
import Analyse from './components/Analyse';
import BackupTool from './components/BackupTool';
import PasswordChangeForm from './components/PasswordChangeForm';

const ADMIN_EMAIL = 'briceloubet2001@gmail.com';

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
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isChangingPasswordManual, setIsChangingPasswordManual] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(localStorage.getItem('penta_last_backup'));

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchClubs = async () => {
    const { data, error } = await supabase.from('clubs').select('*');
    if (!error && data) setAvailableClubs(data);
  };

  const fetchSessions = useCallback(async (userId: string, role: string, club: string) => {
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
    const { data, error } = await supabase.from('profiles').select('*').eq('club', club);
    if (!error && data) setAllUsers(data);
  }, []);

  const loadUserData = useCallback(async (userAuth: any) => {
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userAuth.id).single();
    if (error || !profile) { setCurrentUser(null); return; }
    if (!profile.active && profile.role === 'athlete') {
      setAuthError("Votre compte est en attente de validation par l'entraîneur.");
      setCurrentUser(profile);
      return;
    }
    const lastChanged = profile.password_last_changed_at ? new Date(profile.password_last_changed_at).getTime() : 0;
    if (Date.now() - lastChanged > 30 * 24 * 60 * 60 * 1000) setMustChangePassword(true);
    setCurrentUser(profile);
    const { data: clubData } = await supabase.from('clubs').select('*').eq('name', profile.club).single();
    if (clubData) {
      setCurrentClubInfo(clubData);
      document.documentElement.style.setProperty('--club-primary', clubData.primary_color);
      document.documentElement.style.setProperty('--club-secondary', clubData.secondary_color || clubData.primary_color);
    }
    fetchSessions(profile.id, profile.role, profile.club);
    if (profile.role === 'coach') fetchClubUsers(profile.club);
  }, [fetchSessions, fetchClubUsers]);

  useEffect(() => {
    fetchClubs();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) loadUserData(session.user);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadUserData(session.user);
      else {
        setCurrentUser(null); setCurrentClubInfo(null); setSessions([]); setAllUsers([]);
        setSelectedAthleteId(null); setMustChangePassword(false);
      }
    });
    const handleBeforeInstallPrompt = (e: any) => { e.preventDefault(); setDeferredPrompt(e); };
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
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleSaveSession = async (sessionData: any) => {
    if (!currentUser) return;
    if (editingSession) {
      const { error } = await supabase.from('training_sessions').update(sessionData).eq('id', editingSession.id);
      if (!error) { setEditingSession(null); setActiveTab('home'); fetchSessions(currentUser.id, currentUser.role, currentUser.club); }
    } else {
      const { error } = await supabase.from('training_sessions').insert([{ ...sessionData, user_id: currentUser.id }]);
      if (!error) { setActiveTab('home'); fetchSessions(currentUser.id, currentUser.role, currentUser.club); }
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Supprimer cette séance ?')) return;
    const { error } = await supabase.from('training_sessions').delete().eq('id', id);
    if (!error && currentUser) fetchSessions(currentUser.id, currentUser.role, currentUser.club);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard currentUser={currentUser!} currentClubInfo={currentClubInfo} sessions={sessions} allUsers={allUsers} onDelete={handleDeleteSession} onEdit={(s) => { setEditingSession(s); setActiveTab('add'); }} onToggleUserStatus={(u, a) => supabase.from('profiles').update({ active: a }).eq('id', u).then(() => fetchClubUsers(currentUser!.club))} onRejectUser={(u) => supabase.from('profiles').delete().eq('id', u).then(() => fetchClubUsers(currentUser!.club))} onViewStats={(id) => { setSelectedAthleteId(id); setActiveTab('stats'); }} onRefreshUsers={() => fetchClubUsers(currentUser!.club)} selectedAthleteId={selectedAthleteId} onSelectAthlete={setSelectedAthleteId} />;
      case 'stats':
        return <Stats sessions={sessions} currentUser={currentUser!} currentClubInfo={currentClubInfo} allUsers={allUsers} selectedAthleteId={selectedAthleteId || undefined} />;
      case 'analyse':
        return <Analyse sessions={sessions} currentUser={currentUser!} currentClubInfo={currentClubInfo} allUsers={allUsers} isDesktop={isDesktop} />;
      case 'add':
        return <SessionForm currentUser={currentUser!} currentClubInfo={currentClubInfo} initialSession={editingSession || undefined} onSave={handleSaveSession} onCancel={() => { setEditingSession(null); setActiveTab('home'); }} />;
      case 'profile':
        return (
          <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl mx-auto pb-12">
            <header className="flex items-center gap-4">
              {currentClubInfo?.logo_url && <img src={currentClubInfo.logo_url} alt="Logo" className="h-16 w-16 object-contain" />}
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
                <p className="text-slate-500">Gère tes informations personnelles.</p>
              </div>
            </header>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-club-primary flex items-center justify-center text-white text-2xl font-bold">{currentUser!.name.charAt(0)}</div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{currentUser!.name}</h2>
                <p className="text-slate-500 text-sm">{currentUser!.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{currentUser!.role}</span>
                  <span className="bg-club-secondary text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">{currentUser!.club}</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center gap-3"><div className="p-2 bg-slate-50 text-slate-500 rounded-xl"><KeyIcon className="w-5 h-5" /></div><h3 className="font-bold text-slate-900">Sécurité</h3></div>
              {isChangingPasswordManual ? <PasswordChangeForm userId={currentUser!.id} onSuccess={() => setIsChangingPasswordManual(false)} onCancel={() => setIsChangingPasswordManual(false)} primaryColor={currentClubInfo?.primary_color} /> : <button onClick={() => setIsChangingPasswordManual(true)} className="w-full flex items-center justify-center gap-2 bg-slate-50 text-slate-700 font-bold py-4 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100"><KeyIcon className="w-5 h-5" />Changer mon mot de passe</button>}
            </div>
            {deferredPrompt && <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl space-y-3"><div className="flex gap-3"><ArrowDownTrayIcon className="w-6 h-6 text-amber-600 shrink-0" /><div><h4 className="font-bold text-amber-900 text-sm">Application non installée</h4><p className="text-xs text-amber-700 leading-relaxed">Installe PentaTrack sur ton écran d'accueil pour un accès plus rapide.</p></div></div><button onClick={handleInstallApp} className="w-full bg-amber-500 text-white font-bold py-3 rounded-2xl hover:bg-amber-600 transition-all shadow-md flex items-center justify-center gap-2"><PlusIcon className="w-5 h-5" />Installer maintenant</button></div>}
            {currentUser!.email === ADMIN_EMAIL && <BackupTool onBackupComplete={() => { localStorage.setItem('penta_last_backup', new Date().toISOString()); setLastBackupDate(new Date().toISOString()); }} />}
            <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-3 bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all border border-red-100"><ArrowLeftOnRectangleIcon className="w-6 h-6" />Se déconnecter</button>
          </div>
        );
      default: return null;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>;
  if (currentUser && mustChangePassword) return <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4"><PasswordChangeForm userId={currentUser.id} onSuccess={() => { setMustChangePassword(false); supabase.auth.getSession().then(({ data: { session } }) => session && loadUserData(session.user)); }} isForced={true} primaryColor={currentClubInfo?.primary_color} /></div>;
  if (!currentUser || (currentUser.role === 'athlete' && !currentUser.active)) return <Login availableClubs={availableClubs} onLoginSuccess={() => {}} externalError={authError} />;

  return (
    <div className={`min-h-screen ${isDesktop ? 'pl-64 pt-8' : 'pb-32 px-4 pt-8'} transition-all`}>
      {isDesktop && (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 p-6 flex flex-col gap-8 z-50">
          <div className="flex items-center gap-3 px-2">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg border border-white/10"
              style={{ background: 'radial-gradient(circle, #F8FAFC 0%, #CBD5E1 100%)' }}
            >
              <span style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>5</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">PentaTrack</span>
          </div>
          <nav className="flex-1 space-y-2">
            <SidebarButton active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setEditingSession(null); }} icon={<HomeIcon className="w-5 h-5" />} label="Accueil" />
            <SidebarButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<ChartBarIcon className="w-5 h-5" />} label="Statistiques" />
            {currentUser.role === 'coach' && (
              <SidebarButton active={activeTab === 'analyse'} onClick={() => setActiveTab('analyse')} icon={<PresentationChartLineIcon className="w-5 h-5" />} label="Analyse de Saison" />
            )}
            {currentUser.role === 'athlete' && (
              <SidebarButton active={activeTab === 'add'} onClick={() => { setEditingSession(null); setActiveTab('add'); }} icon={<PlusIcon className="w-5 h-5" />} label="Nouvelle Séance" />
            )}
            <SidebarButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserCircleIcon className="w-5 h-5" />} label="Mon Profil" />
          </nav>
          <div className="mt-auto p-4 bg-white/5 rounded-2xl">
             <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Club</div>
             <div className="text-sm font-bold text-white truncate">{currentUser.club}</div>
          </div>
        </aside>
      )}

      <main className={`w-full ${isDesktop ? 'max-w-5xl mx-auto px-8' : ''}`}>
        {renderContent()}
      </main>

      {!isDesktop && (
        <nav className="fixed bottom-6 left-4 right-4 bg-slate-900/95 backdrop-blur-md rounded-3xl p-2 shadow-2xl flex justify-around items-center border border-white/10 z-50">
          <NavButton active={activeTab === 'home'} onClick={() => { setActiveTab('home'); setEditingSession(null); }} icon={<HomeIcon className="w-6 h-6" />} label="Accueil" />
          <NavButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<ChartBarIcon className="w-6 h-6" />} label="Stats" />
          {currentUser.role === 'athlete' ? (
            <button onClick={() => { setEditingSession(null); setActiveTab('add'); }} className="w-14 h-14 -mt-8 bg-club-primary text-white rounded-full flex items-center justify-center shadow-lg border-4 border-slate-900 transition-transform active:scale-90" style={{ backgroundColor: 'var(--club-primary)' }}><PlusIcon className="w-8 h-8" /></button>
          ) : (
            <NavButton active={activeTab === 'analyse'} onClick={() => setActiveTab('analyse')} icon={<PresentationChartLineIcon className="w-6 h-6" />} label="Analyse" />
          )}
          <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserCircleIcon className="w-6 h-6" />} label="Profil" />
        </nav>
      )}
    </div>
  );
};

const SidebarButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${active ? 'bg-club-primary text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`} style={active ? { backgroundColor: 'var(--club-primary)' } : {}}>
    {icon} <span>{label}</span>
  </button>
);

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 p-2 rounded-2xl min-w-[60px] ${active ? 'text-white' : 'text-slate-400'}`}>
    <div className={`${active ? 'scale-110' : 'scale-100'} transition-transform`}>{icon}</div>
    <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
