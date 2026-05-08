import { useState, useMemo, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { Download, PieChart as PieChartIcon } from 'lucide-react';

export default function FinanceReports() {
  const { transactions, categories, creditCards, initialize, isLoading } = useFinanceStore();
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Transações do ano selecionado
  const yearlyTransactions = useMemo(() => {
    return transactions.filter(t => new Date(t.dueDate).getFullYear() === yearFilter);
  }, [transactions, yearFilter]);

  // 1. Despesas por Categoria (Pizza)
  const categoryData = useMemo(() => {
    const expenses = yearlyTransactions.filter(t => t.type === 'expense' && !t.invoiceDate);
    const grouped = expenses.reduce((acc, t) => {
      const cat = categories.find(c => c.id === t.categoryId);
      const name = cat?.name || 'Outros';
      const color = cat?.color || '#555';
      if (!acc[name]) acc[name] = { name, value: 0, color };
      acc[name].value += t.amount;
      return acc;
    }, {} as Record<string, {name: string, value: number, color: string}>);

    return Object.values(grouped).sort((a, b) => b.value - a.value);
  }, [yearlyTransactions, categories]);

  // 2. Evolução Mensal de Receitas vs Despesas (Barras)
  const monthlyEvolution = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = months.map(m => ({ name: m, Receitas: 0, Despesas: 0 }));

    yearlyTransactions.forEach(t => {
      const monthIdx = new Date(t.dueDate).getMonth();
      if (t.type === 'income') data[monthIdx].Receitas += t.amount;
      if (t.type === 'expense') data[monthIdx].Despesas += t.amount;
    });

    return data;
  }, [yearlyTransactions]);

  // 3. Gastos por Cartão de Crédito (Barras Horizontais ou Pizza)
  const creditCardData = useMemo(() => {
    const expenses = yearlyTransactions.filter(t => t.creditCardId);
    const grouped = expenses.reduce((acc, t) => {
      const card = creditCards.find(c => c.id === t.creditCardId);
      const name = card?.name || 'Cartão Excluído';
      if (!acc[name]) acc[name] = { name, Gasto: 0 };
      acc[name].Gasto += t.amount;
      return acc;
    }, {} as Record<string, {name: string, Gasto: number}>);

    return Object.values(grouped).sort((a, b) => b.Gasto - a.Gasto);
  }, [yearlyTransactions, creditCards]);

  // 4. Fluxo de Caixa Acumulado (Área / Projeção)
  const cashflowProjection = useMemo(() => {
    let acumulado = 0; // Idealmente começaria do saldo inicial do ano, assumimos 0 pro delta anual
    const data = monthlyEvolution.map(m => {
      acumulado += (m.Receitas - m.Despesas);
      return { name: m.name, Saldo: acumulado };
    });
    return data;
  }, [monthlyEvolution]);

  // 5. PF vs PJ
  const entityData = useMemo(() => {
    const expenses = yearlyTransactions.filter(t => t.type === 'expense');
    const pf = expenses.filter(t => t.entityType === 'PF').reduce((sum, t) => sum + t.amount, 0);
    const pj = expenses.filter(t => t.entityType === 'PJ').reduce((sum, t) => sum + t.amount, 0);
    return [
      { name: 'Pessoal (PF)', value: pf, color: '#10B981' },
      { name: 'Agência (PJ)', value: pj, color: '#3B82F6' }
    ].filter(d => d.value > 0);
  }, [yearlyTransactions]);

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
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <PieChartIcon className="w-8 h-8 text-[var(--color-ls-accent)]" />
            Relatórios e Projeções
          </h1>
          <p className="text-white/60">Análise profunda da saúde financeira da Leads Solution.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <select value={yearFilter} onChange={(e) => setYearFilter(Number(e.target.value))} className="input-field py-2">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-secondary py-2 flex items-center gap-2 opacity-50 cursor-not-allowed" title="Em breve">
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Evolução Mensal */}
        <div className="glass-panel p-6 rounded-xl flex flex-col lg:col-span-2">
          <h3 className="font-bold mb-6 text-white/80">Evolução de Receitas e Despesas ({yearFilter})</h3>
          <div className="flex-1 min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyEvolution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                <Legend iconType="circle" />
                <Bar dataKey="Receitas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Despesas por Categoria */}
        <div className="glass-panel p-6 rounded-xl flex flex-col">
          <h3 className="font-bold mb-6 text-white/80">Despesas por Categoria (Anual)</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value" stroke="none">
                  {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fluxo de Caixa Acumulado */}
        <div className="glass-panel p-6 rounded-xl flex flex-col">
          <h3 className="font-bold mb-6 text-white/80">Variação do Caixa Acumulado</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashflowProjection} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Saldo" stroke="#10B981" fillOpacity={1} fill="url(#colorSaldo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gastos por Cartão de Crédito */}
        <div className="glass-panel p-6 rounded-xl flex flex-col">
          <h3 className="font-bold mb-6 text-white/80">Volume de Compras por Cartão</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={creditCardData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#ffffff50" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                <Bar dataKey="Gasto" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PF vs PJ */}
        <div className="glass-panel p-6 rounded-xl flex flex-col">
          <h3 className="font-bold mb-6 text-white/80">Despesas PF vs PJ</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={entityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value" stroke="none">
                  {entityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
