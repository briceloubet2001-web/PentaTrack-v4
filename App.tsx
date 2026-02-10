
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  PlusIcon, 
  HomeIcon, 
  ChartBarIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Session, User, ClubInfo } from './types';
import Dashboard from './components/Dashboard';
import SessionForm from './components/SessionForm';
import Stats from './components/Stats';
import Login from './components/Login';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'add' | 'stats' | 'profile'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableClubs, setAvailableClubs] = useState<ClubInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [selectedAthleteIdForStats, setSelectedAthleteIdForStats] = useState<string | undefined>(undefined);

  // Club actuel de l'utilisateur pour le thème
  const currentClubInfo = useMemo(() => {
    if (!currentUser) return null;
    return availableClubs.find(c => c.name === currentUser.club) || null;
  }, [currentUser, availableClubs]);

  // Injection des couleurs dynamiques via CSS Variables
  useEffect(() => {
    if (currentClubInfo) {
      const root = document.documentElement;
      root.style.setProperty('--club-primary', currentClubInfo.primary_color);
      root.style.setProperty('--club-secondary', currentClubInfo.secondary_color || '#1e293b');
    } else {
      const root = document.documentElement;
      root.style.setProperty('--club-primary', '#2563eb'); // Bleu par défaut
      root.style.setProperty('--club-secondary', '#1e293b');
    }
  }, [currentClubInfo]);

  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .order('name');
    
    if (error) {
      console.error("Erreur lors du chargement des clubs:", error);
    } else if (data) {
      setAvailableClubs(data as ClubInfo[]);
    }
  };

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    setAuthError(null);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Erreur profil:", error);
      setAuthError(`Erreur de profil: ${error.message}`);
      if (error.code === 'PGRST116' || error.code === '42P01') {
         await supabase.auth.signOut();
      }
    } else if (data) {
      setCurrentUser(data as User);
    }
    setProfileLoading(false);
  };

  const fetchSessions = useCallback(async () => {
    if (!currentUser || !currentUser.active) return;
    
    let query = supabase.from('training_sessions').select('*').order('date', { ascending: false });
    
    if (currentUser.role === 'athlete') {
      query = query.eq('user_id', currentUser.id);
    }

    const { data, error } = await query;
    if (!error && data) {
      setSessions(data as Session[]);
    }
  }, [currentUser]);

  const fetchClubUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'coach') return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('club', currentUser.club);
    
    if (!error && data) {
      setUsers(data as User[]);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchClubs();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setSessions([]);
        setUsers([]);
        setAuthError(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchSessions();
      if (currentUser.role === 'coach') {
        fetchClubUsers();
      }
    }
  }, [currentUser, fetchSessions, fetchClubUsers]);

  const handleSaveSession = async (sessionData: any) => {
    const isEditing = !!editingSession;
    
    if (isEditing) {
      const { error } = await supabase
        .from('training_sessions')
        .update(sessionData)
        .eq('id', editingSession.id);
      if (error) alert("Erreur lors de la modification");
    } else {
      const { error } = await supabase
        .from('training_sessions')
        .insert([{ ...sessionData, user_id: currentUser?.id }]);
      if (error) alert("Erreur lors de l'ajout");
    }
    
    fetchSessions();
    setEditingSession(null);
    setActiveTab('home');
  };

  const deleteSession = async (id: string) => {
    if (window.confirm("Supprimer cette séance ?")) {
      const { error } = await supabase.from('training_sessions').delete().eq('id', id);
      if (!error) fetchSessions();
    }
  };

  const startEdit = (session: Session) => {
    setEditingSession(session);
    setActiveTab('add');
  };

  const handleAddNew = () => {
    setEditingSession(null);
    setActiveTab('add');
  };

  const handleToggleUserStatus = async (userId: string, active: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ active })
      .eq('id', userId);
    if (!error) fetchClubUsers();
  };

  const handleRejectUser = async (userId: string) => {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) fetchClubUsers();
  };

  const handleViewStats = (athleteId: string) => {
    setSelectedAthleteIdForStats(athleteId);
    setActiveTab('stats');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="relative">
        {profileLoading && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="font-bold text-slate-900">Chargement du profil...</p>
            </div>
          </div>
        )}
        <Login 
          availableClubs={availableClubs} 
          onLoginSuccess={() => {}} 
          externalError={authError} 
        />
      </div>
    );
  }

  if (currentUser.role === 'athlete' && !currentUser.active) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl space-y-6 animate-in fade-in zoom-in duration-300">
          {currentClubInfo?.logo_url ? (
            <img src={currentClubInfo.logo_url} alt="Logo Club" className="w-24 h-24 object-contain mx-auto mb-4" />
          ) : (
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClockIcon className="w-10 h-10" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900">Validation en attente</h1>
          <p className="text-slate-600">
            Merci de votre inscription, <span className="font-bold text-slate-900">{currentUser.name}</span> !
          </p>
          <p className="text-slate-500 text-sm leading-relaxed">
            Votre compte pour le club <span className="font-bold" style={{ color: 'var(--club-primary)' }}>{currentUser.club}</span> doit être validé par votre entraîneur.
          </p>
          
          <div className="pt-4 space-y-3">
            <button 
              onClick={() => fetchProfile(currentUser.id)}
              disabled={profileLoading}
              className="w-full text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-300"
              style={{ backgroundColor: 'var(--club-primary)' }}
            >
              {profileLoading ? (
                <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
              ) : (
                <>
                  <ArrowPathIcon className="w-5 h-5" />
                  Actualiser mon statut
                </>
              )}
            </button>
            
            <button 
              onClick={handleLogout}
              className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeftOnRectangleIcon className="w-4 h-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-64 flex flex-col bg-slate-50">
      <style>{`
        .bg-club-primary { background-color: var(--club-primary); }
        .text-club-primary { color: var(--club-primary); }
        .border-club-primary { border-color: var(--club-primary); }
        .bg-club-secondary { background-color: var(--club-secondary); }
      `}</style>
      
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex-col p-6 shadow-2xl z-50">
        <div className="text-2xl font-bold tracking-tight mb-10 flex items-center gap-2">
          <span className="bg-club-primary p-1.5 rounded-lg">P5</span>
          PentaTrack
        </div>
        
        <div className="space-y-2 flex-1">
          <NavItem 
            active={activeTab === 'home'} 
            onClick={() => setActiveTab('home')}
            icon={<HomeIcon className="w-5 h-5" />}
            label="Accueil"
          />
          {currentUser.role === 'athlete' && (
            <NavItem 
              active={activeTab === 'add'} 
              onClick={handleAddNew}
              icon={<PlusIcon className="w-5 h-5" />}
              label="Nouvelle séance"
            />
          )}
          <NavItem 
            active={activeTab === 'stats'} 
            onClick={() => { setActiveTab('stats'); setSelectedAthleteIdForStats(undefined); }}
            icon={<ChartBarIcon className="w-5 h-5" />}
            label="Statistiques"
          />
          <NavItem 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')}
            icon={<UserCircleIcon className="w-5 h-5" />}
            label="Profil"
          />
        </div>

        <div className="pt-6 border-t border-slate-800">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
           >
             <ArrowLeftOnRectangleIcon className="w-5 h-5" />
             <span className="font-medium">Déconnexion</span>
           </button>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
        {activeTab === 'home' && (
          <Dashboard 
            currentUser={currentUser}
            currentClubInfo={currentClubInfo}
            sessions={sessions} 
            allUsers={users}
            onDelete={deleteSession} 
            onEdit={startEdit} 
            onToggleUserStatus={handleToggleUserStatus}
            onRejectUser={handleRejectUser}
            onViewStats={handleViewStats}
            onRefreshUsers={fetchClubUsers}
          />
        )}
        {activeTab === 'add' && (
          <SessionForm 
            currentUser={currentUser}
            initialSession={editingSession || undefined}
            onSave={handleSaveSession} 
            onCancel={() => {
              setEditingSession(null);
              setActiveTab('home');
            }} 
          />
        )}
        {activeTab === 'stats' && (
          <Stats 
            sessions={sessions} 
            currentUser={currentUser} 
            allUsers={users} 
            selectedAthleteId={selectedAthleteIdForStats}
          />
        )}
        {activeTab === 'profile' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header>
              <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
              <p className="text-slate-500">Récapitulatif de tes informations de compte.</p>
            </header>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold mb-6 text-white"
                style={{ backgroundColor: 'var(--club-primary)' }}
              >
                {currentUser.name.charAt(0)}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{currentUser.name}</h2>
              <p className="text-slate-400 mb-6">{currentUser.email}</p>
              
              {currentClubInfo?.logo_url && (
                <img src={currentClubInfo.logo_url} alt="Logo" className="h-12 object-contain mb-8" />
              )}

              <div className="w-full grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rôle</div>
                  <div className="font-bold text-slate-700 capitalize">{currentUser.role === 'coach' ? 'Entraîneur' : 'Athlète'}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Club</div>
                  <div className="font-bold text-slate-700">{currentUser.club}</div>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-2xl hover:bg-slate-200 transition-all mt-10 flex items-center justify-center gap-2"
              >
                <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                Déconnexion
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-lg border-t border-slate-200 flex justify-around p-3 z-50">
        <MobileNavItem 
          active={activeTab === 'home'} 
          onClick={() => setActiveTab('home')}
          icon={<HomeIcon className="w-6 h-6" />}
          label="Accueil"
        />
        {currentUser.role === 'athlete' && (
          <MobileNavItem 
            active={activeTab === 'add'} 
            onClick={handleAddNew}
            icon={<PlusIcon className="w-6 h-6" />}
            label="Ajouter"
          />
        )}
        <MobileNavItem 
          active={activeTab === 'stats'} 
          onClick={() => { setActiveTab('stats'); setSelectedAthleteIdForStats(undefined); }}
          icon={<ChartBarIcon className="w-6 h-6" />}
          label="Stats"
        />
        <MobileNavItem 
          active={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')}
          icon={<UserCircleIcon className="w-6 h-6" />}
          label="Profil"
        />
      </nav>
    </div>
  );
};

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-club-primary text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-club-primary' : 'text-slate-400'}`}
  >
    {icon}
    <span className="text-[10px] font-bold uppercase">{label}</span>
  </button>
);

export default App;
