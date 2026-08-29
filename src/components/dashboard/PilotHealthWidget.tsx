import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useTenant } from '../../context/TenantContext';
import { 
  Rocket, 
  CheckCircle2, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Clock, 
  Layers, 
  HelpCircle, 
  Sparkles, 
  Send, 
  X, 
  Plus, 
  AlertTriangle,
  Flame,
  MessageCircle
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const OFF_PLATFORM_KEY = 'marketing_off_platform_demands_';

export const PilotHealthWidget: React.FC = () => {
  const { tasks, users } = useData();
  const { currentOrganization } = useTenant();
  const { success, info } = useNotification();

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isLogExternalOpen, setIsLogExternalOpen] = useState(false);
  const [externalNote, setExternalNote] = useState('');
  const [feedbackRole, setFeedbackRole] = useState<'REQUESTER' | 'TEAM' | 'LEADER'>('TEAM');
  const [q1, setQ1] = useState('');
  const [q2, setQ2] = useState('');
  const [q3, setQ3] = useState('');

  // Off-platform demands tracker
  const [offPlatformCount, setOffPlatformCount] = useState<number>(() => {
    const raw = localStorage.getItem(`${OFF_PLATFORM_KEY}${currentOrganization.id}`);
    return raw ? parseInt(raw, 10) : 3;
  });

  useEffect(() => {
    const raw = localStorage.getItem(`${OFF_PLATFORM_KEY}${currentOrganization.id}`);
    setOffPlatformCount(raw ? parseInt(raw, 10) : 3);
  }, [currentOrganization.id]);

  const activeTasks = tasks.filter((t) => !t.isArchived);
  const completedTasks = activeTasks.filter((t) => t.status === 'DONE').length;
  const oikoTasksCount = activeTasks.length;
  const totalReceived = oikoTasksCount + offPlatformCount;

  const adoptionPercentage = totalReceived > 0
    ? Math.round((oikoTasksCount / totalReceived) * 100)
    : 100;

  const handleRegisterExternal = (e: React.FormEvent) => {
    e.preventDefault();
    const newCount = offPlatformCount + 1;
    setOffPlatformCount(newCount);
    localStorage.setItem(`${OFF_PLATFORM_KEY}${currentOrganization.id}`, newCount.toString());
    info(
      'Demanda fora do fluxo registrada',
      `Registrado pedido recebido via WhatsApp/informal (${newCount} no total).`
    );
    setIsLogExternalOpen(false);
    setExternalNote('');
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    success('Feedback registrado com sucesso!', 'Obrigado por ajudar a aprimorar o Oiko Marketing.');
    setIsFeedbackOpen(false);
    setQ1('');
    setQ2('');
    setQ3('');
  };

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/30 shadow-2xl space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <Rocket className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Saúde & Adoção do Piloto ({currentOrganization.name})
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                FASE 1 ATIVA
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Protocolo de validação: meta de &ge;85% de adesão às demandas criadas pelo Oiko.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => setIsLogExternalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all"
            title="Registrar demanda que chegou por fora (WhatsApp/Verbal)"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>+ Demanda no WhatsApp</span>
          </button>

          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-xs font-bold transition-all"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Feedback do Piloto</span>
          </button>
        </div>
      </div>

      {/* 4 Adoption KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Adoção Registrada</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400">{adoptionPercentage}%</span>
            <span className="text-[11px] text-slate-400">via Oiko</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 block">Meta do Piloto: &ge; 85%</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Demandas no Oiko</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{oikoTasksCount}</span>
            <span className="text-[11px] text-slate-400">oficiais</span>
          </div>
          <span className="text-[10px] text-slate-400 block">{completedTasks} concluídas com aprovação</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-amber-500/20 space-y-1">
          <span className="text-[10px] text-amber-400 font-semibold block uppercase">Fora do Fluxo (WhatsApp)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-400">{offPlatformCount}</span>
            <span className="text-[11px] text-slate-400">vazamentos</span>
          </div>
          <span className="text-[10px] text-amber-300/80 block">{100 - adoptionPercentage}% das solicitações</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Tempo Médio de Ciclo</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-400">2.4</span>
            <span className="text-[11px] text-slate-400">dias</span>
          </div>
          <span className="text-[10px] text-purple-300 block">Solicitação &rarr; Aprovação final</span>
        </div>
      </div>

      {/* Activity Breakdown Histogram */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
          Volume de Ações da Semana (Piloto IBM)
        </span>

        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Solicitações Criadas no Oiko</span>
              <span className="font-bold text-white">{adoptionPercentage}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${adoptionPercentage}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Aprovações Pastoral / Líder</span>
              <span className="font-bold text-white">85%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: '85%' }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Comentários & Alinhamentos</span>
              <span className="font-bold text-white">72%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '72%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Modal to Log WhatsApp / External Demand */}
      {isLogExternalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setIsLogExternalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-amber-400">
              <MessageCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Registrar Demanda Fora do Oiko
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Alguém solicitou uma demanda via WhatsApp, áudio ou conversa informal? Registre aqui para mantermos a métrica de adoção metodologicamente honesta.
            </p>

            <form onSubmit={handleRegisterExternal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Breve descrição da solicitação informal (opcional)
                </label>
                <input
                  type="text"
                  value={externalNote}
                  onChange={(e) => setExternalNote(e.target.value)}
                  placeholder="Ex: Pastor pediu flyer por áudio no WhatsApp..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsLogExternalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold shadow-md"
                >
                  + Contabilizar Vazamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Structured Feedback Modal */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <button
              onClick={() => setIsFeedbackOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Avaliação Estruturada</span>
              </div>
              <h2 className="text-xl font-bold text-white">Feedback do Piloto</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Responda com honestidade para calibrarmos a ferramenta.
              </p>
            </div>

            {/* Persona Role Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setFeedbackRole('REQUESTER')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  feedbackRole === 'REQUESTER' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Solicitante
              </button>
              <button
                type="button"
                onClick={() => setFeedbackRole('TEAM')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  feedbackRole === 'TEAM' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Equipe
              </button>
              <button
                type="button"
                onClick={() => setFeedbackRole('LEADER')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  feedbackRole === 'LEADER' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                Líder / Pastor
              </button>
            </div>

            <form onSubmit={handleSendFeedback} className="space-y-3.5 text-xs">
              {feedbackRole === 'REQUESTER' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      1. Foi fácil abrir sua demanda pelo formulário?
                    </label>
                    <input
                      type="text"
                      required
                      value={q1}
                      onChange={(e) => setQ1(e.target.value)}
                      placeholder="Sim, o formulário guiou bem..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      2. Você conseguiu acompanhar o andamento da produção?
                    </label>
                    <input
                      type="text"
                      required
                      value={q2}
                      onChange={(e) => setQ2(e.target.value)}
                      placeholder="Sim, recebi as notificações..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {feedbackRole === 'TEAM' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      1. O quadro Kanban representa com clareza o seu trabalho?
                    </label>
                    <input
                      type="text"
                      required
                      value={q1}
                      onChange={(e) => setQ1(e.target.value)}
                      placeholder="Sim, a separação de fases ajudou..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      2. Quais campos ou etapas parecem burocráticos ou desnecessários?
                    </label>
                    <input
                      type="text"
                      required
                      value={q2}
                      onChange={(e) => setQ2(e.target.value)}
                      placeholder="Nenhum, ou algum campo específico..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              {feedbackRole === 'LEADER' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      1. O Centro de Aprovações e Dashboard agilizaram a validação das artes?
                    </label>
                    <input
                      type="text"
                      required
                      value={q1}
                      onChange={(e) => setQ1(e.target.value)}
                      placeholder="Sim, centralizou tudo..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      2. O sistema reduziu o volume de mensagens e cobranças no WhatsApp?
                    </label>
                    <input
                      type="text"
                      required
                      value={q2}
                      onChange={(e) => setQ2(e.target.value)}
                      placeholder="Muito, reduziu o ruído..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  O que você gostaria de sugerir para melhorar?
                </label>
                <textarea
                  rows={2}
                  value={q3}
                  onChange={(e) => setQ3(e.target.value)}
                  placeholder="Sugestões gerais..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFeedbackOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Resposta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
