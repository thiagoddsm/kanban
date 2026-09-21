import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { AIService, AIMessage } from '../services/aiService';
import { useTenant } from './TenantContext';
import { useNotification } from './NotificationContext';
import { BrowserSpeechProvider, SpeechProvider } from '../services/speechService';

type AIStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AIContextProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  status: AIStatus;
  isListening: boolean;
  messages: AIMessage[];
  sendMessage: (text: string) => Promise<void>;
  toggleListening: () => void;
  clearHistory: () => void;
}

const AIContext = createContext<AIContextProps | undefined>(undefined);

export const AIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const { error: notifyError } = useNotification();
  
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<AIStatus>('idle');
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg_sys_1',
      role: 'assistant',
      content: 'Olá! Sou o assistente Oiko IA. Como posso ajudar com a gestão da sua igreja hoje?',
      timestamp: new Date().toISOString()
    }
  ]);

  const speechProviderRef = useRef<SpeechProvider>(new BrowserSpeechProvider());

  // Interrompe o áudio se o modal for fechado
  useEffect(() => {
    if (!isOpen) {
      speechProviderRef.current.stopSpeaking();
      speechProviderRef.current.stopListening();
      setIsListening(false);
      if (status === 'speaking' || status === 'listening') setStatus('idle');
    }
  }, [isOpen]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !currentOrganization?.id) return;

    speechProviderRef.current.stopSpeaking(); // Corta a IA se o usuário mandar nova msg

    const userMsg: AIMessage = {
      id: 'msg_u_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setStatus('thinking');

    try {
      const recentHistory = messages.slice(-10);
      const responseMsg = await AIService.sendMessage(text, currentOrganization.id, recentHistory);
      
      setMessages(prev => [...prev, responseMsg]);
      
      // Responde em áudio
      setStatus('speaking');
      await speechProviderRef.current.speak(responseMsg.content);
      setStatus('idle');
    } catch (err) {
      notifyError('Erro de IA', 'Não consegui processar o comando agora.');
      setMessages(prev => [...prev, {
        id: 'msg_e_' + Date.now(),
        role: 'assistant',
        content: 'Desculpe, enfrentei um problema técnico de comunicação. Tente novamente.',
        timestamp: new Date().toISOString()
      }]);
      setStatus('idle');
    }
  };

  const toggleListening = () => {
    const provider = speechProviderRef.current;
    
    if (isListening) {
      provider.stopListening();
      setIsListening(false);
      setStatus('idle');
    } else {
      provider.stopSpeaking(); // Interrompe fala atual se houver
      setIsListening(true);
      setStatus('listening');
      
      provider.listen(
        (text) => {
          setIsListening(false);
          sendMessage(text);
        },
        (err) => {
          console.warn("Erro no reconhecimento de voz:", err);
          setIsListening(false);
          setStatus('idle');
          if (err !== 'no-speech') {
             notifyError('Voz', 'Não consegui entender, ou o microfone está bloqueado.');
          }
        },
        () => {
          setIsListening(false);
          if (status === 'listening') setStatus('idle');
        }
      );
    }
  };

  const clearHistory = () => {
    speechProviderRef.current.stopSpeaking();
    setMessages([
      {
        id: 'msg_sys_2',
        role: 'assistant',
        content: 'Histórico limpo. Em que mais posso ajudar?',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  return (
    <AIContext.Provider value={{ isOpen, setIsOpen, status, isListening, messages, sendMessage, toggleListening, clearHistory }}>
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) throw new Error('useAI deve ser usado dentro de um AIProvider');
  return context;
};
