export interface SpeechProvider {
  /** Inicia a escuta do microfone e retorna o texto reconhecido através de um callback */
  listen(onResult: (text: string) => void, onError: (err: any) => void, onEnd: () => void): void;
  
  /** Para a escuta manualmente */
  stopListening(): void;
  
  /** Fala o texto fornecido */
  speak(text: string): Promise<void>;
  
  /** Interrompe qualquer fala em andamento */
  stopSpeaking(): void;
}

export class BrowserSpeechProvider implements SpeechProvider {
  private recognition: any = null;
  private synthesis: SpeechSynthesis = window.speechSynthesis;

  constructor() {
    // Inicializa o SpeechRecognition compatível com Chrome/Safari
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'pt-BR';
      this.recognition.continuous = false; // Escuta uma frase e para
      this.recognition.interimResults = false;
    }
  }

  listen(onResult: (text: string) => void, onError: (err: any) => void, onEnd: () => void): void {
    if (!this.recognition) {
      onError(new Error("Reconhecimento de voz não suportado neste navegador."));
      return;
    }

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event: any) => {
      onError(event.error);
    };

    this.recognition.onend = () => {
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      onError(e);
    }
  }

  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        resolve(); // Ignora se não houver suporte sem quebrar o app
        return;
      }

      // Remove markdown para a fala ficar natural (asteriscos, tralhas, etc)
      const cleanText = text
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
        .replace(/(\*|_)(.*?)\1/g, '$2')   // Remove italic
        .replace(/#+\s/g, '')               // Remove headers
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
        .replace(/`{1,3}[^`]*`{1,3}/g, 'código') // Replace code blocks with "código"
        .replace(/[-*]\s/g, '') // Remove list bullets
        .replace(/>\s/g, ''); // Remove blockquotes

      this.stopSpeaking(); // Corta fala anterior

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pt-BR';
      
      // Procura voz feminina agradável em PT-BR (Google/Microsoft) se disponível
      const voices = this.synthesis.getVoices();
      const ptVoice = voices.find(v => v.lang.includes('pt') && v.name.includes('Google')) || voices.find(v => v.lang.includes('pt'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      utterance.rate = 1.05; // Levemente mais rápido
      utterance.pitch = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
  }
}
