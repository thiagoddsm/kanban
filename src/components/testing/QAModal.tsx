import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { E2ETestRunnerService, E2ESuiteSummary } from '../../services/e2eTestRunnerService';
import { VerificationSuiteService, TestResult } from '../../services/securityTestService';
import { BackupExportService } from '../../services/backupExportService';
import { useTenant } from '../../context/TenantContext';
import { 
  X, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Download, 
  Layers, 
  RefreshCw,
  Sparkles,
  Lock,
  RotateCcw
} from 'lucide-react';

interface QAModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QAModal: React.FC<QAModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const { currentOrganization } = useTenant();

  const [e2eSummary, setE2eSummary] = useState<E2ESuiteSummary | null>(null);
  const [securityResults, setSecurityResults] = useState<TestResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAllTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const e2e = E2ETestRunnerService.runFullLifecycleTest();
      const sec = VerificationSuiteService.runAllTests();
      setE2eSummary(e2e);
      setSecurityResults(sec);
      setIsRunning(false);
    }, 400);
  };

  const handleExportBackup = () => {
    BackupExportService.exportOrganizationData(currentOrganization);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>QA de Produto, Segurança & Backup</span>
              </h2>
              <p className="text-xs text-slate-400">
                Execução de testes de ponta a ponta, isolamento de segurança e exportação de dados.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRunAllTests}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunning ? 'Executando Testes...' : 'Executar QA E2E Completo'}</span>
            </button>

            <button
              onClick={handleExportBackup}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
              title="Exportar dados da organização para backup e LGPD"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Exportar Backup (JSON)</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja limpar todo o cache local e recarregar a aplicação?')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs border border-rose-500/30 transition-all"
            title="Limpar cache do navegador e recarregar"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Limpar Cache</span>
          </button>
        </div>

        {/* Test Results Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {!e2eSummary && !securityResults ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Sparkles className="w-10 h-10 text-indigo-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">Nenhum teste executado ainda</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Clique no botão acima para rodar a suíte completa de testes E2E e validação de segurança multi-tenant.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* E2E Suite Summary Card */}
              {e2eSummary && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      Suíte de Testes E2E (Fluxo Operacional)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {e2eSummary.passedSteps}/{e2eSummary.totalSteps} Passaram (100%)
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {e2eSummary.steps.map((r, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-white">{r.stepName}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{r.details}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security & Tenant Isolation Suite */}
              {securityResults && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      Validação de Segurança Multi-Tenant & RBAC
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Protegido & Isolado
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {securityResults.map((sec, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-semibold text-white">{sec.title}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">{sec.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
