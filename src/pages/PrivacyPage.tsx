import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Lock, CheckCircle2, UserCheck, Eye, Database } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>Conformidade com a LGPD (Lei nº 13.709/2018)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Política de Privacidade e Proteção de Dados
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Última atualização: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/30 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
          <p className="font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Compromisso com a Privacidade Ministerial:</span>
          </p>
          <p>
            No <strong>Oiko Gestão</strong>, tratamos os dados da sua igreja, equipe e voluntários com rigor e confidencialidade. Esta política descreve transparentemente como os dados pessoais são coletados, utilizados, armazenados e protegidos.
          </p>
        </div>

        <div className="space-y-8 text-xs sm:text-sm text-slate-300 leading-relaxed divide-y divide-slate-800/80">
          {/* Seção 1 */}
          <section className="space-y-3 pt-6 first:pt-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-sm">1.</span>
              <span>Papéis sob a LGPD</span>
            </h2>
            <p>
              Nos termos da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018):
            </p>
            <ul className="space-y-2 pl-4 list-disc marker:text-emerald-400">
              <li><strong>Controladora dos Dados:</strong> A igreja ou organização contratante, que decide quais líderes e voluntários cadastrar e quais demandas gerenciar;</li>
              <li><strong>Operador dos Dados:</strong> O Oiko Gestão, que disponibiliza o software e infraestrutura segura para o tratamento estritamente necessário à operação do sistema.</li>
            </ul>
          </section>

          {/* Seção 2 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-sm">2.</span>
              <span>Dados Coletados e Finalidade</span>
            </h2>
            <p>
              Coletamos apenas as informações indispensáveis para a prestação dos serviços:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white text-xs block">Dados de Cadastro e Acesso</span>
                <p className="text-xs text-slate-400">Nome completo, e-mail institucional ou pessoal e foto de perfil para identificação de autoria nas tarefas e comentários.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white text-xs block">Telefone e Notificações (WhatsApp)</span>
                <p className="text-xs text-slate-400">Número de WhatsApp corporativo ou de voluntários para envio de alertas de atribuição de tarefas e protocolo de demandas.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white text-xs block">Dados Organizacionais</span>
                <p className="text-xs text-slate-400">Nome da igreja, sedes/campi, departamentos ministeriais e projetos cadastrados pelos administradores.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <span className="font-bold text-white text-xs block">Logs de Auditoria e Segurança</span>
                <p className="text-xs text-slate-400">Registros de criação, edição e movimentação de cards para garantia de concorrência e transparência interna.</p>
              </div>
            </div>
          </section>

          {/* Seção 3 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-sm">3.</span>
              <span>Armazenamento e Segurança da Informação</span>
            </h2>
            <p>
              Adotamos práticas de ponta na indústria de tecnologia para blindar os dados contra acessos não autorizados:
            </p>
            <ul className="space-y-2 pl-4 list-disc marker:text-emerald-400">
              <li><strong>Criptografia em Trânsito e Repouso:</strong> Todo o tráfego ocorre via protocolo seguro HTTPS/TLS 1.3 com criptografia de ponta a ponta na nuvem Google Cloud / Firestore;</li>
              <li><strong>Isolamento Multi-Tenant:</strong> As coleções de dados de cada igreja são isoladas em nível de banco de dados e regras de segurança (Firestore Security Rules);</li>
              <li><strong>Controle de Acesso Baseado em Papéis (RBAC):</strong> Cada membro só acessa o que a liderança da igreja determinar (Admin, Líder, Equipe ou Solicitante).</li>
            </ul>
          </section>

          {/* Seção 4 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-sm">4.</span>
              <span>Compartilhamento de Dados com Terceiros</span>
            </h2>
            <p>
              <strong>Não vendemos, não alugamos e não compartilhamos</strong> dados pessoais com corretores de dados, empresas de marketing ou terceiros não essenciais. O compartilhamento ocorre apenas com prestadores de infraestrutura estritamente necessários ao funcionamento da plataforma:
            </p>
            <ul className="space-y-2 pl-4 list-disc marker:text-emerald-400">
              <li>Google Cloud Platform / Firebase (Hospedagem, Banco de Dados e Autenticação);</li>
              <li>Provedores de Gateway de Pagamento homologados pelo Banco Central para processamento de assinaturas.</li>
            </ul>
          </section>

          {/* Seção 5 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-sm">5.</span>
              <span>Direitos dos Titulares de Dados (Art. 18 LGPD)</span>
            </h2>
            <p>
              A qualquer momento, o titular dos dados cadastrado no Oiko Gestão pode exercer seus direitos garantidos pela LGPD:
            </p>
            <ul className="space-y-2 pl-4 list-disc marker:text-emerald-400">
              <li>Confirmação da existência de tratamento e acesso aos seus dados;</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>Portabilidade e exportação dos dados para outro fornecedor;</li>
              <li>Revogação do consentimento concedido.</li>
            </ul>
          </section>

          {/* Seção 6 */}
          <section className="space-y-3 pt-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400 font-mono text-sm">6.</span>
              <span>Canal de Contato do Encarregado de Dados (DPO)</span>
            </h2>
            <p>
              Para esclarecer dúvidas sobre esta Política de Privacidade ou solicitar o exercício de qualquer direito previsto na LGPD, entre em contato diretamente com nossa equipe através do e-mail oficial ou WhatsApp comercial disponível no suporte da plataforma.
            </p>
          </section>
        </div>

        {/* Footer info */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Oiko Gestão Integrada. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link to="/termos" className="text-emerald-400 hover:underline">
              Termos de Uso
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
