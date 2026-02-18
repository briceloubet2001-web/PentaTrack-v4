
import React, { useState } from 'react';
import { Discipline, Session, User, ClubInfo } from '../types';
import { DISCIPLINE_CONFIG } from '../constants';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';

interface SessionFormProps {
  currentUser: User;
  currentClubInfo: ClubInfo | null;
  initialSession?: Session;
  onSave: (session: any) => void;
  onCancel: () => void;
}

const SessionForm: React.FC<SessionFormProps> = ({ currentUser, currentClubInfo, initialSession, onSave, onCancel }) => {
  const [discipline, setDiscipline] = useState<Discipline | null>(initialSession?.discipline || null);
  const [date, setDate] = useState(initialSession?.date || new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(initialSession?.duration_minutes.toString() || '');
  const [distance, setDistance] = useState(initialSession?.distance_km?.toString() || '');
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>(initialSession?.work_types || []);
  const [notes, setNotes] = useState(initialSession?.notes || '');
  const [focus, setFocus] = useState(initialSession?.focus || '');
  const [rpe, setRpe] = useState(initialSession?.rpe || 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discipline) return;

    const sessionData = {
      discipline,
      date,
      duration_minutes: parseInt(duration) || 0,
      work_types: selectedWorkTypes,
      distance_km: parseFloat(distance) || null,
      notes,
      focus: discipline === 'Prépa Physique' ? focus : null,
      rpe: rpe
    };

    onSave(sessionData);
  };

  const toggleWorkType = (type: string) => {
    setSelectedWorkTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const config = discipline ? DISCIPLINE_CONFIG[discipline] : null;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          {currentClubInfo?.logo_url && (
            <img src={currentClubInfo.logo_url} alt="Logo Club" className="h-16 w-16 object-contain" />
          )}
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{initialSession ? 'Modifier la séance' : 'Nouvelle séance'}</h1>
            <p className="text-slate-500">{initialSession ? 'Mets à jour tes informations.' : 'Enregistre ton entraînement du jour.'}</p>
          </div>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
          <XMarkIcon className="w-6 h-6" />
        </button>
      </header>

      {/* Discipline Selection */}
      <section>
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Discipline</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.keys(DISCIPLINE_CONFIG) as Discipline[]).map(d => (
            <button
              key={d}
              onClick={() => {
                setDiscipline(d);
                setSelectedWorkTypes([]);
                setDistance('');
                setFocus('');
              }}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                discipline === d 
                  ? `${DISCIPLINE_CONFIG[d].color.replace('bg-', 'border-')} ${DISCIPLINE_CONFIG[d].color} text-white scale-105 shadow-lg` 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl mb-1">{DISCIPLINE_CONFIG[d].icon}</span>
              <span className="text-xs font-bold uppercase">{d}</span>
            </button>
          ))}
        </div>
      </section>

      {discipline && config && (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-club-primary appearance-none"
                required
              />
            </div>
            
            {config.hasDuration && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Durée (minutes)</label>
                <input 
                  type="number" 
                  value={duration} 
                  onChange={e => setDuration(e.target.value)}
                  placeholder="ex: 90"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-club-primary"
                  required
                />
              </div>
            )}

            {config.hasDistance && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Distance (km)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={distance} 
                  onChange={e => setDistance(e.target.value)}
                  placeholder="ex: 3.5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-club-primary"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Intensité de l'effort (RPE 1-10)</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={rpe} 
                onChange={e => setRpe(parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: 'var(--club-primary)' }}
              />
              <span 
                className="w-12 h-12 flex items-center justify-center text-white rounded-xl font-bold text-xl shrink-0"
                style={{ backgroundColor: 'var(--club-primary)' }}
              >
                {rpe}
              </span>
            </div>
          </div>

          {config.workTypes.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">Type de travail (choix multiples)</label>
              <div className="flex flex-wrap gap-2">
                {config.workTypes.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleWorkType(type)}
                    className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all flex items-center gap-2 ${
                      selectedWorkTypes.includes(type)
                        ? 'text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                    style={selectedWorkTypes.includes(type) ? { backgroundColor: 'var(--club-primary)', borderColor: 'var(--club-primary)' } : {}}
                  >
                    {selectedWorkTypes.includes(type) && <CheckIcon className="w-4 h-4" />}
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {discipline === 'Prépa Physique' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Focus de la séance</label>
              <input 
                type="text" 
                value={focus} 
                onChange={e => setFocus(e.target.value)}
                placeholder="ex: Force / Explosivité"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-club-primary"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Notes</label>
            <textarea 
              value={notes} 
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-club-primary h-24"
              placeholder="Sensations, détails..."
            />
          </div>

          <button 
            type="submit" 
            className="w-full text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--club-secondary)' }}
          >
            <CheckIcon className="w-5 h-5" />
            {initialSession ? 'Mettre à jour' : 'Enregistrer'}
          </button>
        </form>
      )}
    </div>
  );
};

export default SessionForm;
