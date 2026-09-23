import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mic, MicOff, Volume2, Shield, Activity, Cpu, Crosshair, X, Square } from 'lucide-react';
import { useAI } from '../context/AIContext';
import { useAuth } from '../context/AuthContext';

export const AILiveModePage: React.FC = () => {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { currentUser } = useAuth();
  const {
    isListening,
    status,
    stopAudio,
    isLiveMode,
    toggleLiveMode,
    clearHistory
  } = useAI();

  // Custom states for the HUD
  const [hudText, setHudText] = useState("AGUARDANDO INSTRUÇÕES...");
  const [hz, setHz] = useState("432.4");

  useEffect(() => {
    if (status === 'speaking') setHudText("TRANSMITINDO DADOS...");
    else if (status === 'thinking') setHudText("PROCESSANDO SINAIS...");
    else if (isListening) setHudText("ESCUTANDO...");
    else setHudText("AGUARDANDO INSTRUÇÕES...");
  }, [status, isListening]);

  // Efeito simulando flutuação da frequência da rede neural
  useEffect(() => {
    const interval = setInterval(() => {
      setHz((Math.random() * 50 + 400).toFixed(1));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleMicToggle = () => {
    toggleLiveMode();
  };

  const handleClose = () => {
    stopAudio();
    navigate(`/${orgSlug}/dashboard`);
  };

  return (
    <div className="min-h-screen h-screen w-full bg-[#020617] text-cyan-500 font-mono flex flex-col relative overflow-hidden select-none">
      
      {/* Background Grid Pattern (Subtle) */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #06b6d4 1px, transparent 0)', backgroundSize: '24px 24px' }}
      />

      {/* Top Bar */}
      <div className="p-6 flex flex-col items-center tracking-widest text-xs z-10 pt-8 sm:pt-10">
        <div className="w-full flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-400 text-sm">J.A.R.V.I.S. // ONLINE</span>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span className="text-cyan-600/60 font-bold">MK-VII</span>
            <button onClick={handleClose} className="p-2.5 bg-cyan-950/30 border border-cyan-800/50 rounded-full text-cyan-400 hover:bg-cyan-900/50 hover:text-cyan-300 transition-colors backdrop-blur-md">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="text-cyan-600/70 mt-2 font-medium">
          REDE NEURAL ATIVA // {hz} HZ
        </div>
      </div>

      {/* Central Core UI */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-0 mt-[-5vh]">
        {/* The Jarvis Core Container */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
          
          {/* Outer Dashed Ring */}
          <div className={`absolute inset-0 border-[2px] border-dashed rounded-full transition-all duration-[3000ms] ${
            isLiveMode ? 'border-cyan-500/60 animate-[spin_10s_linear_infinite]' : 'border-cyan-800/40 animate-[spin_30s_linear_infinite]'
          }`} />
          
          {/* Middle Decorative Ring */}
          <div className="absolute inset-6 border border-cyan-600/30 rounded-full animate-[spin_20s_linear_infinite_reverse]" style={{ borderTopColor: 'transparent', borderLeftColor: 'transparent' }} />
          
          {/* Inner Pulsing Ring */}
          <div className={`absolute inset-10 border border-cyan-400/20 rounded-full transition-all duration-700 ${
            status === 'speaking' ? 'animate-ping opacity-30' : 'opacity-0'
          }`} />

          {/* Core Glow Back */}
          <div className={`absolute inset-14 rounded-full bg-cyan-950/50 border backdrop-blur-md transition-all duration-500 flex items-center justify-center ${
            status === 'speaking' ? 'shadow-[0_0_120px_rgba(6,182,212,0.7)] border-cyan-400/50 scale-105' :
            status === 'thinking' ? 'shadow-[0_0_80px_rgba(168,85,247,0.4)] border-purple-500/40' :
            isListening ? 'shadow-[0_0_100px_rgba(6,182,212,0.5)] border-cyan-500/40 scale-100' :
            'shadow-[0_0_40px_rgba(6,182,212,0.15)] border-cyan-800/30 scale-95'
          }`}>
            
            {/* Inner Bright Core Center */}
            <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full transition-all duration-300 ${
              status === 'speaking' ? 'bg-cyan-400 shadow-[0_0_80px_rgba(34,211,238,1)]' :
              status === 'thinking' ? 'bg-purple-500 shadow-[0_0_60px_rgba(168,85,247,0.8)] animate-pulse' :
              isListening ? 'bg-cyan-500 shadow-[0_0_60px_rgba(6,182,212,0.8)]' :
              'bg-cyan-800/80 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
            }`}>
              {/* Inner details of the core */}
              <div className="w-full h-full rounded-full border-[4px] border-cyan-200/20 animate-[spin_5s_linear_infinite]" style={{ borderBottomColor: 'transparent' }} />
            </div>

          </div>
        </div>

        {/* Core Text */}
        <div className="mt-14 flex flex-col items-center gap-3 text-center tracking-widest">
          <span className="text-cyan-300/90 text-sm sm:text-base font-medium uppercase">Pronto, {currentUser?.name?.split(' ')[0] || 'Usuário'}</span>
          <span className={`text-xs sm:text-sm transition-colors ${
            status === 'speaking' ? 'text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' :
            status === 'thinking' ? 'text-purple-400 font-bold' :
            isListening ? 'text-cyan-300 font-medium' :
            'text-cyan-700'
          }`}>{hudText}</span>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="pb-8 px-6 flex flex-col items-center gap-8 z-10">
        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-8 w-full max-w-sm relative">
          
          <button onClick={clearHistory} className="p-3 text-cyan-800 hover:text-cyan-500 transition-colors" title="Limpar Memória de Sessão">
            <Activity className="w-6 h-6" />
          </button>

          {/* Main Mic / Live Button */}
          <div className="relative">
            {/* Glowing effect behind mic */}
            {isLiveMode && (
              <div className="absolute inset-0 bg-cyan-500/30 rounded-full blur-xl animate-pulse" />
            )}
            
            <button 
              onClick={handleMicToggle}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
                isLiveMode 
                  ? 'bg-cyan-500 text-slate-900 shadow-[0_0_40px_rgba(6,182,212,0.8)] scale-110' 
                  : 'bg-slate-900 text-cyan-600 border border-cyan-800/60 hover:border-cyan-500/80 hover:text-cyan-400 hover:scale-105'
              }`}
            >
              {isLiveMode ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
            </button>
          </div>

          <button onClick={stopAudio} className={`p-3 transition-colors ${status === 'speaking' ? 'text-rose-500 hover:text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'text-cyan-800 hover:text-cyan-500'}`} title="Parar Áudio">
            {status === 'speaking' ? <Square className="w-6 h-6 fill-current" /> : <Volume2 className="w-6 h-6" />}
          </button>
        </div>

        <span className={`text-[10px] sm:text-xs tracking-[0.2em] font-medium transition-colors ${isLiveMode ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-cyan-800'}`}>
          {isLiveMode ? 'MODO AO VIVO ATIVADO' : 'TOQUE PARA ATIVAR'}
        </span>
      </div>

      {/* Bottom Fake Tabs */}
      <div className="flex items-center justify-between px-6 pb-8 pt-6 border-t border-cyan-900/40 text-[9px] sm:text-[10px] tracking-widest text-cyan-700/80 bg-slate-950/50 backdrop-blur-sm z-10">
        <div className="flex flex-col items-center gap-1.5 hover:text-cyan-400 hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] cursor-pointer transition-all">
          <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>CORE HUD</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 hover:text-cyan-400 hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] cursor-pointer transition-all">
          <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>DIAGNOSTICS</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 hover:text-cyan-400 hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] cursor-pointer transition-all">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>DEFENSE</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 hover:text-cyan-400 hover:drop-shadow-[0_0_5px_rgba(34,211,238,0.5)] cursor-pointer transition-all">
          <Crosshair className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>ARMOR</span>
        </div>
      </div>
    </div>
  );
};
