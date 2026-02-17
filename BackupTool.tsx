import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import { 
  ArrowDownTrayIcon, 
  CircleStackIcon, 
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface BackupToolProps {
  onBackupComplete?: () => void;
}

const BackupTool: React.FC<BackupToolProps> = ({ onBackupComplete }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [useServiceRole, setUseServiceRole] = useState(false);
  const [serviceRoleKey, setServiceRoleKey] = useState('');

  const fetchDataRecursively = async (client: any, table: string) => {
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;

    setStatus(`Récupération : ${table}...`);

    while (true) {
      const { data, error } = await client
        .from(table)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error(`Erreur sur ${table}:`, error);
        throw error;
      }

      if (!data || data.length === 0) break;

      allData.push(...data);
      setStatus(`Récupération : ${table} (${allData.length} lignes)...`);
      
      if (data.length < pageSize) break;
      page++;
    }

    return allData;
  };

  const generateBackup = async () => {
    setLoading(true);
    setStatus('Initialisation...');
    
    try {
      const supabaseUrl = 'https://xshmjbkhrtvtiflstvug.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaG1qYmtocnR2dGlmbHN0dnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NjY3MjIsImV4cCI6MjA4NjA0MjcyMn0.lhk42DnYo2ffo_mWZDv07r6ybRfq7onfbZJW0fD6gwY';
      
      const clientKey = useServiceRole && serviceRoleKey.trim() ? serviceRoleKey : anonKey;
      const backupClient = createClient(supabaseUrl, clientKey);

      const zip = new JSZip();
      const dateStr = new Date().toISOString().split('T')[0];
      const folder = zip.folder(`pentatrack_backup_${dateStr}`);

      const tables = ['profiles', 'training_sessions', 'clubs'];
      
      for (const table of tables) {
        const data = await fetchDataRecursively(backupClient, table);
        folder?.file(`${table}.json`, JSON.stringify(data, null, 2));
      }

      setStatus('Compression de l\'archive...');
      const content = await zip.generateAsync({ type: 'blob' });
      
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pentatrack_full_backup_${dateStr}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setStatus('Sauvegarde terminée avec succès !');
      onBackupComplete?.();
      setTimeout(() => setStatus(''), 5000);
    } catch (err: any) {
      setStatus(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
          <CircleStackIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">Maintenance & Sauvegarde</h3>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Outil d'exportation API (Méthode B)</p>
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed border border-slate-100">
        Cet outil génère une archive JSON contenant l'intégralité des données accessibles (Athlètes, Sessions, Configuration Club). 
        <br/><strong className="text-slate-900">Note :</strong> Les données sont extraites par blocs de 1000 pour garantir un backup complet.
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input 
            type="checkbox" 
            checked={useServiceRole} 
            onChange={(e) => setUseServiceRole(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-600 transition-colors">
            Utiliser une "Service Role Key" (Export Total)
          </span>
        </label>

        {useServiceRole && (
          <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-xs text-amber-700">
              <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
              <p>
                Collez votre clé secrète Supabase (service_role) pour bypasser les restrictions. 
                Cette clé reste uniquement en mémoire vive.
              </p>
            </div>
            <input 
              type="password"
              placeholder="Collez votre SERVICE_ROLE_KEY ici..."
              value={serviceRoleKey}
              onChange={(e) => setServiceRoleKey(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        )}
      </div>

      <button 
        onClick={generateBackup}
        disabled={loading}
        className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg disabled:bg-slate-300"
      >
        {loading ? (
          <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
        ) : (
          <ArrowDownTrayIcon className="w-5 h-5" />
        )}
        {loading ? 'Extraction en cours...' : 'Générer l\'archive de sauvegarde (.zip)'}
      </button>

      {status && (
        <div className={`text-center text-xs font-bold uppercase tracking-widest animate-pulse ${status.includes('Erreur') ? 'text-red-500' : 'text-blue-500'}`}>
          {status}
        </div>
      )}
    </div>
  );
};

export default BackupTool;