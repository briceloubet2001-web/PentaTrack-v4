
import React, { useMemo, useState, useRef } from 'react';
import { Session, User, ClubInfo, Discipline } from '../types';
import { DISCIPLINE_CONFIG } from '../constants';
import { 
  ComputerDesktopIcon, 
  DevicePhoneMobileIcon, 
  UserGroupIcon, 
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  TagIcon,
  XMarkIcon,
  ChatBubbleLeftEllipsisIcon
} from '@heroicons/react/24/outline';

interface AnalyseProps {
  sessions: Session[];
  currentUser: User;
  currentClubInfo: ClubInfo | null;
  allUsers: User[];
  isDesktop: boolean;
}

const Analyse: React.FC<AnalyseProps> = ({ sessions, currentUser, currentClubInfo, allUsers, isDesktop }) => {
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [activeWeek, setActiveWeek] = useState<number>(() => {
    const d = new Date();
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    return Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
  });
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerData, setDrawerData] = useState<{ discipline: Discipline, week: number } | null>(null);
  const matrixContainerRef = useRef<HTMLDivElement>(null);

  const clubAthletes = useMemo(() => 
    allUsers.filter(u => u.role === 'athlete' && u.club === currentUser.club && u.active),
  [allUsers, currentUser.club]);

  const currentYear = new Date().getFullYear();
  const weeks = Array.from({ length: 52 }, (_, i) => i + 1);

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getMonthNameForWeek = (week: number) => {
    const d = new Date(currentYear, 0, 1 + (week - 1) * 7);
    return d.toLocaleDateString('fr-FR', { month: 'long' });
  };

  // Calcul des blocs de mois pour le header
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
  }, [weeks, currentYear]);

  const filteredSessions = useMemo(() => {
    if (!selectedAthleteId) return [];
    return sessions.filter(s => s.user_id === selectedAthleteId);
  }, [sessions, selectedAthleteId]);

  const matrixData = useMemo(() => {
    const data: Record<Discipline, Record<number, { rpeSum: number, km: number, count: number, sessions: Session[] }>> = {} as any;
    (Object.keys(DISCIPLINE_CONFIG) as Discipline[]).forEach(d => {
      data[d] = {};
      weeks.forEach(w => data[d][w] = { rpeSum: 0, km: 0, count: 0, sessions: [] });
    });

    filteredSessions.forEach(s => {
      const d = new Date(s.date);
      if (d.getFullYear() === currentYear) {
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
  }, [filteredSessions, weeks, currentYear]);

  // Max value pour l'échelle des barres (basé sur le count ou km selon discipline)
  const maxValuesByDisc = useMemo(() => {
    const maxes: Record<string, number> = {};
    (Object.keys(DISCIPLINE_CONFIG) as Discipline[]).forEach(disc => {
      let m = 0;
      weeks.forEach(w => {
        const stats = matrixData[disc][w];
        const val = (disc === 'Natation' || disc === 'Course' || disc === 'Laser Run') ? stats.km : stats.count;
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

  const COL_WIDTH = 32; // Largeur d'une semaine en px
  const LABEL_WIDTH = 180; // Largeur du libellé discipline

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 w-full px-4">
      {/* Header & Athlete Selector */}
      <header className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          {currentClubInfo?.logo_url && (
            <img src={currentClubInfo.logo_url} alt="Logo" className="h-14 w-14 object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analyse de Saison {currentYear}</h1>
            <p className="text-slate-500 text-sm italic">Pilotez la périodisation de vos athlètes</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <UserGroupIcon className="w-5 h-5 text-slate-400 ml-2" />
            <select 
              className="bg-transparent border-none font-bold text-sm focus:ring-0 outline-none pr-8"
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
        <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-medium">Choisissez un athlète pour déployer la matrice de performance.</p>
        </div>
      ) : (
        <>
          {/* Point 1: Bandeau Récapitulatif Dynamique */}
          <section className="grid grid-cols-7 gap-4">
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

          {/* Main Matrix Container */}
          <div 
            className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col relative group/matrix min-w-max"
            ref={matrixContainerRef}
          >
            {/* Double Échelle Temporelle (Mois & Semaines) */}
            <div className="flex flex-col sticky top-0 z-30 bg-slate-900 text-white">
              {/* Ligne des Mois */}
              <div className="flex border-b border-white/10">
                <div className="w-[180px] shrink-0 p-4 border-r border-white/10 flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calendrier</span>
                </div>
                <div className="flex-1 flex overflow-x-hidden">
                  {monthBlocks.map((block, idx) => (
                    <div 
                      key={idx} 
                      className={`h-10 flex items-center justify-center border-r border-white/10 text-[10px] font-black uppercase tracking-widest bg-slate-800/50`}
                      style={{ width: `${block.span * COL_WIDTH}px` }}
                    >
                      {block.name}
                    </div>
                  ))}
                </div>
              </div>
              {/* Ligne des Semaines */}
              <div className="flex border-b border-white/10">
                <div className="w-[180px] shrink-0 border-r border-white/10" />
                <div className="flex-1 flex overflow-x-hidden">
                  {weeks.map(w => (
                    <div 
                      key={w} 
                      className={`w-8 shrink-0 border-r border-white/5 h-8 flex items-center justify-center transition-colors cursor-pointer text-[10px] font-bold ${activeWeek === w ? 'bg-club-primary text-white' : 'hover:bg-white/10 text-slate-400'}`}
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

            {/* Sync Cursor (Vertical Line) - Calculé avec précision */}
            {(hoveredWeek || activeWeek) && (
              <div 
                className={`absolute top-0 bottom-0 w-8 pointer-events-none transition-all duration-75 z-10 ${hoveredWeek ? 'bg-slate-400/10' : 'bg-club-primary/5 border-x border-club-primary/10'}`}
                style={{ left: `${LABEL_WIDTH + ((hoveredWeek || activeWeek) - 1) * COL_WIDTH}px` }}
              />
            )}

            {/* Lignes de disciplines */}
            {(Object.keys(DISCIPLINE_CONFIG) as Discipline[])
              .filter(d => d !== 'Médical') // On ne garde que les disciplines sportives demandées
              .map(disc => (
              <div key={disc} className="flex border-b border-slate-50 transition-colors relative z-0 h-32 hover:bg-slate-50/30">
                <div className="w-[180px] shrink-0 p-4 border-r border-slate-100 flex items-center gap-2 bg-white z-20">
                  <span className="text-2xl shrink-0">{DISCIPLINE_CONFIG[disc].icon}</span>
                  <span className="text-xs font-bold text-slate-700 truncate uppercase tracking-tight">{disc}</span>
                </div>
                <div className="flex-1 flex overflow-x-hidden items-end bg-white/50">
                  {weeks.map(w => {
                    const stats = matrixData[disc][w];
                    const val = (disc === 'Natation' || disc === 'Course' || disc === 'Laser Run') ? stats.km : stats.count;
                    const height = (val / maxValuesByDisc[disc]) * 100;
                    const isSelected = activeWeek === w;
                    
                    return (
                      <div 
                        key={w} 
                        className={`w-8 shrink-0 h-full flex items-end justify-center border-r border-slate-50 transition-all cursor-pointer relative group/bar ${isSelected ? 'bg-slate-50/80' : 'hover:bg-slate-50/50'}`}
                        onMouseEnter={() => setHoveredWeek(w)}
                        onMouseLeave={() => setHoveredWeek(null)}
                        onClick={() => handleBarClick(disc, w)}
                      >
                        {val > 0 && (
                          <div 
                            className="w-6 mx-auto rounded-t-lg transition-all relative flex flex-col justify-end items-center shadow-sm group-hover/bar:scale-x-110"
                            style={{ 
                              height: `${Math.max(height, 15)}%`, 
                              backgroundColor: DISCIPLINE_CONFIG[disc].hexColor,
                              opacity: isSelected ? 1 : 0.75
                            }}
                          >
                            {/* Point 4: Affichage des valeurs sur les barres (KM ou Count) */}
                            <span className="text-[9px] font-black text-white mb-2 drop-shadow-md">
                              {(disc === 'Natation' || disc === 'Course' || disc === 'Laser Run') 
                                ? stats.km.toFixed(stats.km < 10 ? 1 : 0) 
                                : stats.count}
                            </span>
                          </div>
                        )}
                        
                        {/* Tooltip corrigé */}
                        <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 hidden group-hover/bar:block z-40 pointer-events-none scale-90 origin-bottom transition-transform group-hover/bar:scale-100">
                          <div className="bg-slate-900 text-white text-[10px] p-2.5 rounded-xl shadow-2xl whitespace-nowrap font-bold border border-white/10">
                            <div className="text-club-primary mb-1">{disc} - Semaine {w}</div>
                            {stats.km > 0 && <div>Distance: {stats.km.toFixed(1)} km</div>}
                            <div>Séances: {stats.count}</div>
                            <div className="text-[8px] text-slate-400 mt-1 uppercase tracking-widest">Cliquez pour le détail</div>
                          </div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-white/10" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Point 3: Effet Loupe - Panneau Latéral (Drawer) */}
      {drawerOpen && drawerData && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-96 bg-white h-full shadow-2xl border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
            <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl text-white shadow-inner`} style={{ backgroundColor: DISCIPLINE_CONFIG[drawerData.discipline].hexColor }}>
                  {DISCIPLINE_CONFIG[drawerData.discipline].icon}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">{drawerData.discipline}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Semaine {drawerData.week}</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Séances</div>
                  <div className="text-2xl font-black text-slate-900">{matrixData[drawerData.discipline][drawerData.week].count}</div>
                </div>
                {(drawerData.discipline === 'Natation' || drawerData.discipline === 'Course' || drawerData.discipline === 'Laser Run') && (
                  <div className="bg-club-primary/10 p-4 rounded-2xl border border-club-primary/20 text-center">
                    <div className="text-[10px] font-black text-club-primary uppercase tracking-widest mb-1">Total Km</div>
                    <div className="text-2xl font-black text-club-primary">{matrixData[drawerData.discipline][drawerData.week].km.toFixed(1)}</div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Détail des séances</h4>
                {matrixData[drawerData.discipline][drawerData.week].sessions.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Aucune séance enregistrée pour cette discipline cette semaine.</p>
                ) : (
                  matrixData[drawerData.discipline][drawerData.week].sessions
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(s => (
                      <div key={s.id} className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-md text-slate-600">
                            {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-xs font-bold text-amber-500">RPE {s.rpe}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-700">
                          {s.duration_minutes > 0 && <div className="flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> {s.duration_minutes}m</div>}
                          {s.distance_km && <div className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" /> {s.distance_km}km</div>}
                        </div>
                        {s.work_types.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {s.work_types.map(t => (
                              <span key={t} className="text-[9px] font-bold bg-club-primary/5 text-club-primary px-2 py-0.5 rounded-full border border-club-primary/10 flex items-center gap-1">
                                <TagIcon className="w-2 h-2" /> {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {s.notes && (
                          <div className="pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-1.5 mb-1 opacity-50">
                              <ChatBubbleLeftEllipsisIcon className="w-3 h-3" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Notes</span>
                            </div>
                            <p className="text-[11px] text-slate-500 italic leading-relaxed">« {s.notes} »</p>
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
  <div className={`bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center transition-all ${isHighlight ? 'ring-2 ring-club-primary/20 bg-club-primary/5' : 'hover:border-club-primary'}`}>
    <span className="text-2xl mb-1">{icon}</span>
    <div className="flex items-baseline gap-1">
      <span className={`text-xl font-black ${color}`}>{value}</span>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{unit}</span>
    </div>
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 text-center">{label}</span>
  </div>
);

export default Analyse;
