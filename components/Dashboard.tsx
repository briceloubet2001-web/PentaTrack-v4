
import React, { useMemo } from 'react';
import { Session, User } from '../types';
import { DISCIPLINE_CONFIG } from '../constants';
import { formatDuration } from '../utils';
import { 
  TrashIcon, 
  ClockIcon, 
  MapPinIcon, 
  TagIcon,
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  ChartBarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface DashboardProps {
  currentUser: User;
  sessions: Session[];
  allUsers?: User[];
  onDelete?: (id: string) => void;
  onEdit?: (session: Session) => void;
  onToggleUserStatus?: (userId: string, active: boolean) => void;
  onRejectUser?: (userId: string) => void;
  onViewStats?: (athleteId: string) => void;
  onRefreshUsers?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  currentUser, 
  sessions, 
  allUsers = [], 
  onDelete, 
  onEdit, 
  onToggleUserStatus, 
  onRejectUser,
  onViewStats,
  onRefreshUsers
}) => {
  // ATHLETE VIEW LOGIC
  const athleteSessions = useMemo(() => sessions.filter(s => s.user_id === currentUser.id), [sessions, currentUser.id]);
  
  const weeklySessions = useMemo(() => {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    return athleteSessions.filter(s => new Date(s.date) >= startOfWeek);
  }, [athleteSessions]);

  const stats = useMemo(() => {
    const res = {
      totalMinutes: 0,
      sessionsCount: weeklySessions.length,
      kmCourseTotal: 0,
      kmLaserRun: 0,
      kmNatation: 0,
      countObstacles: 0,
      countTir: 0,
      countPrepa: 0,
      countMedical: 0,
      countEscrime: 0
    };

    weeklySessions.forEach(s => {
      res.totalMinutes += s.duration_minutes || 0;
      if (s.discipline === 'Course') res.kmCourseTotal += s.distance_km || 0;
      if (s.discipline === 'Natation') res.kmNatation += s.distance_km || 0;
      if (s.discipline === 'Laser Run') {
        res.kmCourseTotal += s.distance_km || 0;
        res.kmLaserRun += s.distance_km || 0;
      }
      if (s.discipline === 'Obstacles') res.countObstacles += 1;
      if (s.discipline === 'Tir') res.countTir += 1;
      if (s.discipline === 'Prépa Physique') res.countPrepa += 1;
      if (s.discipline === 'Médical') res.countMedical += 1;
      if (s.discipline === 'Escrime') res.countEscrime += 1;
    });

    return res;
  }, [weeklySessions]);

  // COACH VIEW LOGIC
  const pendingAthletes = useMemo(() => 
    allUsers.filter(u => u.role === 'athlete' && u.club === currentUser.club && u.active === false), 
  [allUsers, currentUser.club]);

  const activeAthletes = useMemo(() => 
    allUsers.filter(u => u.role === 'athlete' && u.club === currentUser.club && u.active === true), 
  [allUsers, currentUser.club]);

  if (currentUser.role === 'coach') {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tableau de Bord - {currentUser.club}</h1>
            <p className="text-slate-500">Gestion des athlètes et suivi des performances.</p>
          </div>
          <button 
            onClick={onRefreshUsers}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <ArrowPathIcon className="w-4 h-4" /> Actualiser
          </button>
        </header>

        {pendingAthletes.length > 0 && (
          <section className="bg-orange-50 rounded-2xl p-6 border border-orange-200">
            <h2 className="text-xl font-bold mb-4 text-orange-900 flex items-center gap-2">
              <UserIcon className="w-5 h-5" /> Inscriptions en attente ({pendingAthletes.length})
            </h2>
            <div className="space-y-3">
              {pendingAthletes.map(u => (
                <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onToggleUserStatus?.(u.id, true)}
                      className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-green-700 transition-all shadow-sm"
                    >
                      <CheckCircleIcon className="w-4 h-4" /> Valider
                    </button>
                    <button 
                      onClick={() => onRejectUser?.(u.id)}
                      className="flex items-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-red-200 transition-all"
                    >
                      <XCircleIcon className="w-4 h-4" /> Refuser
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Mes Athlètes ({activeAthletes.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAthletes.length === 0 ? (
              <div className="col-span-full py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center text-slate-400">
                {pendingAthletes.length > 0 
                  ? "Aucun athlète validé, mais des inscriptions sont en attente ci-dessus."
                  : "Aucun athlète actif dans votre club."}
              </div>
            ) : (
              activeAthletes.map(u => {
                const userSessions = sessions.filter(s => s.user_id === u.id);
                return (
                  <div key={u.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{u.name}</div>
                          <div className="text-xs text-slate-400">{userSessions.length} sessions au total</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => onViewStats?.(u.id)}
                        className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-1"
                      >
                        <ChartBarIcon className="w-3.5 h-3.5" /> Voir Stats
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dernière activité</h4>
                      {userSessions.length > 0 ? (
                        <div className="text-xs p-2 bg-slate-50 rounded-lg flex justify-between items-center">
                          <span className="font-medium text-slate-700">
                            {userSessions[0].discipline}
                          </span>
                          <span className="text-slate-400 italic">
                            {new Date(userSessions[0].date).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-300 italic">Aucune séance encore.</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Salut, {currentUser.name}!</h1>
          <p className="text-slate-500">Ton club : {currentUser.club}</p>
        </div>
      </header>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          label="Sessions / Semaine" 
          value={stats.sessionsCount.toString()} 
          sub="Toutes disciplines"
          color="bg-blue-600"
        />
        <StatCard 
          label="Volume Horaire" 
          value={formatDuration(stats.totalMinutes)} 
          sub="Temps total cette semaine"
          color="bg-slate-800"
        />
        <StatCard 
          label="Course à Pied" 
          value={`${stats.kmCourseTotal.toFixed(1)} km`} 
          sub={`Dont ${stats.kmLaserRun.toFixed(1)} km en Laser Run`}
          color="bg-green-600"
        />
      </div>

      {/* Discipline Breakdown */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span>📊</span> Bilan discipline / semaine
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <MiniStat label="Natation" value={`${stats.kmNatation.toFixed(1)} km`} icon="🏊" />
          <MiniStat label="Obstacles" value={`${stats.countObstacles} sés.`} icon="🚧" />
          <MiniStat label="Tir" value={`${stats.countTir} sés.`} icon="🎯" />
          <MiniStat label="Escrime" value={`${stats.countEscrime} sés.`} icon="⚔️" />
          <MiniStat label="Prépa Phys." value={`${stats.countPrepa} sés.`} icon="🏋️" />
          <MiniStat label="Médical" value={`${stats.countMedical} sés.`} icon="🏥" />
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-xl font-bold mb-4">Dernières sessions</h2>
        <p className="text-xs text-slate-400 mb-3 italic">Clique sur une séance pour la modifier.</p>
        <div className="space-y-3">
          {athleteSessions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
              Aucune session enregistrée.
            </div>
          ) : (
            athleteSessions.slice(0, 10).map(s => (
              <SessionItem 
                key={s.id} 
                session={s} 
                onDelete={() => onDelete?.(s.id)} 
                onClick={() => onEdit?.(s)} 
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; sub: string; color: string }> = ({ label, value, sub, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
    <div className={`absolute left-0 top-0 bottom-0 w-1 ${color}`}></div>
    <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</div>
    <div className="text-3xl font-bold mt-1 text-slate-900">{value}</div>
    <div className="text-xs text-slate-400 mt-1">{sub}</div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string; icon: string }> = ({ label, value, icon }) => (
  <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-100">
    <span className="text-2xl mb-1">{icon}</span>
    <span className="text-sm font-bold text-slate-900">{value}</span>
    <span className="text-[10px] uppercase text-slate-400 font-bold">{label}</span>
  </div>
);

const SessionItem: React.FC<{ session: Session; onDelete: () => void; onClick: () => void }> = ({ session, onDelete, onClick }) => {
  const config = DISCIPLINE_CONFIG[session.discipline];
  
  const rpeColor = (rpe: number) => {
    if (rpe <= 3) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (rpe <= 6) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (rpe <= 8) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div 
      onClick={onClick}
      className="group bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md cursor-pointer hover:border-blue-200"
    >
      <div className={`w-12 h-12 rounded-full ${config.color} flex items-center justify-center text-white text-xl shadow-inner shrink-0`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-900 truncate">{session.discipline}</h3>
          <span className="text-xs text-slate-400">• {new Date(session.date).toLocaleDateString()}</span>
          {session.rpe && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rpeColor(session.rpe)} flex items-center gap-1`}>
              <BoltIcon className="w-2.5 h-2.5" /> RPE {session.rpe}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
          {session.duration_minutes > 0 && (
            <span className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {formatDuration(session.duration_minutes)}</span>
          )}
          {session.distance_km && (
            <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" /> {session.distance_km} km</span>
          )}
          {session.work_types.length > 0 && (
            <span className="flex items-center gap-1 truncate"><TagIcon className="w-3.5 h-3.5" /> {session.work_types.join(', ')}</span>
          )}
        </div>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-slate-300"
      >
        <TrashIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Dashboard;