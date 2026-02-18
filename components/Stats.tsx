
import React, { useState, useMemo } from 'react';
import { Session, StatsPeriod, Discipline, User } from '../types';
import { DISCIPLINE_CONFIG } from '../constants';
import { formatDuration } from '../utils';
import { ChartBarIcon, ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from 'recharts';

interface StatsProps {
  sessions: Session[];
  currentUser: User;
  allUsers?: User[];
  selectedAthleteId?: string;
}

interface DisciplineTotalStats {
  minutes: number;
  km: number;
  count: number;
}

const Stats: React.FC<StatsProps> = ({ 
  sessions, 
  currentUser, 
  allUsers = [], 
  selectedAthleteId: initialAthleteId
}) => {
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [targetAthleteId, setTargetAthleteId] = useState<string | null>(initialAthleteId || (currentUser.role === 'athlete' ? currentUser.id : null));
  
  const [refDate, setRefDate] = useState(new Date());

  const clubAthletes = useMemo(() => 
    allUsers.filter(u => u.role === 'athlete' && u.club === currentUser.club && u.active),
  [allUsers, currentUser.club]);

  const handleSelectAthlete = (id: string) => {
    setTargetAthleteId(id);
  };

  const periodBounds = useMemo(() => {
    const start = new Date(refDate);
    const end = new Date(refDate);

    if (period === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setTime(start.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 3600 * 1000 + 3599000);
    } else if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'custom' && customRange.start && customRange.end) {
      return { start: new Date(customRange.start), end: new Date(customRange.end) };
    }

    return { start, end };
  }, [period, refDate, customRange]);

  const filteredSessions = useMemo(() => {
    let base = sessions;
    if (targetAthleteId) {
      base = base.filter(s => s.user_id === targetAthleteId);
    } else if (currentUser.role === 'athlete') {
      base = base.filter(s => s.user_id === currentUser.id);
    } else {
      return [];
    }

    return base.filter(s => {
      const d = new Date(s.date);
      return d >= periodBounds.start && d <= periodBounds.end;
    });
  }, [sessions, periodBounds, targetAthleteId, currentUser]);

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(refDate);
    const factor = direction === 'prev' ? -1 : 1;

    if (period === 'day') {
      newDate.setDate(newDate.getDate() + factor);
    } else if (period === 'week') {
      newDate.setDate(newDate.getDate() + (7 * factor));
    } else if (period === 'month') {
      newDate.setMonth(newDate.getMonth() + factor);
    } else if (period === 'year') {
      newDate.setFullYear(newDate.getFullYear() + factor);
    }
    setRefDate(newDate);
  };

  const periodLabel = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
    if (period === 'day') {
      return refDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (period === 'week') {
      return `Semaine du ${periodBounds.start.toLocaleDateString('fr-FR', options)} au ${periodBounds.end.toLocaleDateString('fr-FR', options)}`;
    }
    if (period === 'month') {
      return refDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    if (period === 'year') {
      return `Année ${refDate.getFullYear()}`;
    }
    return "Période personnalisée";
  }, [period, refDate, periodBounds]);

  const chartData = useMemo(() => {
    const data: Record<string, { minutes: number, km: number, count: number }> = {};
    filteredSessions.forEach(s => {
      const disciplineLabel = s.discipline;
      if (!data[disciplineLabel]) {
        data[disciplineLabel] = { minutes: 0, km: 0, count: 0 };
      }
      data[disciplineLabel].minutes += s.duration_minutes;
      data[disciplineLabel].km += (s.distance_km || 0);
      data[disciplineLabel].count += 1;
    });
    return Object.entries(data).map(([name, stats]) => ({ name, ...stats, hours: stats.minutes / 60 }));
  }, [filteredSessions]);

  const dailyRpeData = useMemo(() => {
    const groups: Record<string, { rpeSum: number, count: number, sessions: Session[] }> = {};
    filteredSessions.forEach(s => {
      if (!groups[s.date]) groups[s.date] = { rpeSum: 0, count: 0, sessions: [] };
      groups[s.date].rpeSum += s.rpe;
      groups[s.date].count += 1;
      groups[s.date].sessions.push(s);
    });

    const sortedDates = Object.keys(groups).sort();
    return sortedDates.map(date => ({
      date: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      avgRpe: groups[date].rpeSum / groups[date].count,
      sessions: groups[date].sessions
    }));
  }, [filteredSessions]);

  const disciplineTotals = useMemo(() => {
    const totals: Record<string, DisciplineTotalStats> = {};
    (Object.keys(DISCIPLINE_CONFIG) as Discipline[]).forEach(d => {
      totals[d] = { minutes: 0, km: 0, count: 0 };
    });
    filteredSessions.forEach(s => {
      const target = totals[s.discipline];
      if (target) {
        target.minutes += s.duration_minutes;
        target.km += s.distance_km || 0;
        target.count += 1;
      }
    });
    return totals;
  }, [filteredSessions]);

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const config = DISCIPLINE_CONFIG[data.name as Discipline];
      
      return (
        <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100">
          <p className="font-bold text-slate-900 flex items-center gap-2">
            <span>{config?.icon}</span> {data.name}
          </p>
          <p className="text-sm text-slate-600 font-medium">Durée: {formatDuration(data.minutes)}</p>
          {(data.name === 'Course' || data.name === 'Natation' || data.name === 'Laser Run') && (
            <p className="text-sm text-club-primary font-bold">Distance: {data.km.toFixed(1)} km</p>
          )}
          <p className="text-[10px] text-slate-400 font-bold uppercase">Sessions: {data.count}</p>
        </div>
      );
    }
    return null;
  };

  const CustomRPETooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl max-w-xs">
          <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{label}</p>
          <p className="font-bold flex items-center gap-2 text-lg mb-2">
            <span className="text-yellow-400">⚡</span> Moyenne RPE: {data.avgRpe.toFixed(1)}
          </p>
          <div className="space-y-1.5 pt-2 border-t border-slate-700">
            {data.sessions.map((s: Session) => (
              <div key={s.id} className="flex justify-between items-center text-[11px] gap-4">
                <span className="flex items-center gap-1">
                  <span>{DISCIPLINE_CONFIG[s.discipline].icon}</span>
                  <span className="truncate max-w-[80px]">{s.discipline}</span>
                </span>
                <span className="font-bold text-yellow-500">RPE {s.rpe}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const currentAthleteName = useMemo(() => 
    clubAthletes.find(a => a.id === targetAthleteId)?.name, 
  [clubAthletes, targetAthleteId]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Statistiques</h1>
        <p className="text-slate-500">
          {currentUser.role === 'coach' 
            ? (targetAthleteId ? `Consultation de : ${currentAthleteName}` : 'Sélectionnez un athlète') 
            : 'Analyse de tes performances.'}
        </p>
      </header>

      {currentUser.role === 'coach' && (
        <section className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <h2 className="text-xs font-bold text-slate-400 uppercase mb-3 px-2 tracking-widest">Choisir un athlète</h2>
          <div className="flex gap-2 pb-1">
            {clubAthletes.map(u => (
              <button
                key={u.id}
                onClick={() => handleSelectAthlete(u.id)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                  targetAthleteId === u.id 
                    ? 'text-white shadow-md' 
                    : 'bg-slate-50 border-transparent text-slate-600 hover:border-slate-200'
                }`}
                style={targetAthleteId === u.id ? { backgroundColor: 'var(--club-primary)', borderColor: 'var(--club-primary)' } : {}}
              >
                {u.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {targetAthleteId ? (
        <>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(['day', 'week', 'month', 'year', 'custom'] as StatsPeriod[]).map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setRefDate(new Date()); }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider border-2 transition-all ${
                    period === p 
                      ? 'text-white' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                  }`}
                  style={period === p ? { backgroundColor: 'var(--club-primary)', borderColor: 'var(--club-primary)' } : {}}
                >
                  {p === 'day' ? 'Jour' : p === 'week' ? 'Semaine' : p === 'month' ? 'Mois' : p === 'year' ? 'Année' : 'Perso'}
                </button>
              ))}
            </div>

            {period !== 'custom' && (
              <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                <button 
                  onClick={() => navigate('prev')}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
                >
                  <ChevronLeftIcon className="w-6 h-6" />
                </button>
                
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-club-primary" />
                  <span className="font-bold text-slate-900 capitalize">{periodLabel}</span>
                </div>

                <button 
                  onClick={() => navigate('next')}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
                >
                  <ChevronRightIcon className="w-6 h-6" />
                </button>
              </div>
            )}

            {period === 'custom' && (
              <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 animate-in slide-in-from-top-2">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Début</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm" value={customRange.start} onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Fin</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm" value={customRange.end} onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          {filteredSessions.length > 0 ? (
            <>
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold mb-6">Répartition de la durée</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={10} fontStyle="italic" fontWeight="bold" axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={DISCIPLINE_CONFIG[entry.name as Discipline]?.hexColor || '#94a3b8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              {period !== 'day' && (
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span>📈</span> Intensité Moyenne Journalière (RPE)
                  </h2>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyRpeData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 10]} fontSize={10} fontWeight="bold" axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomRPETooltip />} />
                        <Line 
                          type="monotone" 
                          dataKey="avgRpe" 
                          stroke="var(--club-primary)" 
                          strokeWidth={3} 
                          dot={{ fill: 'var(--club-primary)', r: 4 }} 
                          activeDot={{ r: 6, strokeWidth: 0 }} 
                          name="Moyenne RPE" 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(disciplineTotals).map(([disc, stats]: [string, DisciplineTotalStats]) => {
                  if (stats.count === 0) return null;
                  return (
                    <div key={disc} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-club-primary">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-2xl">{DISCIPLINE_CONFIG[disc as Discipline]?.icon}</span>
                        <h3 className="font-bold text-slate-900">{disc}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Durée</div>
                          <div className="text-sm font-bold text-slate-900">{formatDuration(stats.minutes)}</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">Sés.</div>
                          <div className="text-lg font-bold text-slate-900">{stats.count}</div>
                        </div>
                        {DISCIPLINE_CONFIG[disc as Discipline]?.hasDistance && (
                          <div className="col-span-2 p-3 rounded-xl text-center mt-1 bg-slate-50">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Distance Totale</div>
                            <div className="text-xl font-bold text-club-primary">{stats.km.toFixed(1)} km</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>
            </>
          ) : (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
               <CalendarIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
               <p className="text-slate-400 font-medium">Aucune donnée pour cette période.</p>
               <button 
                 onClick={() => setRefDate(new Date())}
                 className="mt-4 text-club-primary text-sm font-bold hover:underline"
               >
                 Revenir à aujourd'hui
               </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
           <ChartBarIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
           <p className="text-slate-400 font-medium">Sélectionnez un athlète dans la liste ci-dessus.</p>
        </div>
      )}
    </div>
  );
};

export default Stats;
