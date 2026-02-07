
import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  HomeIcon, 
  ChartBarIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline';
import { Session, User } from './types';
import Dashboard from './components/Dashboard';
import SessionForm from './components/SessionForm';
import Stats from './components/Stats';
import Login from './components/Login';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'add' | 'stats' | 'profile'>('home');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pentatrack_currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [selectedAthleteIdForStats, setSelectedAthleteIdForStats] = useState<string | undefined>(undefined);

  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('pentatrack_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('pentatrack_users');
    return saved ? JSON.parse(saved) : [];
  });

  // Fonction pour recharger les utilisateurs depuis le stockage local
  const refreshUsers = () => {
    const saved = localStorage.getItem('pentatrack_users');
    if (saved) {
      setUsers(JSON.parse(saved));
    }
  };

  useEffect(() => {
    localStorage.setItem('pentatrack_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('pentatrack_users', JSON.stringify(users));
  }, [users]);

  // Recharger les utilisateurs quand l'utilisateur change (connexion/déconnexion)
  useEffect(() => {
    refreshUsers();
    if (currentUser) {
      localStorage.setItem('pentatrack_currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pentatrack_currentUser');
    }
  }, [currentUser]);

  const handleSaveSession = (session: Session) => {
    if (editingSession) {
      setSessions(prev => prev.map(s => s.id === session.id ? session : s));
    } else {
      setSessions(prev => [session, ...prev]);
    }
    setEditingSession(null);
    setActiveTab('home');
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const startEdit = (session: Session) => {
    setEditingSession(session);
    setActiveTab('add');
  };

  const handleAddNew = () => {
    setEditingSession(null);
    setActiveTab('add');
  };

  const handleToggleUserStatus = (userId: string, active: boolean) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, active } : u));
  };

  const handleRejectUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const handleViewStats = (athleteId: string) => {
    setSelectedAthleteIdForStats(athleteId);
    setActiveTab('stats');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('home');
  };

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-64 flex flex-col bg-slate-50">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-slate-900 text-white flex-col p-6 shadow-2xl z-50">
        <div className="text-2xl font-bold tracking-tight mb-10 flex items-center gap-2">
          <span className="bg-blue-600 p-1.5 rounded-lg">P5</span>
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

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 md:p-8">
        {activeTab === 'home' && (
          <Dashboard 
            currentUser={currentUser}
            sessions={sessions} 
            allUsers={users}
            onDelete={deleteSession} 
            onEdit={startEdit} 
            onToggleUserStatus={handleToggleUserStatus}
            onRejectUser={handleRejectUser}
            onViewStats={handleViewStats}
            onRefreshUsers={refreshUsers}
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
              <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-4xl font-bold mb-6">
                {currentUser.name.charAt(0)}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{currentUser.name}</h2>
              <p className="text-slate-400 mb-6">{currentUser.email}</p>
              
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
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const MobileNavItem: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-blue-600' : 'text-slate-400'}`}
  >
    {icon}
    <span className="text-[10px] font-bold uppercase">{label}</span>
  </button>
);

export default App;
