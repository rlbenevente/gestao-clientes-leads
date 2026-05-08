import { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Plus, Trash2, ArrowRightLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { StatusBadge } from '../components/ui/Badge';
import TransactionModal from '../components/finance/TransactionModal';

export default function FinanceTransactions() {
  const { transactions, transfers, initialize, deleteTransaction, deleteTransfer } = useFinanceStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [filterEntity, setFilterEntity] = useState<'ALL' | 'PF' | 'PJ'>('ALL');

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Merge transactions and transfers for a unified timeline
  const unifiedTimeline = [
    ...transactions.map(t => ({ ...t, _modelType: 'transaction' })),
    ...transfers.map(t => ({ 
      id: t.id, 
      dueDate: t.transferDate, 
      amount: t.amount, 
      type: 'transfer', 
      description: t.notes || 'Transferência entre contas', 
      status: 'paid', // Transfer is always "paid" when it happens
      entityType: 'PF', // Just a visual fallback
      _modelType: 'transfer',
      originalTransfer: t
    }))
  ].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  // Apply filters
  const filteredTimeline = unifiedTimeline.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterEntity !== 'ALL' && item._modelType === 'transaction' && item.entityType !== filterEntity) return false;
    return true;
  });

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Lançamentos</h1>
          <p className="text-white/60">Histórico completo de despesas, receitas e transferências.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Novo Lançamento
        </button>
      </div>

      <div className="glass-panel p-6 rounded-xl">
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-white/5">
          <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg">
            <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${filterType === 'all' ? 'bg-white/10 font-bold' : 'text-white/50 hover:text-white'}`}>Todos</button>
            <button onClick={() => setFilterType('income')} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${filterType === 'income' ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-white/50 hover:text-white'}`}>Receitas</button>
            <button onClick={() => setFilterType('expense')} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${filterType === 'expense' ? 'bg-red-500/20 text-red-400 font-bold' : 'text-white/50 hover:text-white'}`}>Despesas</button>
            <button onClick={() => setFilterType('transfer')} className={`px-4 py-1.5 rounded-md text-sm transition-colors ${filterType === 'transfer' ? 'bg-purple-500/20 text-purple-400 font-bold' : 'text-white/50 hover:text-white'}`}>Transferências</button>
          </div>
          
          <select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value as any)} className="input-field text-sm">
            <option value="ALL">Todas Entidades</option>
            <option value="PF">Apenas PF</option>
            <option value="PJ">Apenas Agência (PJ)</option>
          </select>
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {filteredTimeline.length === 0 ? (
            <p className="text-center text-white/40 py-8">Nenhum lançamento encontrado.</p>
          ) : (
            filteredTimeline.map(item => (
              <div key={`${item._modelType}-${item.id}`} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    item.type === 'income' ? 'bg-blue-500/20 text-blue-500' :
                    item.type === 'expense' ? 'bg-red-500/20 text-red-500' :
                    'bg-purple-500/20 text-purple-500'
                  }`}>
                    {item.type === 'income' ? <ArrowUpRight className="w-5 h-5" /> : 
                     item.type === 'expense' ? <ArrowDownRight className="w-5 h-5" /> : 
                     <ArrowRightLeft className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold">{item.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                      <span>{new Date(item.dueDate).toLocaleDateString('pt-BR')}</span>
                      {item._modelType === 'transaction' && (item as any).category && (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: (item as any).category.color }}></span>
                          {(item as any).category.name}
                        </span>
                      )}
                      {item._modelType === 'transaction' && (
                        <span className="uppercase border border-white/10 px-1.5 rounded">{(item as any).entityType}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className={`font-bold ${item.type === 'income' ? 'text-blue-400' : item.type === 'expense' ? 'text-red-400' : 'text-purple-400'}`}>
                      {item.type === 'expense' ? '-' : item.type === 'income' ? '+' : ''}
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                    </p>
                    <StatusBadge status={item.status as any} />
                  </div>
                  
                  <div className="flex gap-2">
                    <button onClick={() => {
                      if (item._modelType === 'transaction') deleteTransaction(item.id);
                      else deleteTransfer(item.id);
                    }} className="p-2 text-white/30 hover:text-red-500 transition-colors" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
