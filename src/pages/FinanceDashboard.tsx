import { useState, useMemo, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useStore } from '../store/useStore';
import { DollarSign, Clock, List, CreditCard, Filter } from 'lucide-react';
import TransactionModal from '../components/finance/TransactionModal';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function FinanceDashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { transactions, accounts, categories, initialize, isLoading: isLoadingFinance } = useFinanceStore();
  const { charges, fetchData, isLoading: isLoadingCRM } = useStore();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [entityFilter, setEntityFilter] = useState<'ALL' | 'PF' | 'PJ'>('ALL');

  useEffect(() => {
    initialize();
    if (charges.length === 0) fetchData();
  }, [initialize, fetchData, charges.length]);

  const isLoading = isLoadingFinance || isLoadingCRM;

  // Filtros
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.dueDate);
      const isSameMonth = date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
      const matchEntity = entityFilter === 'ALL' || t.entityType === entityFilter;
      return isSameMonth && matchEntity;
    });
  }, [transactions, selectedMonth, selectedYear, entityFilter]);

  // KPIs
  const kpis = useMemo(() => {
    // Saldo Inicial de todas as contas (ignora filtro de mês)
    const baseBalance = accounts.reduce((acc, a) => acc + a.initialBalance, 0);

    // Calculamos o saldo real baseado em tudo que já foi pago ATÉ HOJE
    const allPaidIncomes = transactions.filter(t => t.type === 'income' && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
    const allPaidExpenses = transactions.filter(t => t.type === 'expense' && t.status === 'paid').reduce((acc, t) => acc + t.amount, 0);
    const saldoAtual = baseBalance + allPaidIncomes - allPaidExpenses;

    // Saldo previsto para o final do mês selecionado
    const pendingIncomesThisMonth = currentMonthTransactions.filter(t => t.type === 'income' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
    const pendingExpensesThisMonth = currentMonthTransactions.filter(t => t.type === 'expense' && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);
    const saldoPrevisto = saldoAtual + pendingIncomesThisMonth - pendingExpensesThisMonth;

    // Totais do mês
    const totalGasto = currentMonthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const totalRecebido = currentMonthTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

    // Contas a vencer no mês
    const contasAVencer = currentMonthTransactions.filter(t => t.type === 'expense' && t.status === 'pending' && !t.invoiceDate).length;
    
    // Faturas abertas no mês
    const faturasAbertas = currentMonthTransactions.filter(t => t.invoiceDate && t.status === 'pending').reduce((acc, t) => acc + t.amount, 0);

    return { saldoAtual, saldoPrevisto, totalGasto, totalRecebido, contasAVencer, faturasAbertas };
  }, [accounts, transactions, currentMonthTransactions]);

  // Gráfico: Gastos por Categoria
  const categoryData = useMemo(() => {
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense' && !t.invoiceDate); // Ignora fatura em si, pega o gasto original
    const grouped = expenses.reduce((acc, t) => {
      const cat = categories.find(c => c.id === t.categoryId);
      const name = cat?.name || 'Sem Categoria';
      const color = cat?.color || '#555';
      if (!acc[name]) acc[name] = { name, value: 0, color };
      acc[name].value += t.amount;
      return acc;
    }, {} as Record<string, {name: string, value: number, color: string}>);

    return Object.values(grouped).sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions, categories]);

  // Gráfico: Comparativo Mensal (Últimos 6 meses)
  const monthlyData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(selectedYear, selectedMonth - i, 1);
      const monthLabel = `${MONTHS[d.getMonth()].substring(0,3)}/${String(d.getFullYear()).substring(2)}`;
      
      const monthTxs = transactions.filter(t => {
        const td = new Date(t.dueDate);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });

      const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      data.push({ name: monthLabel, Receitas: income, Despesas: expense });
    }
    return data;
  }, [transactions, selectedMonth, selectedYear]);

  // Gráfico: PF vs PJ
  const entityData = useMemo(() => {
    const expenses = currentMonthTransactions.filter(t => t.type === 'expense');
    const pf = expenses.filter(t => t.entityType === 'PF').reduce((sum, t) => sum + t.amount, 0);
    const pj = expenses.filter(t => t.entityType === 'PJ').reduce((sum, t) => sum + t.amount, 0);
    return [
      { name: 'Pessoal (PF)', value: pf, color: '#10B981' },
      { name: 'Agência (PJ)', value: pj, color: '#3B82F6' }
    ].filter(d => d.value > 0);
  }, [currentMonthTransactions]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-ls-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel p-3 rounded-lg border border-white/10 text-sm">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
      
      {/* HEADER E FILTROS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Dashboard Financeiro</h1>
          <p className="text-white/60">Visão geral do seu fluxo de caixa e despesas.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-1">
            <Filter className="w-4 h-4 text-white/40 ml-2" />
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer">
              {MONTHS.map((m, i) => <option key={i} value={i} className="bg-black">{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent text-sm border-none focus:ring-0 cursor-pointer border-l border-white/10 pl-2">
              {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-black">{y}</option>)}
            </select>
          </div>

          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value as any)} className="input-field py-2 text-sm bg-white/5 border-white/10">
            <option value="ALL">PF e PJ</option>
            <option value="PF">Apenas PF</option>
            <option value="PJ">Apenas PJ</option>
          </select>

          <div className="h-6 w-px bg-white/10 mx-1"></div>

          <Link to="/finance/reports" className="btn-secondary py-2 text-sm">Relatórios</Link>
          <Link to="/finance/calendar" className="btn-secondary py-2 text-sm">Calendário</Link>
          <Link to="/finance/invoices" className="btn-secondary py-2 text-sm">Faturas</Link>
          <Link to="/finance/transactions" className="btn-secondary py-2 text-sm"><List className="w-4 h-4" /> Lançamentos</Link>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary py-2 text-sm">
            <DollarSign className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {/* KPIS ROW 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border-t-4 border-t-[var(--color-ls-accent)]">
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Saldo Atual Geral</p>
          <h3 className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.saldoAtual)}</h3>
        </div>
        <div className="glass-panel p-5 rounded-xl border-t-4 border-t-blue-500">
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Previsão Fim do Mês</p>
          <h3 className="text-2xl font-bold text-blue-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.saldoPrevisto)}</h3>
        </div>
        <div className="glass-panel p-5 rounded-xl border-t-4 border-t-green-500">
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Recebido no Mês</p>
          <h3 className="text-2xl font-bold text-green-400">+{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.totalRecebido)}</h3>
        </div>
        <div className="glass-panel p-5 rounded-xl border-t-4 border-t-red-500">
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Gasto no Mês</p>
          <h3 className="text-2xl font-bold text-red-400">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.totalGasto)}</h3>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico: Evolução Mensal */}
        <div className="glass-panel p-6 rounded-xl lg:col-span-2 flex flex-col">
          <h3 className="font-bold mb-6 text-white/80">Evolução Mensal</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Receitas" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico: Despesas por Categoria */}
        <div className="glass-panel p-6 rounded-xl flex flex-col">
          <h3 className="font-bold mb-6 text-white/80">Gastos por Categoria</h3>
          {categoryData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-white/40 text-sm">Sem dados neste mês</div>
          ) : (
            <div className="flex-1 min-h-[300px] flex flex-col">
              <ResponsiveContainer width="100%" height="60%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                {categoryData.map((cat, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-white/70 truncate max-w-[120px]">{cat.name}</span>
                    </div>
                    <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* BOTTOM ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Contas a Pagar (Lista) */}
        <div className="glass-panel p-6 rounded-xl lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-white/80 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              Contas a Vencer no Mês ({kpis.contasAVencer})
            </h3>
            <Link to="/finance/transactions" className="text-xs text-[var(--color-ls-accent)] hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-3">
            {currentMonthTransactions.filter(t => t.type === 'expense' && t.status === 'pending' && !t.invoiceDate).slice(0, 5).map(tx => (
              <div key={tx.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{tx.description}</p>
                  <p className="text-xs text-white/50">Vence em {new Date(tx.dueDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-400">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}</p>
                </div>
              </div>
            ))}
            {kpis.contasAVencer === 0 && <p className="text-center text-white/40 text-sm py-4">Tudo pago por enquanto!</p>}
          </div>
        </div>

        {/* Resumo Secundário */}
        <div className="space-y-6">
          <div className="glass-panel p-5 rounded-xl border-l-4 border-l-purple-500">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-purple-500" />
              <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Faturas do Mês</p>
            </div>
            <h3 className="text-2xl font-bold mb-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis.faturasAbertas)}</h3>
            <Link to="/finance/invoices" className="text-xs text-purple-400 hover:underline">Ir para faturas →</Link>
          </div>

          <div className="glass-panel p-5 rounded-xl">
            <h3 className="font-bold text-white/80 text-sm mb-4">PF vs PJ (Despesas)</h3>
            {entityData.length === 0 ? (
              <p className="text-white/40 text-xs">Sem dados</p>
            ) : (
              <div className="space-y-3">
                {entityData.map(d => {
                  const percent = (d.value / kpis.totalGasto) * 100;
                  return (
                    <div key={d.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/70">{d.name}</span>
                        <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.value)} ({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: d.color }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
