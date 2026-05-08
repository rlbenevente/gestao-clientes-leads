import { useState, useMemo, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from 'lucide-react';
import type { Transaction } from '../types/finance';

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function FinanceCalendar() {
  const { transactions, initialize, isLoading } = useFinanceStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filtros
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'expense' | 'income'>('ALL');
  const [entityFilter, setEntityFilter] = useState<'ALL' | 'PF' | 'PJ'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'paid'>('ALL');

  useEffect(() => {
    initialize();
  }, [initialize]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Gera os dias do calendário (grid 6x7)
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];
    
    // Dias do mês anterior
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
    }
    
    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    
    // Dias do próximo mês para completar 42 blocos (6 semanas)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }

    return days;
  }, [year, month]);

  // Agrupa transações por data (YYYY-MM-DD)
  const transactionsByDate = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    transactions.forEach(t => {
      // Aplica filtros
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return;
      if (entityFilter !== 'ALL' && t.entityType !== entityFilter) return;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return;

      const dateStr = t.dueDate; // Formato YYYY-MM-DD
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(t);
    });
    
    return groups;
  }, [transactions, typeFilter, entityFilter, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--color-ls-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-[var(--color-ls-accent)]" />
            Calendário Financeiro
          </h1>
          <p className="text-white/60">Visualize seus recebimentos e vencimentos por dia.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="glass-panel px-3 py-1.5 rounded-lg flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/40" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="bg-transparent text-sm border-none outline-none text-white cursor-pointer">
              <option value="ALL" className="bg-black">Todas as Transações</option>
              <option value="income" className="bg-black">Apenas Receitas</option>
              <option value="expense" className="bg-black">Apenas Despesas</option>
            </select>
          </div>

          <div className="glass-panel px-3 py-1.5 rounded-lg">
            <select value={entityFilter} onChange={e => setEntityFilter(e.target.value as any)} className="bg-transparent text-sm border-none outline-none text-white cursor-pointer">
              <option value="ALL" className="bg-black">PF + PJ</option>
              <option value="PF" className="bg-black">Apenas PF</option>
              <option value="PJ" className="bg-black">Apenas PJ</option>
            </select>
          </div>
          
          <div className="glass-panel px-3 py-1.5 rounded-lg">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-transparent text-sm border-none outline-none text-white cursor-pointer">
              <option value="ALL" className="bg-black">Qualquer Status</option>
              <option value="pending" className="bg-black">Apenas Pendentes</option>
              <option value="paid" className="bg-black">Apenas Pagos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">
        {/* Header do Calendário */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-2xl font-bold">{MONTHS[month]} <span className="text-white/40">{year}</span></h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-bold hover:bg-white/10 rounded-lg transition-colors">Hoje</button>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Dias da Semana */}
        <div className="grid grid-cols-7 border-b border-white/5 bg-black/20">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="p-4 text-center text-sm font-bold text-white/40">
              {day}
            </div>
          ))}
        </div>

        {/* Grid de Dias */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr">
          {calendarDays.map((dayObj, i) => {
            // Formata a data para buscar no dicionário YYYY-MM-DD local timezone
            const tzDate = new Date(dayObj.date.getTime() - (dayObj.date.getTimezoneOffset() * 60000));
            const dateStr = tzDate.toISOString().split('T')[0];
            
            const dayTxs = transactionsByDate[dateStr] || [];
            const isToday = dateStr === new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

            return (
              <div 
                key={i} 
                className={`min-h-[120px] p-2 border-r border-b border-white/5 transition-colors
                  ${!dayObj.isCurrentMonth ? 'bg-black/40 text-white/20' : 'hover:bg-white/5'}
                  ${isToday ? 'bg-[var(--color-ls-accent)]/10 border-t-2 border-t-[var(--color-ls-accent)]' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--color-ls-accent)] text-white' : ''}`}>
                    {dayObj.day}
                  </span>
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar pr-1">
                  {dayTxs.map(tx => (
                    <div 
                      key={tx.id} 
                      className={`text-[10px] px-2 py-1 rounded truncate flex justify-between gap-2 border-l-2
                        ${tx.type === 'income' ? 'bg-blue-500/10 text-blue-300 border-blue-500' : 'bg-red-500/10 text-red-300 border-red-500'}
                        ${tx.status === 'paid' ? 'opacity-50 line-through' : ''}
                      `}
                      title={`${tx.description} - R$ ${tx.amount}`}
                    >
                      <span className="truncate">{tx.description}</span>
                      <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
