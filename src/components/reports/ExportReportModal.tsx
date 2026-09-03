import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTenant } from '../../context/TenantContext';
import { useData } from '../../context/DataContext';
import { 
  FileText, 
  Printer, 
  Download, 
  X, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  BarChart3, 
  Building2, 
  Sparkles,
  Layers,
  Users
} from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Timeframe = 'this_month' | 'last_month' | 'last_90_days' | 'all';

export const ExportReportModal: React.FC<ExportReportModalProps> = ({ isOpen, onClose }) => {
  const { currentOrganization, currentCampus } = useTenant();
  const { tasks, events, users } = useData();
  const [timeframe, setTimeframe] = useState<Timeframe>('this_month');

  // Filtrar tarefas pelo período
  const filteredTasks = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return tasks.filter((t) => {
      if (t.isDeleted) return false;
      const created = new Date(t.createdAt || t.requestedAt || Date.now());
      
      if (timeframe === 'this_month') {
        return created.getFullYear() === currentYear && created.getMonth() === currentMonth;
      }
      if (timeframe === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const year = currentMonth === 0 ? currentYear - 1 : currentYear;
        return created.getFullYear() === year && created.getMonth() === lastMonth;
      }
      if (timeframe === 'last_90_days') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);
        return created >= ninetyDaysAgo;
      }
      return true; // 'all'
    });
  }, [tasks, timeframe]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter((t) => t.status === 'DONE').length;
    const inProgress = filteredTasks.filter((t) => ['IN_PROGRESS', 'PLANNING', 'INBOX'].includes(t.status)).length;
    const inReview = filteredTasks.filter((t) => t.status === 'REVIEW').length;
    const blocked = filteredTasks.filter((t) => t.status === 'BLOCKED').length;
    const urgent = filteredTasks.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // Agrupamento por tipo de demanda
    const byType: Record<string, number> = {};
    filteredTasks.forEach((t) => {
      const type = t.demandType || 'OUTRO';
      byType[type] = (byType[type] || 0) + 1;
    });

    // Agrupamento por responsável
    const byAssignee: Record<string, { count: number; name: string }> = {};
    filteredTasks.forEach((t) => {
      const assignees = t.assigneeIds?.length ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : ['unassigned']);
      assignees.forEach((id) => {
        const user = users.find((u) => u.id === id);
        const name = user?.name || (id === 'unassigned' ? 'Não Atribuído' : 'Membro');
        if (!byAssignee[id]) {
          byAssignee[id] = { count: 0, name };
        }
        byAssignee[id].count += 1;
      });
    });

    return {
      total,
      done,
      inProgress,
      inReview,
      blocked,
      urgent,
      completionRate,
      byType,
      byAssignee,
    };
  }, [filteredTasks, users]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Título',
      'Tipo de Demanda',
      'Status',
      'Prioridade',
      'Solicitante',
      'Data Solicitação',
      'Prazo Final',
      'Data Conclusão',
      'Tags',
    ];

    const rows = filteredTasks.map((t) => [
      `"${t.id}"`,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${t.demandType || 'N/A'}"`,
      `"${t.status}"`,
      `"${t.priority}"`,
      `"${(t.requesterName || 'N/A').replace(/"/g, '""')}"`,
      `"${t.requestedAt || t.createdAt || ''}"`,
      `"${t.deadline || ''}"`,
      `"${t.completedAt || ''}"`,
      `"${(t.tags || []).join(', ')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_demandas_${currentOrganization.slug}_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:static">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-scale-up max-h-[92vh] flex flex-col print:border-none print:shadow-none print:p-0 print:max-h-none print:w-full print:bg-white print:text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Screen only */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Relatório Executivo de Demandas & Ministério
              </h2>
              <p className="text-xs text-slate-400">
                Gere prestação de contas, indicadores e exportações em PDF ou Excel.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeframe Selector & Actions - Screen only */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 rounded-2xl bg-slate-950/60 border border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setTimeframe('this_month')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === 'this_month'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setTimeframe('last_month')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === 'last_month'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mês Anterior
            </button>
            <button
              onClick={() => setTimeframe('last_90_days')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === 'last_90_days'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Últimos 90 Dias
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                timeframe === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tudo
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              title="Exportar dados para Excel (.CSV)"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Exportar Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
              title="Imprimir ou Salvar em PDF formatado"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-1 print:overflow-visible print:space-y-4">
          {/* Printable Church Header */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between print:border-b-2 print:border-slate-300 print:bg-white print:p-0 print:pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400 print:text-black" />
                <h3 className="text-base font-black text-white print:text-black">
                  {currentOrganization.name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-0.5">
                {currentCampus ? `Campus: ${currentCampus.name}` : 'Todos os Campi'} • Relatório de Operações & Demandas
              </p>
            </div>
            <div className="text-right text-xs text-slate-400 print:text-slate-600">
              <p>Período: <strong className="text-white print:text-black uppercase">{timeframe.replace('_', ' ')}</strong></p>
              <p className="text-[10px]">Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:border print:border-slate-200 print:bg-slate-50">
              <div className="flex items-center justify-between text-slate-400 print:text-slate-600 text-xs font-bold mb-1">
                <span>Total Demandas</span>
                <Layers className="w-4 h-4 text-indigo-400 print:text-indigo-600" />
              </div>
              <p className="text-2xl font-black text-white print:text-black">{metrics.total}</p>
              <span className="text-[10px] text-slate-500">solicitadas no período</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-emerald-500/30 print:border print:border-slate-200 print:bg-slate-50">
              <div className="flex items-center justify-between text-emerald-400 print:text-emerald-700 text-xs font-bold mb-1">
                <span>Concluídas</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-white print:text-black">{metrics.done}</p>
              <span className="text-[10px] text-emerald-400/80 print:text-emerald-700">{metrics.completionRate}% taxa de entrega</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-amber-500/30 print:border print:border-slate-200 print:bg-slate-50">
              <div className="flex items-center justify-between text-amber-400 print:text-amber-700 text-xs font-bold mb-1">
                <span>Em Produção / Revisão</span>
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-white print:text-black">{metrics.inProgress + metrics.inReview}</p>
              <span className="text-[10px] text-amber-400/80 print:text-amber-700">{metrics.inReview} aguardando aprovação</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-rose-500/30 print:border print:border-slate-200 print:bg-slate-50">
              <div className="flex items-center justify-between text-rose-400 print:text-rose-700 text-xs font-bold mb-1">
                <span>Urgentes / Gargalos</span>
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-2xl font-black text-white print:text-black">{metrics.urgent + metrics.blocked}</p>
              <span className="text-[10px] text-rose-400/80 print:text-rose-700">{metrics.blocked} bloqueadas</span>
            </div>
          </div>

          {/* Demandas por Tipo */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:border print:border-slate-200 print:bg-white space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400 print:text-black" />
              <span>Volume de Demandas por Tipo</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(metrics.byType).map(([type, count]) => (
                <div key={type} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between print:border print:border-slate-200 print:bg-slate-50">
                  <span className="text-xs font-semibold text-slate-300 print:text-black uppercase">{type}</span>
                  <span className="text-xs font-black text-indigo-400 print:text-indigo-700 bg-indigo-500/10 px-2 py-0.5 rounded-md">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Demandas por Responsável / Voluntário */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 print:border print:border-slate-200 print:bg-white space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400 print:text-black" />
              <span>Distribuição de Tarefas por Membro da Equipe</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(metrics.byAssignee).map(([id, info]) => (
                <div key={id} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-between print:border print:border-slate-200 print:bg-slate-50">
                  <span className="text-xs font-semibold text-slate-300 print:text-black truncate max-w-[140px]">{info.name}</span>
                  <span className="text-xs font-black text-purple-400 print:text-purple-700 bg-purple-500/10 px-2 py-0.5 rounded-md">
                    {info.count} tarefas
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
