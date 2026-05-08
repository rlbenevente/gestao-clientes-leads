import { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Landmark, CreditCard as CreditCardIcon, Trash2, Edit2, Plus } from 'lucide-react';
import type { Account, CreditCard, AccountType, EntityType } from '../types/finance';

export default function FinanceAccounts() {
  const { 
    accounts, creditCards, initialize, 
    addAccount, updateAccount, deleteAccount, 
    addCreditCard, updateCreditCard, deleteCreditCard, 
    isLoading 
  } = useFinanceStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accName, setAccName] = useState('');
  const [accBank, setAccBank] = useState('');
  const [accType, setAccType] = useState<AccountType>('checking');
  const [accEntity, setAccEntity] = useState<EntityType>('PF');
  const [accBalance, setAccBalance] = useState('');
  const [accColor, setAccColor] = useState('#10B981');

  // Card Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardFlag, setCardFlag] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardClosing, setCardClosing] = useState('');
  const [cardDue, setCardDue] = useState('');
  const [cardAdditional, setCardAdditional] = useState(false);
  const [cardAccountId, setCardAccountId] = useState('');

  const openAccountModal = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setAccName(acc.name);
      setAccBank(acc.bank || '');
      setAccType(acc.type);
      setAccEntity(acc.entityType);
      setAccBalance(acc.initialBalance.toString());
      setAccColor(acc.color || '#10B981');
    } else {
      setEditingAccount(null);
      setAccName('');
      setAccBank('');
      setAccType('checking');
      setAccEntity('PF');
      setAccBalance('0');
      setAccColor('#10B981');
    }
    setIsAccountModalOpen(true);
  };

  const openCardModal = (card?: CreditCard) => {
    if (card) {
      setEditingCard(card);
      setCardName(card.name);
      setCardFlag(card.flag || '');
      setCardLimit(card.creditLimit.toString());
      setCardClosing(card.closingDay.toString());
      setCardDue(card.dueDay.toString());
      setCardAdditional(card.isAdditional);
      setCardAccountId(card.accountId || '');
    } else {
      setEditingCard(null);
      setCardName('');
      setCardFlag('');
      setCardLimit('0');
      setCardClosing('1');
      setCardDue('10');
      setCardAdditional(false);
      setCardAccountId('');
    }
    setIsCardModalOpen(true);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: accName,
      bank: accBank,
      type: accType,
      entityType: accEntity,
      initialBalance: Number(accBalance),
      color: accColor
    };

    if (editingAccount) await updateAccount(editingAccount.id, payload);
    else await addAccount(payload);

    setIsAccountModalOpen(false);
  };

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: cardName,
      flag: cardFlag,
      isAdditional: cardAdditional,
      closingDay: Number(cardClosing),
      dueDay: Number(cardDue),
      creditLimit: Number(cardLimit),
      accountId: cardAccountId || undefined
    };

    if (editingCard) await updateCreditCard(editingCard.id, payload);
    else await addCreditCard(payload);

    setIsCardModalOpen(false);
  };

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Contas e Cartões</h1>
        <p className="text-white/60">Gerencie seus bancos, carteiras e limites de crédito.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUNA: CONTAS BANCÁRIAS */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Landmark className="w-5 h-5 text-emerald-500" />
              Contas Bancárias
            </h2>
            <button onClick={() => openAccountModal()} className="btn-secondary text-sm py-1.5 px-3">
              <Plus className="w-4 h-4" /> Nova Conta
            </button>
          </div>

          <div className="space-y-4">
            {accounts.length === 0 ? (
              <p className="text-white/40 text-center py-8 glass-panel rounded-xl">Nenhuma conta cadastrada.</p>
            ) : accounts.map(acc => (
              <div key={acc.id} className="glass-panel p-5 rounded-xl border-l-4" style={{ borderLeftColor: acc.color || '#10B981' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {acc.name}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider text-white/70">
                        {acc.entityType}
                      </span>
                    </h3>
                    <p className="text-sm text-white/50">{acc.bank || 'Banco não informado'} • {acc.type}</p>
                    <p className="mt-2 font-medium">Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.initialBalance)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openAccountModal(acc)} className="p-2 text-white/40 hover:text-white transition-colors" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteAccount(acc.id)} className="p-2 text-white/40 hover:text-red-500 transition-colors" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUNA: CARTÕES DE CRÉDITO */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-blue-500" />
              Cartões de Crédito
            </h2>
            <button onClick={() => openCardModal()} className="btn-secondary text-sm py-1.5 px-3">
              <Plus className="w-4 h-4" /> Novo Cartão
            </button>
          </div>

          <div className="space-y-4">
            {creditCards.length === 0 ? (
              <p className="text-white/40 text-center py-8 glass-panel rounded-xl">Nenhum cartão cadastrado.</p>
            ) : creditCards.map(card => (
              <div key={card.id} className="glass-panel p-5 rounded-xl border border-white/5 bg-gradient-to-br from-[#111] to-[#1a1a1a]">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      {card.name}
                      {card.isAdditional && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider text-white/70">Adicional</span>}
                    </h3>
                    <p className="text-sm text-white/50">{card.flag || 'Bandeira não informada'}</p>
                    
                    <div className="mt-3 flex gap-4 text-sm text-white/70">
                      <div>
                        <span className="block text-[10px] uppercase text-white/40 mb-0.5">Limite</span>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.creditLimit)}
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-white/40 mb-0.5">Fechamento</span>
                        Dia {card.closingDay}
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase text-white/40 mb-0.5">Vencimento</span>
                        Dia {card.dueDay}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openCardModal(card)} className="p-2 text-white/40 hover:text-white transition-colors" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteCreditCard(card.id)} className="p-2 text-white/40 hover:text-red-500 transition-colors" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MODAL DE CONTA */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 relative">
            <h2 className="text-xl font-bold mb-6">{editingAccount ? 'Editar Conta' : 'Nova Conta Bancária'}</h2>
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-white/70 mb-1">Nome da Conta</label>
                  <input type="text" value={accName} onChange={e => setAccName(e.target.value)} className="input-field w-full" required />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Banco</label>
                  <input type="text" value={accBank} onChange={e => setAccBank(e.target.value)} className="input-field w-full" placeholder="Ex: Nubank" />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Tipo</label>
                  <select value={accType} onChange={e => setAccType(e.target.value as AccountType)} className="input-field w-full">
                    <option value="checking">Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimento</option>
                    <option value="wallet">Carteira Física</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Perfil (PF/PJ)</label>
                  <select value={accEntity} onChange={e => setAccEntity(e.target.value as EntityType)} className="input-field w-full">
                    <option value="PF">Pessoa Física</option>
                    <option value="PJ">Empresa (PJ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Saldo Atual</label>
                  <input type="number" step="0.01" value={accBalance} onChange={e => setAccBalance(e.target.value)} className="input-field w-full" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-white/70 mb-1">Cor</label>
                  <input type="color" value={accColor} onChange={e => setAccColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAccountModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isLoading} className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CARTÃO */}
      {isCardModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 relative">
            <h2 className="text-xl font-bold mb-6">{editingCard ? 'Editar Cartão' : 'Novo Cartão de Crédito'}</h2>
            <form onSubmit={handleCardSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-white/70 mb-1">Nome do Cartão</label>
                  <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} className="input-field w-full" required />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Bandeira</label>
                  <input type="text" value={cardFlag} onChange={e => setCardFlag(e.target.value)} className="input-field w-full" placeholder="Ex: Mastercard" />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Limite</label>
                  <input type="number" step="0.01" value={cardLimit} onChange={e => setCardLimit(e.target.value)} className="input-field w-full" required />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Dia de Fechamento</label>
                  <input type="number" min="1" max="31" value={cardClosing} onChange={e => setCardClosing(e.target.value)} className="input-field w-full" required />
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Dia de Vencimento</label>
                  <input type="number" min="1" max="31" value={cardDue} onChange={e => setCardDue(e.target.value)} className="input-field w-full" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-white/70 mb-1">Débito Automático (Conta)</label>
                  <select value={cardAccountId} onChange={e => setCardAccountId(e.target.value)} className="input-field w-full">
                    <option value="">Nenhuma conta</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input type="checkbox" checked={cardAdditional} onChange={e => setCardAdditional(e.target.checked)} className="accent-[var(--color-ls-accent)] w-4 h-4" />
                    <span className="text-sm">É um cartão adicional?</span>
                  </label>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCardModalOpen(false)} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={isLoading} className="btn-primary">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
