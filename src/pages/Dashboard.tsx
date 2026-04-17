import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { format, addMonths, subMonths, getYear, getMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, DollarSign, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { StatusBadge } from '../components/ui/Badge';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const generateMonthlyCharges = useStore(state => state.generateMonthlyCharges);
  const updateOverdueStatus = useStore(state => state.updateOverdueStatus);
  const charges = useStore(state => state.charges);
  const clients = useStore(state => state.clients);
  const markChargeAsPaid = useStore(state => state.markChargeAsPaid);
  const markChargeAsPending = useStore(state => state.markChargeAsPending);

  useEffect(() => {
    // Generate charges for the currently viewed month
    generateMonthlyCharges(currentDate);
    updateOverdueStatus();
  }, [currentDate, generateMonthlyCharges, updateOverdueStatus, clients.length]);

  const currentMonthCharges = charges.filter(c => {
    const chargeDate = parseISO(c.dueDate);
    return getYear(chargeDate) === getYear(currentDate) && getMonth(chargeDate) === getMonth(currentDate);
  }).sort((a, b) => parseISO(a.dueDate).getTime() - parseISO(b.dueDate).getTime());

  const totalExpected = currentMonthCharges.reduce((acc, c) => acc + c.predictedValue, 0);
  const totalReceived = currentMonthCharges.filter(c => c.status === 'PAID').reduce((acc, c) => acc + c.predictedValue, 0);
  const totalOverdue = currentMonthCharges.filter(c => c.status === 'OVERDUE').reduce((acc, c) => acc + c.predictedValue, 0);
  const totalPending = currentMonthCharges.filter(c => c.status === 'PENDING').reduce((acc, c) => acc + c.predictedValue, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const StatsCard = ({ title, value, icon: Icon, colorClass }: { title: string, value: number, icon: any, colorClass: string }) => (
    <div className="glass-panel p-6 rounded-xl flex items-center justify-between">
      <div>
        <p className="text-sm text-white/60 mb-1">{title}</p>
        <p className={cn("text-2xl font-orbitron font-bold", colorClass)}>
          {formatCurrency(value)}
        </p>
      </div>
      <div className={cn("p-3 rounded-xl bg-white/5", colorClass)}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white">Dashboard Institucional</h1>
          <p className="text-white/60">Análise financeira do mês atual.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-[#1A1A1A] rounded-lg p-1 border border-white/5 shadow-inner">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-white/5 rounded-md text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-[140px] text-center font-medium capitalize text-white">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </div>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-white/5 rounded-md text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Receita Prevista" value={totalExpected} icon={DollarSign} colorClass="text-white" />
        <StatsCard title="Recebido" value={totalReceived} icon={CheckCircle} colorClass="text-[var(--color-ls-accent)]" />
        <StatsCard title="A Receber" value={totalPending} icon={Clock} colorClass="text-yellow-500" />
        <StatsCard title="Vencido" value={totalOverdue} icon={AlertCircle} colorClass="text-red-500" />
      </div>

      {/* Charges Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl text-white font-orbitron">Cobranças do Mês</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-white/5 text-white/50 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Descrição</th>
                <th className="px-6 py-4 font-medium">Vencimento</th>
                <th className="px-6 py-4 font-medium">Valor</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {currentMonthCharges.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/50">
                    Nenhuma cobrança registrada neste mês.
                  </td>
                </tr>
              ) : (
                currentMonthCharges.map(charge => {
                  const client = clients.find(c => c.id === charge.clientId);
                  return (
                    <tr key={charge.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{client?.name || 'Cliente Removido'}</div>
                        <div className="text-xs text-white/50">{client?.segment}</div>
                      </td>
                      <td className="px-6 py-4 text-white/80">{charge.description}</td>
                      <td className="px-6 py-4 text-white/80">
                        {format(parseISO(charge.dueDate), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 text-white font-medium">
                        {formatCurrency(charge.predictedValue)}
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
