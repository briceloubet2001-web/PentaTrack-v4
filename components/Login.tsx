
import React, { useState, useEffect } from 'react';
import { UserRole, ClubInfo } from '../types';
import { ShieldCheckIcon, UserIcon, IdentificationIcon } from '@heroicons/react/24/outline';
import { supabase } from '../supabaseClient';

interface LoginProps {
  availableClubs: ClubInfo[];
  onLoginSuccess: () => void;
  externalError?: string | null;
}

const Login: React.FC<LoginProps> = ({ availableClubs, onLoginSuccess, externalError }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<UserRole>('athlete');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedClubName, setSelectedClubName] = useState('');
  const [coachCodeInput, setCoachCodeInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialiser le club par défaut une fois que les clubs sont chargés
  useEffect(() => {
    if (availableClubs.length > 0 && !selectedClubName) {
      setSelectedClubName(availableClubs[0].name);
    }
  }, [availableClubs]);

  const displayError = externalError || error;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegistering) {
      // Vérification dynamique du code coach par club
      if (role === 'coach') {
        const selectedClub = availableClubs.find(c => c.name === selectedClubName);
        if (!selectedClub || coachCodeInput !== selectedClub.coach_secret) {
          setError(`Code d'accès invalide pour le club ${selectedClubName}.`);
          setLoading(false);
          return;
        }
      }
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
          }
        }
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            email,
            name,
            club: selectedClubName,
            role,
            active: role === 'coach' // Les coachs sont auto-validés par le code secret
          }
        ]);

        if (profileError) {
          setError("Erreur lors de la création du profil : " + profileError.message);
        } else if (role === 'athlete') {
          setError("Inscription réussie ! En attente de validation par votre coach.");
          setIsRegistering(false);
        } else {
          onLoginSuccess();
        }
      }
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError("Email ou mot de passe incorrect.");
      } else {
        onLoginSuccess();
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className="inline-block bg-blue-600 p-3 rounded-2xl mb-4">
             <IdentificationIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">PentaTrack</h1>
          <p className="text-slate-500">{isRegistering ? 'Créez votre profil' : 'Heureux de vous revoir'}</p>
        </div>

        {displayError && (
          <div className={`p-4 rounded-xl text-sm font-bold mb-6 text-center ${displayError.includes('réussie') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {displayError}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setRole('athlete')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${role === 'athlete' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              <UserIcon className="w-4 h-4" /> Athlète
            </button>
            <button
              type="button"
              onClick={() => setRole('coach')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm transition-all ${role === 'coach' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
            >
              <ShieldCheckIcon className="w-4 h-4" /> Entraîneur
            </button>
          </div>

          {isRegistering && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nom Complet</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Jean Dupont" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Club</label>
                <select 
                  value={selectedClubName} 
                  onChange={e => setSelectedClubName(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {availableClubs.length === 0 ? (
                    <option disabled>Chargement des clubs...</option>
                  ) : (
                    availableClubs.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  )}
                </select>
              </div>
              {role === 'coach' && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Code d'accès Entraîneur ({selectedClubName})</label>
                  <input required type="password" value={coachCodeInput} onChange={e => setCoachCodeInput(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Code secret du club" />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="votre@email.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mot de passe</label>
            <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="••••••••" />
          </div>

          <button 
            type="submit" 
            disabled={loading || (isRegistering && availableClubs.length === 0)}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg mt-4 disabled:bg-slate-400 flex justify-center"
          >
            {loading ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div> : (isRegistering ? "S'inscrire" : "Se connecter")}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <button onClick={() => { setIsRegistering(!isRegistering); setError(''); }} className="text-sm font-bold text-blue-600 hover:text-blue-800">
            {isRegistering ? "J'ai déjà un compte" : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
