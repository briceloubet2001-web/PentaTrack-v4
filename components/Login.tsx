
import React, { useState } from 'react';
import { User, UserRole, Club } from '../types';
import { ShieldCheckIcon, UserIcon, IdentificationIcon } from '@heroicons/react/24/outline';

interface LoginProps {
  onLogin: (user: User) => void;
}

const COACH_CODE = "PENTA2026_COACH";

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState<UserRole>('athlete');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [club, setClub] = useState<Club>('RMA');
  const [coachCodeInput, setCoachCodeInput] = useState('');
  const [error, setError] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const savedUsers: User[] = JSON.parse(localStorage.getItem('pentatrack_users') || '[]');

    if (isRegistering) {
      if (role === 'coach' && coachCodeInput !== COACH_CODE) {
        setError("Code coach invalide.");
        return;
      }
      
      if (savedUsers.find(u => u.email === email)) {
        setError("Cet email est déjà utilisé.");
        return;
      }

      const newUser: User = {
        id: Math.random().toString(36).substring(7),
        email,
        password, // In a real app, hash this
        name,
        club,
        role,
        active: role === 'coach' // Coaches are active by default
      };

      const updatedUsers = [...savedUsers, newUser];
      localStorage.setItem('pentatrack_users', JSON.stringify(updatedUsers));
      
      if (role === 'athlete') {
        setError("Inscription réussie ! En attente de validation par votre coach.");
        setIsRegistering(false);
      } else {
        onLogin(newUser);
      }
    } else {
      const user = savedUsers.find(u => u.email === email && u.password === password);
      if (!user) {
        setError("Email ou mot de passe incorrect.");
        return;
      }
      if (user.role === 'athlete' && !user.active) {
        setError("Votre compte n'a pas encore été validé par votre coach.");
        return;
      }
      onLogin(user);
    }
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

        {error && (
          <div className={`p-4 rounded-xl text-sm font-bold mb-6 text-center ${error.includes('réussie') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {error}
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
                <select value={club} onChange={e => setClub(e.target.value as Club)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="RMA">RMA</option>
                  <option value="SALANQUE">SALANQUE</option>
                </select>
              </div>
              {role === 'coach' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Code d'accès Entraîneur</label>
                  <input required type="password" value={coachCodeInput} onChange={e => setCoachCodeInput(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Code secret" />
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

          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg mt-4">
            {isRegistering ? "S'inscrire" : "Se connecter"}
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
