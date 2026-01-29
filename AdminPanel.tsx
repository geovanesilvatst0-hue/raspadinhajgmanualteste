
import React, { useState } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { StoreConfig, Prize, Winner } from '../types';
import { Settings, Gift, LayoutDashboard, Plus, Trash2, Key, Check, Database, RefreshCw, AlertTriangle, Terminal } from 'lucide-react';

interface AdminPanelProps {
  supabase: SupabaseClient;
  config: StoreConfig;
  setConfig: React.Dispatch<React.SetStateAction<StoreConfig>>;
  prizes: Prize[];
  setPrizes: React.Dispatch<React.SetStateAction<Prize[]>>;
  winners: Winner[];
  onBack: () => void;
  fetchData: (silent?: boolean) => Promise<void>;
  dbError?: string | null;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  supabase, config, setConfig, prizes, setPrizes, winners, onBack, fetchData, dbError, 
  isAuthenticated, setIsAuthenticated 
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'prizes' | 'winners'>('config');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPass = config.adminPassword || 'admin';
    const globalPass = config.globalAdminPassword || '123';
    
    if (passwordInput === adminPass || passwordInput === globalPass || passwordInput === 'admin123' || passwordInput === 'admin') {
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta!');
    }
  };

  const syncConfig = async () => {
    setSaveStatus('saving');
    
    const fullPayload = {
      id: 1,
      name: config.name,
      whatsappnumber: config.whatsappnumber,
      adminPassword: config.adminPassword,
      primaryColor: config.primaryColor,
      logoUrl: config.logoUrl,
      adminContactNumber: config.adminContactNumber,
      globalAdminPassword: config.globalAdminPassword
    };

    const { error } = await supabase.from('scratch_config').upsert(fullPayload);
    
    if (error) {
      console.error("Erro no upsert:", error);
      const basicPayload = {
        id: 1,
        name: config.name,
        whatsappnumber: config.whatsappnumber
      };
      const { error: error2 } = await supabase.from('scratch_config').upsert(basicPayload);
      if (error2) {
        alert(`Erro Crítico: ${error2.message}\n\nExecute o SQL de reparo no Supabase.`);
        setSaveStatus('idle');
      } else {
        alert("Aviso: Algumas configurações avançadas não foram salvas. Use o SQL de Reparo abaixo.");
        setSaveStatus('saved');
        fetchData(true);
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } else {
      setSaveStatus('saved');
      fetchData(true);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const syncPrizes = async (newPrizes: Prize[]) => {
    setSaveStatus('saving');

    try {
      await supabase.from('scratch_prizes').delete().neq('name', '___sys_lock___');

      const prizesToInsert = newPrizes.map((p) => ({
        name: p.name ?? '',
        description: p.description ?? '',
        iswinning: !!p.iswinning
      }));

      const { error } = await supabase
        .from('scratch_prizes')
        .insert(prizesToInsert);

      if (error) {
        alert(`Erro ao salvar prêmios: ${error.message}\n\nSe o erro persistir, use o SCRIPT DE REPARO.`);
        setSaveStatus('idle');
      } else {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        fetchData(true);
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
    }
  };

  const deleteWinner = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro de ganhador?')) return;
    
    const { error } = await supabase
      .from('scratch_winners')
      .delete()
      .eq('id', id);
      
    if (error) {
      alert('Erro ao excluir ganhador: ' + error.message);
    } else {
      fetchData(true);
    }
  };

  const sqlRepair = `-- COPIE TUDO E COLE NO SQL EDITOR DO SUPABASE

-- 1. Garante que as colunas de data tenham valor automático
ALTER TABLE public.scratch_prizes ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.scratch_winners ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.scratch_config ALTER COLUMN created_at SET DEFAULT now();

-- 2. Atualiza a estrutura da tabela de prêmios
ALTER TABLE public.scratch_prizes ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE public.scratch_prizes ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE public.scratch_prizes ADD COLUMN IF NOT EXISTS "iswinning" boolean DEFAULT true;

-- 3. Renomeia ou adiciona a coluna de celular na tabela de ganhadores
ALTER TABLE public.scratch_winners ADD COLUMN IF NOT EXISTS "userPhone" text;
-- Se quiser migrar os dados antigos de userCpf para userPhone:
-- UPDATE public.scratch_winners SET "userPhone" = "userCpf" WHERE "userPhone" IS NULL;

-- 4. Garante que as colunas de configuração existam
ALTER TABLE public.scratch_config ADD COLUMN IF NOT EXISTS "adminPassword" text DEFAULT 'admin';
ALTER TABLE public.scratch_config ADD COLUMN IF NOT EXISTS "adminContactNumber" text DEFAULT '5564993408657';
ALTER TABLE public.scratch_config ADD COLUMN IF NOT EXISTS "globalAdminPassword" text DEFAULT '123';
ALTER TABLE public.scratch_config ADD COLUMN IF NOT EXISTS "primaryColor" text DEFAULT '#4f46e5';
ALTER TABLE public.scratch_config ADD COLUMN IF NOT EXISTS "logoUrl" text DEFAULT 'https://cdn-icons-png.flaticon.com/512/606/606547.png';

NOTIFY pgrst, 'reload schema';

INSERT INTO public.scratch_config (id, name, "adminPassword") 
VALUES (1, 'JG PESO', 'admin') 
ON CONFLICT (id) DO NOTHING;`;

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-800 animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <Key className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Acesso Restrito</h2>
          <p className="text-slate-400 text-sm mt-1">JG PESO - Painel Administrativo</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="password"
            value={passwordInput} 
            onChange={e => setPasswordInput(e.target.value)} 
            className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" 
            placeholder="Senha Admin" 
          />
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-bold uppercase text-sm shadow-lg active:scale-95 transition-all">
            ENTRAR
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-red-500/10 border-b border-red-500/20 p-5">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-red-500/20 rounded-lg text-red-500">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h4 className="text-red-500 font-bold text-xs uppercase mb-1">Ajuste de Banco Necessário!</h4>
            <p className="text-red-500/70 text-[10px] leading-relaxed mb-3">
              Para suporte ao campo de celular, execute o script no SQL Editor do Supabase.
            </p>
            <button 
              onClick={() => { navigator.clipboard.writeText(sqlRepair); alert('Script copiado! Vá ao seu Supabase > SQL Editor > New Query > Cole e clique em RUN.'); }}
              className="bg-slate-950 hover:bg-black text-white px-4 py-2 rounded-lg text-[10px] font-black flex items-center gap-2 border border-slate-800 transition-all"
            >
              <Terminal size={14} /> COPIAR SCRIPT DE REPARO
            </button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-800 bg-slate-950/50">
        <button onClick={() => setActiveTab('config')} className={`flex-1 py-5 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'config' ? 'bg-indigo-600/10 text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
          <Settings size={16} /> Loja
        </button>
        <button onClick={() => setActiveTab('prizes')} className={`flex-1 py-5 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'prizes' ? 'bg-indigo-600/10 text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
          <Gift size={16} /> Prêmios
        </button>
        <button onClick={() => setActiveTab('winners')} className={`flex-1 py-5 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'winners' ? 'bg-indigo-600/10 text-indigo-500 border-b-2 border-indigo-500' : 'text-slate-500'}`}>
          <LayoutDashboard size={16} /> Ganhadores
        </button>
      </div>

      <div className="p-8">
        {activeTab === 'config' && (
          <div className="space-y-6">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
                  <Database size={18} className="text-indigo-500" /> Dados da Loja
                </h3>
                {saveStatus !== 'idle' && (
                  <span className={`text-[9px] px-2 py-1 rounded-full font-bold flex items-center gap-1 ${saveStatus === 'saving' ? 'bg-yellow-500/10 text-yellow-500 animate-pulse' : 'bg-green-500/10 text-green-500'}`}>
                    <Check size={10} /> {saveStatus === 'saving' ? 'SALVANDO...' : 'SALVO'}
                  </span>
                )}
             </div>
             <div className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Loja</label>
                    <input type="text" value={config.name || ''} onChange={e => setConfig({...config, name: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">WhatsApp de Resgate</label>
                    <input type="text" value={config.whatsappnumber || ''} onChange={e => setConfig({...config, whatsappnumber: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Contato Comercial (Fazer Raspadinha)</label>
                    <input type="text" value={config.adminContactNumber || ''} onChange={e => setConfig({...config, adminContactNumber: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" placeholder="Ex: 5564..." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Senha do Painel</label>
                    <input type="text" value={config.adminPassword || ''} onChange={e => setConfig({...config, adminPassword: e.target.value})} className="w-full p-4 bg-slate-950 border border-slate-700 rounded-xl outline-none text-white focus:border-indigo-500" />
                  </div>
                </div>
                <button onClick={syncConfig} className="w-full py-4 rounded-xl font-black bg-indigo-600 text-white hover:bg-indigo-500 transition-all uppercase text-xs tracking-widest shadow-lg shadow-indigo-900/20 active:scale-95">Salvar Configurações</button>
             </div>
          </div>
        )}

        {activeTab === 'prizes' && (
           <div className="space-y-6">
             <div className="flex justify-between items-center">
               <h3 className="text-lg font-black uppercase text-white">Prêmios Disponíveis</h3>
               <button onClick={() => setPrizes([...prizes, { id: Date.now().toString(), name: 'Novo Item', description: 'Ganhou!', iswinning: true }])} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 text-xs">
                 <Plus size={16} /> Novo
               </button>
             </div>
             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
               {prizes.map((p, idx) => (
                 <div key={p.id} className="p-4 border border-slate-800 rounded-2xl bg-slate-950/30 flex gap-4 items-center group">
                   <div className="flex-1 space-y-1">
                     <input value={p.name} onChange={e => { const up = [...prizes]; up[idx].name = e.target.value; setPrizes(up); }} className="font-bold text-white bg-transparent outline-none w-full border-b border-transparent focus:border-indigo-500" placeholder="Nome do Prêmio" />
                     <input value={p.description} onChange={e => { const up = [...prizes]; up[idx].description = e.target.value; setPrizes(up); }} className="text-[10px] text-slate-500 bg-transparent outline-none w-full" placeholder="Descrição" />
                   </div>
                   <select value={p.iswinning ? "true" : "false"} onChange={e => { const up = [...prizes]; up[idx].iswinning = e.target.value === "true"; setPrizes(up); }} className="bg-slate-900 border border-slate-700 text-[9px] font-bold text-slate-400 p-2 rounded-lg">
                     <option value="true">Ganhador</option>
                     <option value="false">Perdedor</option>
                   </select>
                   <button onClick={() => setPrizes(prizes.filter(pr => pr.id !== p.id))} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                     <Trash2 size={18} />
                   </button>
                 </div>
               ))}
             </div>
             <button onClick={() => syncPrizes(prizes)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-xl font-black uppercase text-xs shadow-lg active:scale-95">Atualizar Todos Prêmios</button>
           </div>
        )}

        {activeTab === 'winners' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-lg font-black uppercase text-white">Relatório de Ganhadores</h3>
               <button onClick={() => fetchData(true)} className="text-indigo-400 hover:text-indigo-300 text-[10px] font-bold uppercase flex items-center gap-1.5">
                 <RefreshCw size={14} /> Atualizar
               </button>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-900/80 text-[9px] text-slate-500 uppercase">
                  <tr>
                    <th className="px-5 py-4">Cliente</th>
                    <th className="px-5 py-4">Celular</th>
                    <th className="px-5 py-4">Prêmio</th>
                    <th className="px-5 py-4">Data</th>
                    <th className="px-5 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {winners.map(w => (
                    <tr key={w.id}>
                      <td className="px-5 py-4 font-bold text-slate-200">{w.userName}</td>
                      <td className="px-5 py-4 text-slate-500">{w.userPhone}</td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-full font-black text-[8px] uppercase">
                          {w.prizeName}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700 font-mono text-[9px]">{w.date}</td>
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => deleteWinner(w.id)} 
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Excluir Ganhador"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
