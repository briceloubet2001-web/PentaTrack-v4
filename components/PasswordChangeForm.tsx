
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { KeyIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface PasswordChangeFormProps {
  userId: string;
  onSuccess: () => void;
  onCancel?: () => void;
  isForced?: boolean;
  primaryColor?: string;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ 
  userId, 
  onSuccess, 
  onCancel, 
  isForced = false,
  primaryColor = '#F59E0B'
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      // 1. Mettre à jour dans Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (authError) throw authError;

      // 2. Mettre à jour la date dans le profil public
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_last_changed_at: new Date().toISOString() })
        .eq('id', userId);

      if (profileError) throw profileError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-in zoom-in duration-300">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckCircleIcon className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Mot de passe mis à jour !</h3>
        <p className="text-slate-500 text-center">Vos accès sont désormais sécurisés.</p>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white rounded-3xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isForced ? 'max-w-md mx-auto mt-20' : ''}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
          <KeyIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">
            {isForced ? 'Mise à jour de sécurité' : 'Changer mon mot de passe'}
          </h3>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
            {isForced ? 'Requis tous les 30 jours' : 'Sécurisez votre compte'}
          </p>
        </div>
      </div>

      {isForced && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-700 leading-relaxed">
          Pour la sécurité de vos données sportives et médicales, l'accès à l'application nécessite le renouvellement périodique de votre mot de passe.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Nouveau mot de passe</label>
          <div className="relative">
            <input 
              required 
              type={showPassword ? "text" : "password"} 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 focus:ring-2 outline-none" 
              style={{ '--tw-ring-color': primaryColor } as any} 
              placeholder="••••••••" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400"
            >
              {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Confirmer le mot de passe</label>
          <input 
            required 
            type={showPassword ? "text" : "password"} 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 outline-none" 
            style={{ '--tw-ring-color': primaryColor } as any} 
            placeholder="••••••••" 
          />
        </div>

        <div className="flex gap-3 pt-4">
          {!isForced && onCancel && (
            <button 
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-200 transition-all"
            >
              Annuler
            </button>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className={`flex-[2] text-white font-bold py-4 rounded-xl shadow-lg flex justify-center items-center gap-2 disabled:bg-slate-400`}
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div> : "Valider le changement"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordChangeForm;
