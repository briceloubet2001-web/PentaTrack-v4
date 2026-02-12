
import React, { useMemo, useState } from 'react';
import { Session, User, ClubInfo } from '../types';
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
  ArrowPathIcon,
  ChevronLeftIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

interface DashboardProps {
  currentUser: User;
  currentClubInfo: ClubInfo | null;
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
  currentClubInfo,
  sessions, 
  allUsers = [], 
  onDelete, 
  onEdit, 
  onToggleUserStatus, 
  onRejectUser,
  onViewStats,
  onRefreshUsers
}) => {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);

  const targetId = currentUser.role === 'coach' ? selectedAthleteId : currentUser.id;
  const isViewingMirror = currentUser.role === 'coach' && selectedAthleteId !== null;

  const targetUser = useMemo(() => {
    if (!targetId) return null;
    return allUsers.find(u => u.id === targetId) || (targetId === currentUser.id ? currentUser : null);
  }, [allUsers, targetId, currentUser]);

  const targetSessions = useMemo(() => {
    if (!targetId) return [];
    return sessions.filter(s => s.user_id === targetId);
  }, [sessions, targetId]);

  const weeklySessions = useMemo(() => {
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    return targetSessions.filter(s => new Date(s.date) >= startOfWeek);
  }, [targetSessions]);

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

  const pendingAthletes = useMemo(() => 
    allUsers.filter(u => u.role === 'athlete' && u.club === currentUser.club && u.active === false), 
  [allUsers, currentUser.club]);

  const activeAthletes = useMemo(() => 
    allUsers.filter(u => u.role === 'athlete' && u.club === currentUser.club && u.active === true), 
  [allUsers, currentUser.club]);

  if (currentUser.role === 'coach' && !selectedAthleteId) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {currentClubInfo?.logo_url && (
              <img src={currentClubInfo.logo_url} alt="Logo Club" className="h-14 w-14 object-contain" />
            )}
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Club {currentUser.club}</h1>
              <p className="text-slate-500">Gestion des athlètes et suivi.</p>
            </div>
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
                Aucun athlète actif dans votre club.
              </div>
            ) : (
              activeAthletes.map(u => {
                const userSessions = sessions.filter(s => s.user_id === u.id);
                return (
                  <div 
                    key={u.id} 
                    onClick={() => setSelectedAthleteId(u.id)}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-club-primary transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                          style={{ backgroundColor: 'var(--club-primary)' }}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-club-primary transition-colors">{u.name}</div>
                          <div className="text-xs text-slate-400">{userSessions.length} sessions au total</div>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onViewStats?.(u.id); }}
                        className="bg-club-secondary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1"
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
        <div className="flex items-center gap-4">
          {currentClubInfo?.logo_url && (
            <img src={currentClubInfo.logo_url} alt="Logo Club" className="h-16 w-16 object-contain" />
          )}
          <div className="flex flex-col gap-0.5">
            {isViewingMirror && (
              <button 
                onClick={() => setSelectedAthleteId(null)}
                className="flex items-center gap-1 text-club-primary text-sm font-bold hover:underline mb-1"
              >
                <ChevronLeftIcon className="w-4 h-4" /> Retour au club
              </button>
            )}
            <h1 className="text-3xl font-bold text-slate-900">
              {isViewingMirror ? `Suivi de ${targetUser?.name}` : `Salut, ${currentUser.name}!`}
            </h1>
            <p className="text-slate-500">
              {isViewingMirror ? `Club ${currentUser.club}` : `Prêt pour ton entraînement ?`}
            </p>
          </div>
        </div>
        
        {isViewingMirror && (
          <button 
            onClick={() => onViewStats?.(targetId!)}
            className="bg-club-secondary text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-lg"
          >
            <ChartBarIcon className="w-4 h-4" /> Voir Stats Détaillées
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard 
          label="Sessions / Semaine" 
          value={stats.sessionsCount.toString()} 
          sub="Toutes disciplines"
          color="bg-club-primary"
        />
        <StatCard 
          label="Volume Horaire" 
          value={formatDuration(stats.totalMinutes)} 
          sub="Temps total cette semaine"
          color="bg-club-secondary"
        />
        <StatCard 
          label="Course à Pied" 
          value={`${stats.kmCourseTotal.toFixed(1)} km`} 
          sub={`Dont ${stats.kmLaserRun.toFixed(1)} km en Laser Run`}
          color="bg-green-600"
        />
      </div>

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

      <section>
        <h2 className="text-xl font-bold mb-4">Dernières sessions</h2>
        <div className="space-y-3">
          {targetSessions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
              Aucune session enregistrée.
            </div>
          ) : (
            targetSessions.slice(0, 10).map(s => (
              <SessionItem 
                key={s.id} 
                session={s} 
                onDelete={!isViewingMirror ? () => onDelete?.(s.id) : undefined} 
                onClick={!isViewingMirror ? () => onEdit?.(s) : undefined} 
                isReadOnly={isViewingMirror}
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

const SessionItem: React.FC<{ session: Session; onDelete?: () => void; onClick?: () => void; isReadOnly?: boolean }> = ({ session, onDelete, onClick, isReadOnly }) => {
  const [showNotes, setShowNotes] = useState(false);
  const config = DISCIPLINE_CONFIG[session.discipline];
  
  const rpeColor = (rpe: number) => {
    if (rpe <= 3) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (rpe <= 6) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (rpe <= 8) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div className="flex flex-col gap-0 animate-in fade-in slide-in-from-top-1 duration-300">
      <div 
        onClick={onClick}
        className={`group bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all ${isReadOnly ? 'cursor-default' : 'hover:shadow-md cursor-pointer hover:border-club-primary'}`}
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

        <div className="flex items-center gap-2">
          {isReadOnly && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showNotes ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5" />
              Notes
              {showNotes ? <ChevronUpIcon className="w-3 h-3 ml-0.5" /> : <ChevronDownIcon className="w-3 h-3 ml-0.5" />}
            </button>
          )}

          {!isReadOnly && onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all text-slate-300"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Accordion Notes - Only for Coach View */}
      {isReadOnly && showNotes && (
        <div className="mt-1 mx-4 p-4 bg-slate-50 rounded-b-xl border-x border-b border-slate-200 animate-in slide-in-from-top-2 duration-200 shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <ChatBubbleLeftEllipsisIcon className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Commentaires de l'athlète</span>
          </div>
          <p className={`text-sm leading-relaxed ${session.notes ? 'text-slate-700 italic' : 'text-slate-400 italic font-medium'}`}>
            {session.notes ? `« ${session.notes} »` : "Aucune note pour cette séance."}
          </p>
          {session.focus && (
            <div className="mt-3 pt-3 border-t border-slate-200">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Focus séance</span>
               <span className="text-xs font-semibold text-club-primary">{session.focus}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
