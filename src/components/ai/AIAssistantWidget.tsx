import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '../../context/AIContext';
import { Sparkles, X, Send, Mic, Trash2, Bot, User } from 'lucide-react';

export const AIAssistantWidget: React.FC = () => {
  const { isOpen, setIsOpen, messages, status, isListening, toggleListening, sendMessage, clearHistory } = useAI();
  const [input, setInput] = useState('');
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status !== 'thinking') {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="fixed bottom-20 right-6 w-[380px] h-[600px] max-h-[80vh] bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl flex flex-col z-50 overflow-hidden animate-fade-in shadow-indigo-500/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            status === 'thinking' ? 'bg-indigo-500 animate-pulse text-white' : 'bg-slate-800 text-indigo-400'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Oiko IA</h3>
            <p className="text-[10px] text-slate-400">
              {status === 'thinking' ? 'Processando...' : 'Agente Assistente'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={clearHistory}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-rose-400 transition-colors"
            title="Limpar Histórico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400 border border-slate-700'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
            }`}>
              {msg.content}
              {msg.data?.taskId && (
                <div className="mt-2 text-xs bg-indigo-900/40 p-2 rounded-lg border border-indigo-500/30 flex items-center gap-1 text-indigo-300">
                  <span className="font-semibold block">Ação Executada:</span>
                  Criou tarefa
                </div>
              )}
            </div>
          </div>
        ))}
        {status === 'thinking' && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 relative">
        {status === 'listening' && (
           <div className="absolute -top-6 left-0 right-0 flex justify-center">
              <span className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full animate-pulse shadow-lg shadow-indigo-500/30">
                Ouvindo...
              </span>
           </div>
        )}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Fale agora..." : "Peça algo ao Oiko IA..."}
            disabled={status === 'thinking'}
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-4 pr-24 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
          />
          <div className="absolute right-1 flex items-center gap-1">
            <button 
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl transition-colors ${
                isListening 
                  ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30' 
                  : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50'
              }`}
              title={isListening ? "Parar de ouvir" : "Falar (Voz)"}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button 
              type="submit"
              disabled={!input.trim() || status === 'thinking' || isListening}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
