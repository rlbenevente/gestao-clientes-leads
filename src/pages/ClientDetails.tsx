import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ArrowLeft, Edit } from 'lucide-react';
import { StatusBadge } from '../components/ui/Badge';
import { format, parseISO } from 'date-fns';
import { useState } from 'react';

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, charges, markChargeAsPaid, markChargeAsPending } = useStore();

  const client = clients.find(c => c.id === id);
  const clientCharges = charges
    .filter(c => c.clientId === id)
    .sort((a, b) => parseISO(b.dueDate).getTime() - parseISO(a.dueDate).getTime()); // newest first

  const [filterYear, setFilterYear] = useState<string>('all');
  
  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl text-white">Cliente não encontrado</h2>
        <button onClick={() => navigate('/clients')} className="text-[var(--color-ls-accent)] mt-4 hover:underline">Voltar para lista</button>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const years = Array.from(new Set(clientCharges.map(c => parseISO(c.dueDate).getFullYear().toString())));
  
  const filteredCharges = filterYear === 'all' 
    ? clientCharges 
    : clientCharges.filter(c => parseISO(c.dueDate).getFullYear().toString() === filterYear);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-3xl text-white">{client.name}</h1>
               <StatusBadge status={client.status} />
            </div>
            <p className="text-white/60">{client.segment || 'Sem segmento definido'}</p>
          </div>
        </div>
        
        <button onClick={() => navigate(`/clients/${client.id}/edit`)} className="btn-secondary">
          <Edit className="w-4 h-4" />
          Editar Cliente
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-xl border-t-2 border-t-[var(--color-ls-accent)]">
             <h3 className="text-sm text-white/50 mb-1 uppercase tracking-wider">Gestão Mensal</h3>
             <p className="text-2xl text-white font-orbitron">{formatCurrency(client.monthlyValue)}</p>
             {client.hasSplitPayment && (
                 <p className="text-xs text-[var(--color-ls-accent)] mt-2">Dividido entre {client.payers.length} pagadores</p>
             )}
          </div>
          
          <div className="glass-panel p-6 rounded-xl border-t-2 border-t-white/10">
             <h3 className="text-sm text-white/50 mb-1 uppercase tracking-wider">Projeto / Proposta</h3>
             {client.hasProject ? (
                 <>
                   <p className="text-2xl text-white font-orbitron">{formatCurrency(client.projectTotalValue || 0)}</p>
                   {client.hasInstallments && (
                       <p className="text-xs text-white/70 mt-2">{client.installmentsCount} parcelas de {formatCurrency(client.installmentValue || 0)}</p>
                   )}
                 </>
             ) : (
                 <p className="text-lg text-white/30 pt-1">Sem projeto</p>
             )}
          </div>
          
          {client.hasMonthlyFee ? (
              <div className="glass-panel p-6 rounded-xl border-t-2 border-t-yellow-500/50">
                 <h3 className="text-sm text-white/50 mb-1 uppercase tracking-wider">Fee Extra / Manutenção</h3>
                 <p className="text-2xl text-white font-orbitron">{formatCurrency(client.monthlyFeeValue || 0)}</p>
              </div>
          ) : (
              <div className="glass-panel p-6 rounded-xl border-t-2 border-t-white/10 flex items-center justify-center opacity-50">
                 <span className="text-white/50">Sem fee configurado</span>
              </div>
          )}
      </div>

      {/* History Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-white/5">
          <h2 className="text-xl text-white font-orbitron">Histórico de Cobranças</h2>
          
          <div className="flex items-center gap-3">
             <span className="text-sm text-white/50">Filtrar Ano:</span>
             <select 
               className="bg-black border border-white/10 rounded-lg px-3 py-1.5 text-white/80 text-sm outline-none w-32"
               value={filterYear}
               onChange={e => setFilterYear(e.target.value)}
             >
               <option value="all">Todos</option>
               {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-white/5 text-white/50 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Competência (Data)</th>
                <th className="px-6 py-4 font-medium">Descrição</th>
                <th className="px-6 py-4 font-medium">Valor Previsto</th>
                <th className="px-6 py-4 font-medium">Data Recebimento</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCharges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/50">
                    Nenhum histórico gerado ainda. <br/> (As cobranças são geradas automaticamente ao acessar o Dashboard no mês vigente).
                  </td>
                </tr>
              ) : (
                filteredCharges.map(charge => (
                  <tr key={charge.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white/80">
                      {format(parseISO(charge.dueDate), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {charge.description}
                    </td>
                    <td className="px-6 py-4 text-white font-medium">
                      {formatCurrency(charge.predictedValue)}
                    </td>
                    <td className="px-6 py-4 text-white/60">
                      {charge.paymentDate ? format(parseISO(charge.paymentDate), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={charge.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                       {charge.status !== 'PAID' ? (
                          <button
                            onClick={() => markChargeAsPaid(charge.id)}
                            className="bg-[var(--color-ls-accent)]/10 text-[var(--color-ls-accent)] hover:bg-[var(--color-ls-accent)] hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            Dar Baixa
                          </button>
                        ) : (
                          <button
                            onClick={() => markChargeAsPending(charge.id)}
                            className="bg-white/5 text-white/60 hover:bg-white/10 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                          >
                            Desfazer
                          </button>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
