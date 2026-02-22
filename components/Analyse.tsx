
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Session, User, ClubInfo, Discipline } from '../types';
import { DISCIPLINE_CONFIG } from '../constants';
import { supabase } from '../supabaseClient';
import { 
  ComputerDesktopIcon, 
  DevicePhoneMobileIcon, 
  UserGroupIcon, 
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  XMarkIcon,
  ChatBubbleLeftEllipsisIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface AnalyseProps {
  sessions: Session[];
  currentUser: User;
  currentClubInfo: ClubInfo | null;
  allUsers: User[];
  isDesktop: boolean;
}

const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getISOWeeksInYear = (year: number) => {
  const d = new Date(year, 11, 31);
  const week = getWeekNumber(d);
  return week === 1 ? getWeekNumber(new Date(year, 11, 24)) : week;
};

const Analyse: React.FC<AnalyseProps> = ({ sessions, currentUser, currentClubInfo, allUsers, isDesktop }) => {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [activeWeek, setActiveWeek] = useState<number>(() => getWeekNumber(new Date()));
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<{ discipline: Discipline, week: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [yearSessions, setYearSessions] = useState<Session[]>([]);
  const [isYearLoading, setIsYearLoading] = useState(false);

  // Reset active week when year changes
  React.useEffect(() => {
    const now = new Date();
    if (selectedYear === now.getFullYear()) {
      setActiveWeek(getWeekNumber(now));
    } else {
      // For past years, default to the last week of the year
      setActiveWeek(getISOWeeksInYear(selectedYear));
    }
  }, [selectedYear]);

  // Fetch sessions for the selected year and athlete
  useEffect(() => {
    const fetchYearData = async () => {
      if (!selectedAthleteId) {
        setYearSessions([]);
        return;
      }

      setIsYearLoading(true);
      try {
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;
        
        const { data, error } = await supabase
          .from('training_sessions')
          .select('*')
          .eq('user_id', selectedAthleteId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true });

        if (error) throw error;
        setYearSessions(data || []);
      } catch (err) {
        console.error('Error fetching year sessions:', err);
      } finally {
        setIsYearLoading(false);
      }
    };

    fetchYearData();
  }, [selectedYear, selectedAthleteId]);

  const clubAthletes = useMemo(() => 
    allUsers.filter(u => u.role === 'athlete' && u.club === currentUser.club && u.active),
  [allUsers, currentUser.club]);

  const weeks = useMemo(() => Array.from({ length: getISOWeeksInYear(selectedYear) }, (_, i) => i + 1), [selectedYear]);

  const getMonthNameForWeek = (week: number) => {
    // Find a date in the middle of the week to get the month
    const d = new Date(selectedYear, 0, 1 + (week - 1) * 7 + 3);
    return d.toLocaleDateString('fr-FR', { month: 'short' });
  };

  // Dimensions optimisées
  const COL_WIDTH = 22; 
  const LABEL_WIDTH = 130; 

  const monthBlocks = useMemo(() => {
    const blocks: { name: string, startWeek: number, span: number }[] = [];
    let currentMonth = "";
    weeks.forEach(w => {
      const m = getMonthNameForWeek(w);
      if (m !== currentMonth) {
        blocks.push({ name: m, startWeek: w, span: 1 });
        currentMonth = m;
      } else {
        blocks[blocks.length - 1].span += 1;
      }
    });
    return blocks;
  }, [weeks, selectedYear]);

  const filteredSessions = useMemo(() => {
    return yearSessions;
  }, [yearSessions]);

  const matrixData = useMemo(() => {
    const data: Record<Discipline, Record<number, { rpeSum: number, km: number, count: number, sessions: Session[] }>> = {} as any;
    (Object.keys(DISCIPLINE_CONFIG) as Discipline[]).forEach(d => {
      data[d] = {};
      weeks.forEach(w => data[d][w] = { rpeSum: 0, km: 0, count: 0, sessions: [] });
    });

    filteredSessions.forEach(s => {
      const d = new Date(s.date);
      if (d.getFullYear() === selectedYear) {
        const w = getWeekNumber(d);
        if (data[s.discipline] && data[s.discipline][w]) {
          data[s.discipline][w].rpeSum += s.rpe;
          data[s.discipline][w].km += (s.distance_km || 0);
          data[s.discipline][w].count += 1;
          data[s.discipline][w].sessions.push(s);
        }
      }
    });

    return data;
  }, [filteredSessions, weeks, selectedYear]);

  const maxValuesByDisc = useMemo(() => {
    const maxes: Record<string, number> = {};
    (Object.keys(DISCIPLINE_CONFIG) as Discipline[]).forEach(disc => {
      let m = 0;
      weeks.forEach(w => {
        const stats = matrixData[disc][w];
        let val = (disc === 'Natation' || disc === 'Course' || disc === 'Laser Run') ? stats.km : stats.count;
        // Pour la ligne Course, on combine avec le Laser Run pour l'échelle
        if (disc === 'Course') {
          val += matrixData['Laser Run'][w].km;
        }
        if (val > m) m = val;
      });
      maxes[disc] = m || 1;
    });
    return maxes;
  }, [matrixData, weeks]);

  const weeklySummary = useMemo(() => {
    const week = hoveredWeek || activeWeek;
    const res = {
      natationKm: 0,
      courseKm: 0,
      obstaclesCount: 0,
      tirCount: 0,
      escrimeCount: 0,
      prepaCount: 0,
      rpeAvg: 0,
      totalSessions: 0,
      rpeTotal: 0
    };

    (Object.keys(matrixData) as Discipline[]).forEach(disc => {
      const stats = matrixData[disc][week];
      if (!stats) return;

      if (disc === 'Natation') res.natationKm += stats.km;
      if (disc === 'Course' || disc === 'Laser Run') res.courseKm += stats.km;
      if (disc === 'Obstacles') res.obstaclesCount += stats.count;
      if (disc === 'Tir') res.tirCount += stats.count;
      if (disc === 'Escrime') res.escrimeCount += stats.count;
      if (disc === 'Prépa Physique') res.prepaCount += stats.count;
      
      res.totalSessions += stats.count;
      res.rpeTotal += stats.rpeSum;
    });

    res.rpeAvg = res.totalSessions > 0 ? res.rpeTotal / res.totalSessions : 0;
    return res;
  }, [matrixData, activeWeek, hoveredWeek]);

  const handleBarClick = (disc: Discipline, week: number) => {
    setDrawerData({ discipline: disc, week });
    setDrawerOpen(true);
  };

  if (!isDesktop) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8 space-y-6 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
          <ComputerDesktopIcon className="w-12 h-12" />
        </div>
        <div className="space-y-2 max-w-xs">
          <h2 className="text-xl font-bold text-slate-900">Analyse de Saison</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Cette interface matricielle nécessite un écran large pour afficher la chronologie annuelle de 52 semaines.
          </p>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 text-amber-700 text-xs text-left">
          <DevicePhoneMobileIcon className="w-5 h-5 shrink-0" />
          <p>Veuillez vous connecter depuis un ordinateur pour consulter ce tableau de bord d'expert.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12 w-full px-2 max-w-[100vw]">
      {/* Header & Athlete Selector */}
      <header className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          {currentClubInfo?.logo_url && (
            <img src={currentClubInfo.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
          )}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <button 
                onClick={() => setSelectedYear(prev => prev - 1)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
                title="Année précédente"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <h1 className="text-xl font-bold text-slate-900 leading-none">Saison {selectedYear}</h1>
              <button 
                onClick={() => setSelectedYear(prev => prev + 1)}
                disabled={selectedYear >= new Date().getFullYear()}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Année suivante"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-400 text-[10px] italic font-medium">Périodisation et charge de travail</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <UserGroupIcon className="w-4 h-4 text-slate-400 ml-1.5" />
            <select 
              className="bg-transparent border-none font-bold text-xs focus:ring-0 outline-none pr-6"
              value={selectedAthleteId || ''}
              onChange={(e) => setSelectedAthleteId(e.target.value)}
            >
              <option value="">Sélectionner un athlète...</option>
              {clubAthletes.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {!selectedAthleteId ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-medium">Choisissez un athlète pour déployer la matrice de performance.</p>
        </div>
      ) : (
        <>
          {/* Bandeau Récapitulatif Dynamique */}
          <section className="grid grid-cols-7 gap-3">
            <SummaryCard icon="🏊" label="Natation" value={`${weeklySummary.natationKm.toFixed(1)}`} unit="km" />
            <SummaryCard icon="🏃" label="Course" value={`${weeklySummary.courseKm.toFixed(1)}`} unit="km" />
            <SummaryCard icon="🚧" label="Obstacles" value={`${weeklySummary.obstaclesCount}`} unit="sés." />
            <SummaryCard icon="🎯" label="Tir" value={`${weeklySummary.tirCount}`} unit="sés." />
            <SummaryCard icon="⚔️" label="Escrime" value={`${weeklySummary.escrimeCount}`} unit="sés." />
            <SummaryCard icon="🏋️" label="PP" value={`${weeklySummary.prepaCount}`} unit="sés." />
            <SummaryCard 
              icon="⚡" 
              label="Intensité" 
              value={`${weeklySummary.rpeAvg.toFixed(1)}`} 
              unit="RPE" 
              color="text-amber-500" 
              isHighlight
            />
          </section>

          {/* Main Matrix Container - Scroll unique */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto relative no-scrollbar">
            {isYearLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-20 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Chargement de l'année...</p>
                </div>
              </div>
            )}
            <div className="min-w-max">
              
              {/* Header Temporel : Sticky Top + Sync horizontal par défaut car dans le flux */}
              <div className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-white/20">
                {/* Ligne des Mois */}
                <div className="flex">
                  <div className="sticky left-0 z-50 bg-slate-900 border-r border-white/10 px-3 py-2 flex items-center gap-1.5 shrink-0" style={{ width: `${LABEL_WIDTH}px` }}>
                    <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Calendrier</span>
                  </div>
                  <div className="flex">
                    {monthBlocks.map((block, idx) => (
                      <div 
                        key={idx} 
                        className={`h-7 flex items-center justify-center border-r border-white/10 text-[9px] font-black uppercase tracking-widest bg-slate-800/40 shrink-0`}
                        style={{ width: `${block.span * COL_WIDTH}px` }}
                      >
                        {block.name}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Ligne des Semaines */}
                <div className="flex">
                  <div className="sticky left-0 z-50 bg-slate-900 border-r border-white/10 shrink-0" style={{ width: `${LABEL_WIDTH}px` }} />
                  <div className="flex">
                    {weeks.map(w => (
                      <div 
                        key={w} 
                        className={`shrink-0 border-r border-white/5 h-6 flex items-center justify-center transition-colors cursor-pointer text-[9px] font-bold ${activeWeek === w ? 'bg-club-primary text-white' : 'hover:bg-white/10 text-slate-500'}`}
                        style={{ width: `${COL_WIDTH}px` }}
                        onMouseEnter={() => setHoveredWeek(w)}
                        onMouseLeave={() => setHoveredWeek(null)}
                        onClick={() => setActiveWeek(w)}
                      >
                        {w}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Matrix Body */}
              <div className="relative z-0">
                {/* Sync Cursor (Vertical Line) */}
                {(hoveredWeek || activeWeek) && (
                  <div 
                    className={`absolute top-0 bottom-0 pointer-events-none transition-all duration-75 z-10 ${hoveredWeek ? 'bg-slate-400/5' : 'bg-club-primary/5 border-x border-club-primary/10'}`}
                    style={{ 
                      left: `${LABEL_WIDTH + ((hoveredWeek || activeWeek) - 1) * COL_WIDTH}px`,
                      width: `${COL_WIDTH}px` 
                    }}
                  />
                )}

                {/* Lignes de disciplines */}
                {(Object.keys(DISCIPLINE_CONFIG) as Discipline[])
                  .filter(d => d !== 'Médical' && d !== 'Laser Run')
                  .map(disc => (
                  <div key={disc} className="flex border-b border-slate-50 transition-colors h-20 hover:bg-slate-50/20 group/row">
                    <div 
                      className="sticky left-0 z-20 bg-white border-r border-slate-100 px-3 py-3 flex items-center gap-2 shadow-[4px_0_8px_rgba(0,0,0,0.02)] transition-colors group-hover/row:bg-slate-50 shrink-0" 
                      style={{ width: `${LABEL_WIDTH}px` }}
                    >
                      <span className="text-xl shrink-0">{DISCIPLINE_CONFIG[disc].icon}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-slate-600 truncate uppercase tracking-tighter">{disc}</span>
                        {disc === 'Course' && (
                          <span className="text-[8px] font-bold text-purple-600 leading-none mt-0.5 whitespace-nowrap">dont laser run</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-end bg-white/40">
                      {weeks.map(w => {
                        const stats = matrixData[disc][w];
                        const laserRunStats = matrixData['Laser Run'][w];
                        const isCourse = disc === 'Course';
                        
                        const val = (disc === 'Natation' || disc === 'Course' || disc === 'Laser Run') ? stats.km : stats.count;
                        const totalVal = isCourse ? (stats.km + laserRunStats.km) : val;
                        const height = (totalVal / maxValuesByDisc[disc]) * 100;
                        const isSelected = activeWeek === w;
                        
                        return (
                          <div 
                            key={w} 
                            className={`shrink-0 h-full flex items-end justify-center border-r border-slate-50 transition-all cursor-pointer relative group/bar ${isSelected ? 'bg-slate-50/60' : 'hover:bg-slate-50/30'}`}
                            style={{ width: `${COL_WIDTH}px` }}
                            onMouseEnter={() => setHoveredWeek(w)}
                            onMouseLeave={() => setHoveredWeek(null)}
                            onClick={() => handleBarClick(disc, w)}
                          >
                            {totalVal > 0 && (
                              <div 
                                className="w-[16px] mx-auto rounded-t-sm transition-all relative flex flex-col justify-end items-center group-hover/bar:scale-x-110 overflow-hidden"
                                style={{ 
                                  height: `${Math.max(height, 20)}%`, 
                                  backgroundColor: isCourse ? undefined : DISCIPLINE_CONFIG[disc].hexColor,
                                  opacity: isSelected ? 1 : 0.8
                                }}
                              >
                                {isCourse ? (
                                  <div className="w-full h-full flex flex-col-reverse">
                                    {/* Laser Run part (Purple) */}
                                    <div 
                                      className="w-full bg-purple-600" 
                                      style={{ height: `${(laserRunStats.km / totalVal) * 100}%` }}
                                    />
                                    {/* Course part (Green) */}
                                    <div 
                                      className="w-full bg-green-600" 
                                      style={{ height: `${(stats.km / totalVal) * 100}%` }}
                                    />
                                  </div>
                                ) : null}
                                
                                <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white drop-shadow-sm pointer-events-none z-10">
                                  {totalVal >= 10 ? totalVal.toFixed(0) : totalVal.toFixed(1)}
                                </span>
                              </div>
                            )}
                            
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/bar:block z-40 pointer-events-none">
                              <div className="bg-slate-900 text-white text-[9px] p-2 rounded-lg shadow-2xl border border-white/10 whitespace-nowrap font-bold">
                                {disc} - S{w}<br/>
                                {totalVal > 0 && (
                                  <span>
                                    Distance: {totalVal.toFixed(1)}km
                                    {isCourse && laserRunStats.km > 0 && ` (dont ${laserRunStats.km.toFixed(1)}km laser run)`}
                                    <br/>
                                  </span>
                                )}
                                Sessions: {isCourse ? (stats.count + laserRunStats.count) : stats.count}
                              </div>
                              <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 mx-auto -mt-0.5" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <footer className="flex items-center justify-between px-2 pt-2">
            <div className="flex gap-4 text-[8px] font-bold uppercase tracking-widest text-slate-400">
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--club-primary)' }}></div> Semaine active</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-200"></div> Autres semaines</div>
            </div>
            <div className="text-[8px] font-bold text-slate-300 uppercase tracking-widest italic">
              * Faites défiler vers la droite pour voir l'année complète
            </div>
          </footer>
        </>
      )}

      {/* Side Drawer */}
      {drawerOpen && drawerData && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-80 sm:w-96 bg-white h-full shadow-2xl border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
            <header className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl text-white" style={{ backgroundColor: DISCIPLINE_CONFIG[drawerData.discipline].hexColor }}>
                  {DISCIPLINE_CONFIG[drawerData.discipline].icon}
                </div>
                <div>
                  <h3 className="text-md font-black text-slate-900 leading-tight">{drawerData.discipline}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semaine {drawerData.week}</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Séances</div>
                  <div className="text-xl font-black text-slate-900">
                    {drawerData.discipline === 'Course' 
                      ? (matrixData['Course'][drawerData.week].count + matrixData['Laser Run'][drawerData.week].count)
                      : matrixData[drawerData.discipline][drawerData.week].count}
                  </div>
                </div>
                {(drawerData.discipline === 'Natation' || drawerData.discipline === 'Course' || drawerData.discipline === 'Laser Run') && (
                  <div className="bg-club-primary/10 p-3 rounded-xl border border-club-primary/20 text-center">
                    <div className="text-[9px] font-black text-club-primary uppercase tracking-widest mb-1">Total Km</div>
                    <div className="text-xl font-black text-club-primary">
                      {drawerData.discipline === 'Course'
                        ? (matrixData['Course'][drawerData.week].km + matrixData['Laser Run'][drawerData.week].km).toFixed(1)
                        : matrixData[drawerData.discipline][drawerData.week].km.toFixed(1)}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">Historique semaine</h4>
                {[
                  ...matrixData[drawerData.discipline][drawerData.week].sessions,
                  ...(drawerData.discipline === 'Course' ? matrixData['Laser Run'][drawerData.week].sessions : [])
                ].length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucune séance cette semaine.</p>
                ) : (
                  [
                    ...matrixData[drawerData.discipline][drawerData.week].sessions,
                    ...(drawerData.discipline === 'Course' ? matrixData['Laser Run'][drawerData.week].sessions : [])
                  ]
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(s => (
                      <div key={s.id} className="p-3.5 rounded-xl bg-white border border-slate-100 shadow-sm space-y-2.5">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase">
                            {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-[10px] font-black text-amber-500">RPE {s.rpe}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-bold text-slate-700">
                          {s.duration_minutes > 0 && <div className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5 opacity-40" /> {s.duration_minutes}m</div>}
                          {s.distance_km && <div className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5 opacity-40" /> {s.distance_km}km</div>}
                        </div>
                        {s.notes && (
                          <div className="pt-2 border-t border-slate-50 flex gap-2">
                            <ChatBubbleLeftEllipsisIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <p className="text-[10px] text-slate-500 italic leading-snug">« {s.notes} »</p>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ 
  icon: string; 
  label: string; 
  value: string; 
  unit: string; 
  color?: string; 
  isHighlight?: boolean 
}> = ({ icon, label, value, unit, color = "text-slate-900", isHighlight = false }) => (
  <div className={`bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center transition-all ${isHighlight ? 'ring-1 ring-club-primary/20 bg-club-primary/5' : 'hover:border-club-primary/40'}`}>
    <span className="text-xl mb-0.5">{icon}</span>
    <div className="flex items-baseline gap-0.5">
      <span className={`text-lg font-black leading-tight ${color}`}>{value}</span>
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{unit}</span>
    </div>
    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5 text-center">{label}</span>
  </div>
);

export default Analyse;
