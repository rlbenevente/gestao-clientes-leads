import { useState, useMemo, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { CreditCard as CreditCardIcon, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Transaction } from '../types/finance';

export default function FinanceInvoices() {
  const { creditCards, transactions, accounts, payCreditCardInvoice, initialize } = useFinanceStore();
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // Modal de pagamento de fatura
  const [isPaying, setIsPaying] = useState(false);
  const [payingInvoiceDate, setPayingInvoiceDate] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState('');

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (creditCards.length > 0 && !selectedCardId) {
      setSelectedCardId(creditCards[0].id);
    }
  }, [creditCards, selectedCardId]);

  const selectedCard = creditCards.find(c => c.id === selectedCardId);

  // Group transactions by invoiceDate for the selected card
  const invoices = useMemo(() => {
    if (!selectedCardId) return [];
    const cardTxs = transactions.filter(t => t.creditCardId === selectedCardId && t.invoiceDate);
    
    const groups: Record<string, Transaction[]> = {};
    for (const tx of cardTxs) {
      const date = tx.invoiceDate!;
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    }

    return Object.entries(groups)
      .map(([invoiceDate, txs]) => {
        const total = txs.reduce((sum, t) => sum + t.amount, 0);
        const isPaid = txs.every(t => t.status === 'paid');
        const hasOverdue = txs.some(t => t.status === 'pending' && new Date(t.dueDate) < new Date());
        
        // Data de vencimento baseada no dia de vencimento do cartão e no invoiceDate (Mês/Ano)
        const [year, month] = invoiceDate.split('-');
        const dueDate = new Date(Number(year), Number(month) - 1, selectedCard?.dueDay || 1);

        return {
          invoiceDate,
          dueDate,
          total,
          isPaid,
          hasOverdue,
          transactions: txs.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        };
      })
      .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime()); // Mais recentes primeiro
  }, [transactions, selectedCardId, selectedCard]);

  const handlePayClick = (invoiceDate: string) => {
    // Se o cartão já tem uma conta vinculada (débito automático), preenche
    if (selectedCard?.accountId) {
      setPaymentAccountId(selectedCard.accountId);
    }
    setPayingInvoiceDate(invoiceDate);
    setIsPaying(true);
  };

  const confirmPayment = async () => {
    if (!selectedCardId || !payingInvoiceDate || !paymentAccountId) return;
    await payCreditCardInvoice(selectedCardId, payingInvoiceDate, paymentAccountId);
    setIsPaying(false);
    setPayingInvoiceDate('');
  };

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Faturas e Cartões</h1>
        <p className="text-white/60">Controle suas compras no crédito e pague suas faturas.</p>
      </div>

      {creditCards.length === 0 ? (
        <div className="glass-panel p-8 text-center rounded-xl">
          <CreditCardIcon className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nenhum cartão encontrado</h2>
          <p className="text-white/50">Vá em Contas/Cartões e cadastre seu primeiro cartão de crédito.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Seletor de Cartões */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-bold text-lg mb-4">Meus Cartões</h3>
            {creditCards.map(card => (
              <button
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedCardId === card.id 
                  ? 'bg-white/10 border-blue-500' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCardIcon className={`w-6 h-6 ${selectedCardId === card.id ? 'text-blue-500' : 'text-white/40'}`} />
                  <div>
                    <p className="font-bold">{card.name}</p>
                    <p className="text-xs text-white/50">Fechamento: dia {card.closingDay}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Lista de Faturas do Cartão Selecionado */}
          <div className="lg:col-span-3">
            {selectedCard && (
              <div className="glass-panel p-6 rounded-xl mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCard.name}</h2>
                  <p className="text-white/60">Limite: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCard.creditLimit)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white/50">Dia de Vencimento</p>
                  <p className="font-bold text-xl">{selectedCard.dueDay}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {invoices.length === 0 ? (
                <p className="text-white/40 text-center py-8 glass-panel rounded-xl">Nenhuma fatura encontrada para este cartão.</p>
              ) : (
                invoices.map((invoice) => {
                  const isExpanded = expandedInvoice === invoice.invoiceDate;
                  const monthName = invoice.dueDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

                  return (
                    <div key={invoice.invoiceDate} className={`glass-panel rounded-xl overflow-hidden border-l-4 ${
                      invoice.isPaid ? 'border-l-green-500' : invoice.hasOverdue ? 'border-l-red-500' : 'border-l-blue-500'
                    }`}>
                      <div 
                        className="p-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => setExpandedInvoice(isExpanded ? null : invoice.invoiceDate)}
                      >
                        <div>
                          <h3 className="font-bold text-lg capitalize flex items-center gap-2">
                            Fatura de {monthName}
                            {invoice.isPaid && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            {!invoice.isPaid && invoice.hasOverdue && <AlertCircle className="w-5 h-5 text-red-500" />}
                          </h3>
                          <p className="text-sm text-white/50">
                            Vencimento: {invoice.dueDate.toLocaleDateString('pt-BR')} • {invoice.transactions.length} compras
                          </p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-bold text-xl">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.total)}</p>
                            <p className={`text-xs uppercase font-bold ${
                              invoice.isPaid ? 'text-green-500' : invoice.hasOverdue ? 'text-red-500' : 'text-blue-500'
                            }`}>
                              {invoice.isPaid ? 'Paga' : invoice.hasOverdue ? 'Atrasada' : 'Aberta'}
                            </p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-5 bg-black/40 border-t border-white/5">
                          <div className="space-y-3 mb-6">
                            {invoice.transactions.map(tx => (
                              <div key={tx.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                <div>
                                  <p className="font-medium text-sm">{tx.description}</p>
                                  <p className="text-xs text-white/50">Em {new Date(tx.dueDate).toLocaleDateString('pt-BR')} {tx.installmentNumber ? `(Parcela ${tx.installmentNumber})` : ''}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-sm">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {!invoice.isPaid && (
                            <div className="flex justify-end">
                              <button onClick={(e) => { e.stopPropagation(); handlePayClick(invoice.invoiceDate); }} className="btn-primary">
                                Pagar Fatura
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento de Fatura */}
      {isPaying && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 relative">
            <h2 className="text-xl font-bold mb-6">Pagar Fatura</h2>
            <p className="text-sm text-white/70 mb-4">
              O valor total da fatura será debitado da conta bancária que você selecionar abaixo.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Pagar usando qual Conta?</label>
                <select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className="input-field w-full" required>
                  <option value="">Selecione a Conta Bancária...</option>
                  {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
                <button type="button" onClick={() => setIsPaying(false)} className="btn-secondary">Cancelar</button>
                <button type="button" onClick={confirmPayment} disabled={!paymentAccountId} className="btn-primary">
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
