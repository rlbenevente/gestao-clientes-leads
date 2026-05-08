import { useState, useEffect } from 'react';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { TransactionStatus, TransactionType, EntityType } from '../../types/finance';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransactionModal({ isOpen, onClose }: TransactionModalProps) {
  const { 
    addTransaction, addTransfer, 
    categories, accounts, creditCards, automationRules, transactions,
    isLoading 
  } = useFinanceStore();
  
  // Tabs: expense, income, transfer
  const [tab, setTab] = useState<'expense' | 'income' | 'transfer'>('expense');

  // Common Fields
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [entityType, setEntityType] = useState<EntityType>('PF');
  const [notes, setNotes] = useState('');

  // Transaction Fields
  const [status, setStatus] = useState<TransactionStatus>('pending');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  
  // "Forma de pagamento" (Conta vs Cartão)
  const [paymentSource, setPaymentSource] = useState<'account' | 'creditCard'>('account');
  const [accountId, setAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [recurrenceMonths, setRecurrenceMonths] = useState(1);
  const [isRecurrent, setIsRecurrent] = useState(false);

  // Transfer Fields
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');

  const [suggestedBy, setSuggestedBy] = useState<'rule' | 'history' | null>(null);

  useEffect(() => {
    if (!description || tab === 'transfer') {
      setSuggestedBy(null);
      return;
    }

    const lowerDesc = description.toLowerCase();

    // 1. Tenta regra manual configurada
    const rule = automationRules.find(r => lowerDesc.includes(r.keyword.toLowerCase()));
    if (rule) {
      setCategoryId(rule.categoryId);
      if (rule.subcategoryId) setSubcategoryId(rule.subcategoryId);
      setSuggestedBy('rule');
      return;
    }

    // 2. Aprendizado por histórico (pega a mais recente com nome parecido)
    const historyMatch = transactions.find(t => 
      t.type === tab && 
      t.categoryId && 
      t.description.toLowerCase().includes(lowerDesc)
    );

    if (historyMatch) {
      setCategoryId(historyMatch.categoryId!);
      if (historyMatch.subcategoryId) setSubcategoryId(historyMatch.subcategoryId);
      setSuggestedBy('history');
      return;
    }

    setSuggestedBy(null);
  }, [description, automationRules, transactions, tab]);

  if (!isOpen) return null;

  const currentCategories = categories.filter(c => c.type === (tab === 'income' ? 'income' : 'expense'));
  const currentSubcategories = currentCategories.find(c => c.id === categoryId)?.subcategories || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !dueDate) return;

    if (tab === 'transfer') {
      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return;
      await addTransfer({
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        transferDate: dueDate,
        notes: description
      });
    } else {
      if (!description) return;
      
      const recurrence = isRecurrent ? { frequency: 'monthly', months: recurrenceMonths } : undefined;

      await addTransaction({
        type: tab as TransactionType,
        entityType,
        description,
        amount: Number(amount),
        dueDate,
        status,
        paymentDate: status === 'paid' ? new Date().toISOString() : undefined,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        accountId: paymentSource === 'account' ? accountId : undefined,
        creditCardId: paymentSource === 'creditCard' ? creditCardId : undefined,
        notes
      }, installmentsCount, recurrence);
    }

    // Reset
    setDescription('');
    setAmount('');
    setDueDate('');
    setStatus('pending');
    setCategoryId('');
    setSubcategoryId('');
    setAccountId('');
    setCreditCardId('');
    setInstallmentsCount(1);
    setIsRecurrent(false);
    setRecurrenceMonths(1);
    setFromAccountId('');
    setToAccountId('');
    setNotes('');
    setSuggestedBy(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-xl rounded-2xl relative my-8">
        
        {/* Header com Tabs */}
        <div className="flex border-b border-white/10">
          <button 
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${tab === 'expense' ? 'border-red-500 text-red-500' : 'border-transparent text-white/50 hover:text-white'}`}
            onClick={() => setTab('expense')}
          >
            Despesa
          </button>
          <button 
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${tab === 'income' ? 'border-blue-500 text-blue-500' : 'border-transparent text-white/50 hover:text-white'}`}
            onClick={() => setTab('income')}
          >
            Receita
          </button>
          <button 
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${tab === 'transfer' ? 'border-purple-500 text-purple-500' : 'border-transparent text-white/50 hover:text-white'}`}
            onClick={() => setTab('transfer')}
          >
            Transferência
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Campos Universais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-white/70 mb-1">
                {tab === 'transfer' ? 'Descrição / Motivo' : 'Descrição'}
              </label>
              <input 
                type="text" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-field w-full" 
                placeholder={tab === 'transfer' ? "Ex: Reserva de emergência" : "Ex: Conta de Luz"}
                required={tab !== 'transfer'}
              />
              {suggestedBy && tab !== 'transfer' && (
                <p className="text-xs mt-2 text-[var(--color-ls-accent)] flex items-center gap-1">
                  ✨ Categoria sugerida via {suggestedBy === 'rule' ? 'regra de automação' : 'histórico'}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Valor (R$)</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field w-full" 
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">Data</label>
              <input 
                type="date" 
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-field w-full" 
                required
              />
            </div>
          </div>

          {/* TRANSFERÊNCIA ESPECÍFICA */}
          {tab === 'transfer' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Conta de Origem</label>
                <select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className="input-field w-full" required>
                  <option value="">Selecione...</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Conta de Destino</label>
                <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="input-field w-full" required>
                  <option value="">Selecione...</option>
                  {accounts.filter(a => a.id !== fromAccountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* DESPESA E RECEITA ESPECÍFICA */}
          {tab !== 'transfer' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Categoria</label>
                  <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(''); }} className="input-field w-full">
                    <option value="">Nenhuma</option>
                    {currentCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Subcategoria</label>
                  <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="input-field w-full" disabled={!categoryId || currentSubcategories.length === 0}>
                    <option value="">Nenhuma</option>
                    {currentSubcategories.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={paymentSource === 'account'} onChange={() => setPaymentSource('account')} className="accent-[var(--color-ls-accent)]" />
                    <span className="text-sm">Pagar com Conta</span>
                  </label>
                  {tab === 'expense' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={paymentSource === 'creditCard'} onChange={() => setPaymentSource('creditCard')} className="accent-[var(--color-ls-accent)]" />
                      <span className="text-sm">Pagar com Cartão</span>
                    </label>
                  )}
                </div>
                
                {paymentSource === 'account' ? (
                  <div className="space-y-3">
                    <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input-field w-full">
                      <option value="">Selecione a Conta Bancária...</option>
                      {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                    
                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={isRecurrent} onChange={(e) => { setIsRecurrent(e.target.checked); setInstallmentsCount(1); }} className="w-4 h-4 rounded bg-black border-white/20" />
                        <span className="text-sm font-medium">Conta Recorrente?</span>
                      </label>
                      {isRecurrent && (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs text-white/50">Gerar para os próximos:</span>
                          <select value={recurrenceMonths} onChange={(e) => setRecurrenceMonths(Number(e.target.value))} className="input-field py-1 text-sm flex-1">
                            {[3, 6, 12, 24, 36].map(m => <option key={m} value={m}>{m} meses</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <select value={creditCardId} onChange={(e) => setCreditCardId(e.target.value)} className="input-field w-full">
                      <option value="">Selecione o Cartão...</option>
                      {creditCards.map(card => <option key={card.id} value={card.id}>{card.name}</option>)}
                    </select>
                    <select value={installmentsCount} onChange={(e) => { setInstallmentsCount(Number(e.target.value)); setIsRecurrent(false); }} className="input-field w-full">
                      {[...Array(24)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}x {i+1 === 1 ? 'à vista' : ''}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Status</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as TransactionStatus)} className="input-field w-full">
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago / Recebido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Perfil (PF/PJ)</label>
                  <select value={entityType} onChange={(e) => setEntityType(e.target.value as EntityType)} className="input-field w-full">
                    <option value="PF">Pessoal (PF)</option>
                    <option value="PJ">Agência (PJ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Observações (Opcional)</label>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field w-full" placeholder="Ex: NF nº 1234..." />
              </div>
            </>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t border-white/5 mt-6">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {tab === 'transfer' ? 'Realizar Transferência' : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
