
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import ScratchCard, { ScratchCardRef } from './components/ScratchCard';
import AdminPanel from './components/AdminPanel';
import { Prize, Winner, StoreConfig, AppView } from './types';
import { INITIAL_PRIZES, INITIAL_CONFIG } from './constants';
import { generatePrizeMessage } from './services/geminiService';
import { Ticket, ChevronRight, AlertCircle, User, Check, RefreshCw, Loader2, PartyPopper, Wand2, Phone } from 'lucide-react';

const SUPABASE_URL = 'https://zhyxwzzcgmuooldwhmvz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ahq1ky6QS5sV7UodPjCmJA_HkZvuoWl';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const isValidPhone = (phone: string = ''): boolean => {
  const cleanPhone = (phone || '').replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('user-form');
  const [config, setConfig] = useState<StoreConfig>(INITIAL_CONFIG);
  const [prizes, setPrizes] = useState<Prize[]>(INITIAL_PRIZES);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const [currentUser, setCurrentUser] = useState({ name: '', phone: '' });
  const [phoneError, setPhoneError] = useState(false);
  const [currentPrize, setCurrentPrize] = useState<Prize | null>(null);
  const [prizeCode, setPrizeCode] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [isScratchingActive, setIsScratchingActive] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCountdown, setSyncCountdown] = useState(3);
  const [isCopied, setIsCopied] = useState(false);
  const [isRedeemed, setIsRedeemed] = useState(false);
  const scratchCardRef = useRef<ScratchCardRef>(null);

  const isClientMode = new URLSearchParams(window.location.search).get('mode') === 'client';

  const fetchData = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const { data: configData, error: configError } = await supabase
        .from('scratch_config')
        .select('*')
        .maybeSingle();
      
      if (configError) {
        if (configError.code === 'PGRST205') setDbError('Tabelas não encontradas');
      } else {
        setDbError(null);
        if (configData) {
          setConfig({
            ...INITIAL_CONFIG,
            ...configData,
            whatsappnumber: configData.whatsappnumber || INITIAL_CONFIG.whatsappnumber
          });
        }
      }

      const { data: prizesData } = await supabase
        .from('scratch_prizes')
        .select('*')
        .order('id', { ascending: true });
      
      if (prizesData && prizesData.length > 0) {
        setPrizes(prizesData);
      }

      const { data: winnersData } = await supabase
        .from('scratch_winners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (winnersData) {
        // Mapeia userCpf para userPhone caso o banco ainda use o nome antigo
        setWinners(winnersData.map(w => ({
          ...w,
          userPhone: w.userPhone || w.userCpf
        })));
      }

      const savedSession = localStorage.getItem('scratch_session');
      if (savedSession) {
        const session = JSON.parse(savedSession);
        setCurrentUser(session.user);
        setCurrentPrize(session.prize);
        setPrizeCode(session.code);
        setIsRevealed(session.revealed);
        setIsScratchingActive(true);
        if (session.aiMessage) setAiMessage(session.aiMessage);
      }

    } catch (e) {
      console.error("Fetch Error:", e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchData(true);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isScratchingActive && currentPrize) {
      const session = {
        user: currentUser,
        prize: currentPrize,
        code: prizeCode,
        revealed: isRevealed,
        aiMessage: aiMessage
      };
      localStorage.setItem('scratch_session', JSON.stringify(session));
    }
  }, [isScratchingActive, currentPrize, isRevealed, currentUser, prizeCode, aiMessage]);

  useEffect(() => {
    let timer: number;
    if (isSyncing && syncCountdown > 0) {
      timer = window.setInterval(() => {
        setSyncCountdown(prev => prev - 1);
      }, 1000);
    } else if (isSyncing && syncCountdown === 0) {
      completeSync();
    }
    return () => clearInterval(timer);
  }, [isSyncing, syncCountdown]);

  const startScratch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(false);
    if (!currentUser.name || !currentUser.phone) return;
    if (!isValidPhone(currentUser.phone)) { setPhoneError(true); return; }
    
    const today = new Date().toLocaleDateString('pt-BR');
    const hasPlayedToday = winners.some(w => {
      if (!w.userPhone || !w.date) return false;
      const playDate = (w.date || '').split(',')[0].trim();
      return w.userPhone === currentUser.phone && playDate === today;
    });
    
    if (hasPlayedToday) { 
      alert("Você já participou hoje! Volte amanhã para tentar a sorte novamente."); 
      return; 
    }

    const pool = prizes.length > 0 ? prizes : INITIAL_PRIZES;
    const randomPrize = pool[Math.floor(Math.random() * pool.length)];
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    
    setCurrentPrize(randomPrize);
    setPrizeCode(code);
    setIsScratchingActive(true);
    setIsRevealed(false);
    setIsSyncing(false);
    setIsRedeemed(false);
    setSyncCountdown(3);
    generatePrizeMessage(randomPrize.name, randomPrize.iswinning).then(setAiMessage);
  };

  const handleRevealComplete = () => {
    if (!isRevealed && !isSyncing) {
      setIsSyncing(true);
    }
  };

  const completeSync = async () => {
    if (currentPrize && !isRevealed) {
      const newWinner = { 
        userName: currentUser.name, 
        userPhone: currentUser.phone, 
        prizeName: currentPrize.name, 
        prizeCode: prizeCode, 
        date: new Date().toLocaleString('pt-BR') 
      };

      // Tenta inserir usando userPhone, se falhar tenta userCpf para compatibilidade
      const { error } = await supabase.from('scratch_winners').insert([newWinner]);
      
      if (error) {
        // Fallback para colunas antigas se o SQL de reparo ainda não foi rodado
        await supabase.from('scratch_winners').insert([{
          userName: currentUser.name,
          userCpf: currentUser.phone,
          prizeName: currentPrize.name,
          prizeCode: prizeCode,
          date: new Date().toLocaleString('pt-BR')
        }]);
      }
      
      setIsSyncing(false);
      setIsRevealed(true);
    }
  };

  const handleRedeem = () => {
    window.open(whatsappLink, '_blank');
    setIsRedeemed(true);
    localStorage.removeItem('scratch_session');
  };

  const resetAll = () => {
    if (isRevealed && currentPrize?.iswinning && !isRedeemed) {
      if (!confirm("Você tem um prêmio vencedor pendente! Tem certeza que deseja limpar?")) return;
    }
    localStorage.removeItem('scratch_session');
    setCurrentUser({ name: '', phone: '' });
    setPhoneError(false);
    setIsScratchingActive(false);
    setIsRevealed(false);
    setIsSyncing(false);
    setIsRedeemed(false);
    setCurrentPrize(null);
    setAiMessage('');
  };

  const shareApp = async () => {
    const baseUrl = window.location.href.split('?')[0];
    const finalUrl = `${baseUrl}?mode=client`;
    const shareText = `🎟️ Raspadinha da ${config.name}\n\nTente a sorte agora e ganhe prêmios! 🎁\n\nLink: ${finalUrl}`;
    
    try {
      await navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const salesWhatsappLink = `https://wa.me/${(config.adminContactNumber || '5564993408657').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Vi a raspadinha digital da loja ${config.name} e gostaria de saber como faço para ter uma igual para o meu negócio!`)}`;
  const whatsappLink = `https://wa.me/${(config.whatsappnumber || '').replace(/\D/g, '')}?text=${encodeURIComponent(`🎟️ RESGATE - ${config.name}\n👤 Cliente: ${currentUser.name}\n📱 Celular: ${currentUser.phone}\n🎁 Prêmio: ${currentPrize?.name}\n🔑 Código: ${prizeCode}`)}`;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4">
        <RefreshCw className="animate-spin text-indigo-500" size={48} />
        <p className="text-slate-400 font-bold animate-pulse">Sincronizando com o Banco...</p>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <div className="p-4 md:p-10 max-w-5xl mx-auto">
        <button onClick={() => setView('user-form')} className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white group transition-colors">
          <div className="p-2 rounded-full bg-slate-800 group-hover:bg-slate-700"><ChevronRight className="rotate-180" size={16} /></div>
          <span className="font-bold text-sm">Sair do Admin</span>
        </button>
        <AdminPanel 
          supabase={supabase}
          config={config} 
          setConfig={setConfig} 
          prizes={prizes} 
          setPrizes={setPrizes} 
          winners={winners} 
          fetchData={fetchData}
          dbError={dbError}
          onBack={() => setView('user-form')}
          isAuthenticated={isAdminAuthenticated}
          setIsAuthenticated={setIsAdminAuthenticated}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="w-full max-w-[480px] space-y-4">
        <header className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Ticket className="text-pink-500 fill-pink-500" size={20} />
            <h1 className="text-xl font-bold tracking-tight">
              Raspadinha da <span className="text-indigo-400">{config.name}</span>
            </h1>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Válido para 1 participação diária por Celular. Raspe até o fim e resgate no WhatsApp.
          </p>
        </header>

        <div className="scratch-container rounded-2xl p-5 space-y-5">
          <form onSubmit={startScratch} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Nome Completo</label>
                <input 
                  disabled={isScratchingActive} 
                  required 
                  type="text" 
                  value={currentUser.name} 
                  onChange={e => setCurrentUser({...currentUser, name: e.target.value})} 
                  className="custom-input w-full px-4 py-3 rounded-xl outline-none transition-all font-medium" 
                  placeholder="Seu Nome" 
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">WhatsApp / Celular</label>
                  {phoneError && <span className="text-[10px] text-red-500 flex items-center gap-1 font-bold animate-pulse"><AlertCircle size={10} /> INVÁLIDO</span>}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"><Phone size={14} /></span>
                  <input 
                    disabled={isScratchingActive} 
                    required 
                    type="tel" 
                    value={currentUser.phone} 
                    onChange={e => { 
                      setCurrentUser({...currentUser, phone: (e.target.value || '').replace(/\D/g, '')}); 
                      if(phoneError) setPhoneError(false); 
                    }} 
                    className={`custom-input w-full pl-10 pr-4 py-3 rounded-xl outline-none transition-all font-medium ${phoneError ? 'border-red-500 ring-1 ring-red-500/20' : ''}`} 
                    placeholder="(00) 00000-0000" 
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="submit" disabled={isScratchingActive} className={`py-3 rounded-xl font-bold text-sm custom-button flex items-center justify-center gap-2 ${isScratchingActive ? 'opacity-50' : 'text-white bg-indigo-600 border-indigo-500 active:scale-95'}`}>
                {isScratchingActive ? 'Em jogo...' : 'Começar Agora'}
              </button>
              <button type="button" onClick={resetAll} className="py-3 rounded-xl font-bold text-sm custom-button text-slate-400 active:scale-95">Limpar Tudo</button>
            </div>
          </form>
        </div>

        <div className="scratch-container rounded-2xl p-4">
          {isScratchingActive && currentPrize ? (
            <ScratchCard ref={scratchCardRef} prize={currentPrize} onComplete={handleRevealComplete} primaryColor={config.primaryColor} initialRevealed={isRevealed} />
          ) : (
            <div className="w-full aspect-video bg-slate-900/50 rounded-xl flex items-center justify-center border border-dashed border-slate-700">
              <span className="text-slate-600 font-bold uppercase tracking-widest text-xs text-center px-6">Preencha seus dados para começar a raspar</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <button 
              onClick={handleRedeem} 
              disabled={!isRevealed || !currentPrize?.iswinning} 
              className={`py-3.5 rounded-xl text-[10px] font-bold uppercase custom-button ${(!isRevealed || !currentPrize?.iswinning) ? 'opacity-40 grayscale' : 'text-slate-200 active:scale-95 bg-green-600 border-green-500 shadow-lg shadow-green-900/20'}`}
            >
              {isRedeemed ? 'Resgatado!' : 'Quero resgatar'}
            </button>
            <button 
              onClick={shareApp} 
              className={`py-3.5 rounded-xl text-[10px] font-bold uppercase custom-button flex items-center justify-center gap-1.5 transition-all ${isCopied ? 'text-green-400 border-green-500/30' : 'text-slate-400'} active:scale-95`}
            >
              {isCopied ? <Check size={14} /> : null}
              {isCopied ? 'Copiado' : 'Compartilhar'}
            </button>
            <button 
              onClick={() => { if(!isSyncing) scratchCardRef.current?.reveal(); }} 
              disabled={!isScratchingActive || isRevealed || isSyncing} 
              className={`py-3.5 rounded-xl text-[10px] font-bold uppercase custom-button ${(!isScratchingActive || isRevealed || isSyncing) ? 'opacity-40' : 'text-slate-400 active:scale-95'}`}
            >
              Revelar
            </button>
          </div>

          <button 
            onClick={() => window.open(salesWhatsappLink, '_blank')}
            className="w-full py-4 rounded-xl text-[11px] font-black uppercase custom-button text-indigo-400 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Wand2 size={16} />
            Quero fazer minha própria raspadinha
          </button>
        </div>

        {isSyncing && (
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3 flex items-center justify-between animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3">
              <Loader2 className="text-indigo-500 animate-spin" size={18} />
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Validando prêmio no sistema...</span>
            </div>
            <span className="text-lg font-black text-indigo-500 font-mono">{syncCountdown}s</span>
          </div>
        )}

        {isRedeemed && (
          <div className="bg-green-600/10 border border-green-500/20 rounded-xl p-4 flex flex-col items-center gap-2 animate-in zoom-in duration-500">
            <PartyPopper className="text-green-500" size={24} />
            <p className="text-center text-xs font-bold text-green-400 uppercase leading-relaxed">Parabéns! Seu resgate foi solicitado via WhatsApp. Apresente o código no balcão!</p>
          </div>
        )}

        {(isRevealed || isSyncing) && aiMessage && !isRedeemed && (
          <div className="text-center animate-in fade-in slide-in-from-top-2 duration-700 py-2">
            <p className="text-sm text-indigo-400 italic font-medium leading-relaxed">"{aiMessage}"</p>
          </div>
        )}
      </div>

      {!isClientMode && (
        <button 
          onClick={() => setView('admin')} 
          className="fixed bottom-6 right-6 p-3 rounded-full bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-all shadow-xl backdrop-blur-md border border-slate-700"
        >
          <User size={20} />
        </button>
      )}
    </div>
  );
};

export default App;
