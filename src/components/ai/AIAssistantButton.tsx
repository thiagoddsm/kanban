import React from 'react';
import { useAI } from '../../context/AIContext';
import { Sparkles } from 'lucide-react';

export const AIAssistantButton: React.FC = () => {
  const { isOpen, setIsOpen, status } = useAI();

  if (isOpen) return null;

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all z-40 group"
      title="Abrir Oiko IA"
    >
      <Sparkles className={`w-6 h-6 transition-transform group-hover:rotate-12 ${status === 'thinking' ? 'animate-pulse' : ''}`} />
      
      {/* Indicador de status se estiver fechado mas processando */}
      {status === 'thinking' && (
        <span className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-slate-900 animate-pulse" />
      )}
    </button>
  );
};
