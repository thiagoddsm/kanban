import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, FileText, CheckCircle2, Lock, HelpCircle } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
              O
            </div>
            <span className="font-extrabold text-base tracking-tight text-white">
              Oiko <span className="text-indigo-400">Gestão</span>
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao início</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
            <FileText className="w-3.5 h-3.5" />
            <span>Documento Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Termos de Uso e Serviço
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Última atualização: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
          <p className="font-bold text-white">Resumo em Linguagem Clara:</p>
          <p>
            O <strong>Oiko Gestão</strong> é uma plataforma SaaS desenvolvida para potencializar a organização de demandas, cultos, eventos e equipes ministeriais. Os dados cadastrados pertencem exclusivamente à sua igreja. Não vendemos suas informações e você tem liberdade total para cancelar sua assinatura a qualquer momento.
          </p>
        </div>

        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed divide-y divide-slate-800/80">
          {/* Seção 1 */}
          <section className="space-y-3 pt-6 first:pt-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400 font-mono text-sm">1.</span>
              <span>Aceitação dos Termos</span>
            </h2>
            <p>
              Ao criar uma conta, acessar ou utilizar o Oiko Gestão (doravante denominado "Plataforma"), a organização religiosa ou usuário individual (doravante denominado "Contratante" ou "Usuário") concorda expressamente com os presentes Termos de Uso e com nossa Política de Privacidade. Caso não concorde com qualquer disposição aqui estabelecida, solicitamos que não utilize nossos serviços.
            </p>
          </section>

          {/* Seção 2 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400 font-mono text-sm">2.</span>
              <span>Propriedade e Controle dos Dados</span>
            </h2>
            <p>
              A organização religiosa contratante é a única e exclusiva proprietária de todo o conteúdo e informações inseridas na plataforma, incluindo títulos de demandas, tarefas, nomes e telefones de líderes e voluntários, eventos, relatórios e arquivos anexados.
            </p>
            <ul className="space-y-2 pl-4 list-disc marker:text-indigo-400">
              <li>O Oiko Gestão atua exclusivamente como operador e processador técnico dos dados;</li>
              <li>A plataforma jamais comercializará, compartilhará ou transferirá dados da sua igreja para terceiros;</li>
              <li>O Usuário tem direito à exportação integral de seus dados a qualquer momento enquanto mantiver acesso ao sistema.</li>
            </ul>
          </section>

          {/* Seção 3 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400 font-mono text-sm">3.</span>
              <span>Período de Testes Gratuitos (Trial de 14 Dias)</span>
            </h2>
            <p>
              Novas contas criadas no Oiko Gestão recebem automaticamente um período de avaliação gratuita de 14 (quatorze) dias corridos, sem necessidade de cadastramento de cartão de crédito.
            </p>
            <ul className="space-y-2 pl-4 list-disc marker:text-indigo-400">
              <li>Durante os 14 dias, todos os recursos previstos no plano escolhido permanecem liberados;</li>
              <li>Após o término do 14º dia, a conta entra em <strong>Modo Somente Leitura (*Soft-Lock*)</strong>;</li>
              <li>Em Modo Leitura, nenhum dado é excluído. O Usuário pode consultar o histórico de demandas, calendário e relatórios, ficando bloqueada apenas a criação de novas tarefas e convite de novos membros até a ativação de um plano oficial.</li>
            </ul>
          </section>

          {/* Seção 4 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400 font-mono text-sm">4.</span>
              <span>Planos, Pagamentos e Cancelamento</span>
            </h2>
            <p>
              Os serviços são contratados sob a modalidade de assinatura mensal ou anual recorrente:
            </p>
            <ul className="space-y-2 pl-4 list-disc marker:text-indigo-400">
              <li><strong>Sem Fidelidade Abusiva:</strong> A assinatura mensal pode ser cancelada a qualquer momento sem incidência de multas;</li>
              <li><strong>Upgrades e Downgrades:</strong> Podem ser solicitados a qualquer tempo, com ajuste proporcional na cobrança seguinte;</li>
              <li><strong>Inadimplência:</strong> Caso o pagamento não seja confirmado na data devida, concederemos um período de carência de até 7 dias antes da transição da conta para o modo somente leitura.</li>
            </ul>
          </section>

          {/* Seção 5 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400 font-mono text-sm">5.</span>
              <span>Disponibilidade e Nível de Serviço (SLA)</span>
            </h2>
            <p>
              Nos esforçamos para manter a plataforma com disponibilidade ininterrupta (uptime superior a 99%), operando sobre infraestrutura em nuvem global do Google Cloud / Firebase. Manutenções programadas serão comunicadas com antecedência preferencialmente fora dos horários de pico ou finais de semana de culto.
            </p>
          </section>

          {/* Seção 6 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-indigo-400 font-mono text-sm">6.</span>
              <span>Suporte e Atendimento</span>
            </h2>
            <p>
              O suporte técnico ao cliente é prestado por e-mail e através de nosso canal oficial de WhatsApp comercial em horário comercial, com prioridade de atendimento conforme o plano contratado.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Oiko Gestão Integrada. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/privacidade" className="text-indigo-400 hover:underline">
              Política de Privacidade (LGPD)
            </Link>
            <Link to="/" className="hover:text-white transition-colors">
              Página Principal
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
