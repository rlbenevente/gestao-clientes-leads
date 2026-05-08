import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Category, Subcategory, Transaction, Workspace, Account, CreditCard, Transfer, AutomationRule } from '../types/finance';

const calculateCreditCardDates = (purchaseDateStr: string, closingDay: number, dueDay: number, offsetMonths: number = 0) => {
  const purchase = new Date(purchaseDateStr + 'T00:00:00');
  let invoiceMonth = purchase.getMonth();
  let invoiceYear = purchase.getFullYear();

  if (purchase.getDate() >= closingDay) {
    invoiceMonth += 1;
  }

  invoiceMonth += offsetMonths;

  const normalized = new Date(invoiceYear, invoiceMonth, 1);
  const finalYear = normalized.getFullYear();
  const finalMonth = normalized.getMonth();

  const invoiceDateStr = `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-01`;
  const daysInMonth = new Date(finalYear, finalMonth + 1, 0).getDate();
  const actualDueDay = Math.min(dueDay, daysInMonth);
  const dueDateStr = `${finalYear}-${String(finalMonth + 1).padStart(2, '0')}-${String(actualDueDay).padStart(2, '0')}`;

  return { invoiceDateStr, dueDateStr };
};

interface FinanceState {
  workspace: Workspace | null;
  categories: Category[];
  transactions: Transaction[];
  accounts: Account[];
  creditCards: CreditCard[];
  transfers: Transfer[];
  automationRules: AutomationRule[];
  isLoading: boolean;
  
  initialize: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchAccounts: () => Promise<void>;
  fetchCreditCards: () => Promise<void>;
  fetchTransfers: () => Promise<void>;
  fetchAutomationRules: () => Promise<void>;

  addAutomationRule: (rule: Omit<AutomationRule, 'id' | 'workspaceId'>) => Promise<void>;
  deleteAutomationRule: (id: string) => Promise<void>;

  addTransaction: (transaction: Partial<Transaction>, installmentsCount?: number, recurrence?: { frequency: string, months: number }) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  markTransactionAsPaid: (id: string, date?: string) => Promise<void>;
  
  payCreditCardInvoice: (creditCardId: string, invoiceDate: string, accountId: string) => Promise<void>;

  addTransfer: (transfer: Omit<Transfer, 'id' | 'workspaceId'>) => Promise<void>;
  deleteTransfer: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'workspaceId'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addSubcategory: (subcategory: Omit<Subcategory, 'id'>) => Promise<void>;
  deleteSubcategory: (id: string) => Promise<void>;

  addAccount: (account: Omit<Account, 'id' | 'workspaceId'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  addCreditCard: (card: Omit<CreditCard, 'id' | 'workspaceId'>) => Promise<void>;
  updateCreditCard: (id: string, data: Partial<CreditCard>) => Promise<void>;
  deleteCreditCard: (id: string) => Promise<void>;
}

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  workspace: null,
  categories: [],
  transactions: [],
  accounts: [],
  creditCards: [],
  transfers: [],
  automationRules: [],
  isLoading: false,

  initialize: async () => {
    set({ isLoading: true });

    // Pega a sessão atual garantida pelo Auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      set({ isLoading: false });
      return;
    }

    // Busca o primeiro workspace que o usuário tem acesso (dono ou membro)
    let { data: workspace, error: wsError } = await supabase.from('fin_workspaces').select('*').limit(1).single();

    // Se o RLS bloqueou (nenhum workspace encontrado), cria um padrão!
    if (!workspace || wsError) {
      console.log('Nenhum workspace encontrado. Criando workspace inicial...');
      const { data: newWorkspace, error: createError } = await supabase.from('fin_workspaces').insert([{
        name: 'Meu Workspace Financeiro',
        owner_id: session.user.id
      }]).select().single();
      
      if (createError || !newWorkspace) {
        console.error('Falha ao criar workspace inicial:', createError);
        set({ isLoading: false });
        return;
      }
      workspace = newWorkspace;
    }

    set({ workspace });

    await Promise.all([
        get().fetchCategories(),
        get().fetchTransactions(),
        get().fetchAccounts(),
        get().fetchCreditCards(),
        get().fetchTransfers(),
        get().fetchAutomationRules()
    ]);
    set({ isLoading: false });
  },

  fetchAutomationRules: async () => {
    const ws = get().workspace;
    if (!ws) return;
    const { data } = await supabase.from('fin_automation_rules').select('*').eq('workspace_id', ws.id);
    const automationRules: AutomationRule[] = (data || []).map(r => ({
      id: r.id,
      workspaceId: r.workspace_id,
      keyword: r.keyword,
      categoryId: r.category_id,
      subcategoryId: r.subcategory_id
    }));
    set({ automationRules });
  },

  addAutomationRule: async (rule) => {
    const ws = get().workspace;
    if (!ws) return;
    await supabase.from('fin_automation_rules').insert([{
      workspace_id: ws.id,
      keyword: rule.keyword.toLowerCase(),
      category_id: rule.categoryId,
      subcategory_id: rule.subcategoryId
    }]);
    await get().fetchAutomationRules();
  },

  deleteAutomationRule: async (id) => {
    await supabase.from('fin_automation_rules').delete().eq('id', id);
    await get().fetchAutomationRules();
  },

  fetchTransfers: async () => {
    const ws = get().workspace;
    if (!ws) return;
    const { data } = await supabase.from('fin_transfers').select('*').eq('workspace_id', ws.id);
    const transfers: Transfer[] = (data || []).map(t => ({
      id: t.id,
      workspaceId: t.workspace_id,
      fromAccountId: t.from_account_id,
      toAccountId: t.to_account_id,
      amount: Number(t.amount),
      transferDate: t.transfer_date,
      notes: t.notes
    }));
    set({ transfers });
  },

  fetchAccounts: async () => {
    const ws = get().workspace;
    if (!ws) return;
    const { data } = await supabase.from('fin_accounts').select('*').eq('workspace_id', ws.id);
    const accounts: Account[] = (data || []).map(a => ({
      id: a.id,
      workspaceId: a.workspace_id,
      name: a.name,
      bank: a.bank,
      type: a.type,
      entityType: a.entity_type,
      initialBalance: Number(a.initial_balance),
      color: a.color
    }));
    set({ accounts });
  },

  fetchCreditCards: async () => {
    const ws = get().workspace;
    if (!ws) return;
    const { data } = await supabase.from('fin_credit_cards').select('*').eq('workspace_id', ws.id);
    const creditCards: CreditCard[] = (data || []).map(c => ({
      id: c.id,
      workspaceId: c.workspace_id,
      accountId: c.account_id,
      name: c.name,
      flag: c.flag,
      isAdditional: c.is_additional,
      closingDay: c.closing_day,
      dueDay: c.due_day,
      creditLimit: Number(c.credit_limit)
    }));
    set({ creditCards });
  },

  fetchTransactions: async () => {
    const ws = get().workspace;
    if (!ws) return;

    const { data: trans, error } = await supabase
      .from('fin_transactions')
      .select('*, category:fin_categories(*), account:fin_accounts(*)')
      .eq('workspace_id', ws.id);

    if (error) console.error('Error fetching transactions:', error);

    const transactions: Transaction[] = (trans || []).map(t => ({
      id: t.id,
      workspaceId: t.workspace_id,
      accountId: t.account_id,
      categoryId: t.category_id,
      type: t.type,
      entityType: t.entity_type,
      description: t.description,
      amount: Number(t.amount),
      dueDate: t.due_date,
      paymentDate: t.payment_date,
      status: t.status,
      category: t.category ? {
        id: t.category.id,
        workspaceId: t.category.workspace_id,
        name: t.category.name,
        type: t.category.type,
        color: t.category.color
      } : undefined
    }));

    set({ transactions });
  },

  fetchCategories: async () => {
    const ws = get().workspace;
    if (!ws) return;

    const { data: cats, error } = await supabase
      .from('fin_categories')
      .select('*, subcategories:fin_subcategories(*)')
      .eq('workspace_id', ws.id);

    if (error) console.error('Error fetching categories:', error);

    const categories: Category[] = (cats || []).map(c => ({
      id: c.id,
      workspaceId: c.workspace_id,
      name: c.name,
      type: c.type,
      color: c.color,
      subcategories: (c.subcategories || []).map((s: any) => ({
        id: s.id,
        categoryId: s.category_id,
        name: s.name
      }))
    }));

    set({ categories });
  },

  addCategory: async (category) => {
    const ws = get().workspace;
    if (!ws) return;
    set({ isLoading: true });

    const { error } = await supabase.from('fin_categories').insert([{
      workspace_id: ws.id,
      name: category.name,
      type: category.type,
      color: category.color
    }]);

    if (error) console.error('Error adding category:', error);
    await get().fetchCategories();
    set({ isLoading: false });
  },

  updateCategory: async (id, data) => {
    set({ isLoading: true });
    const { error } = await supabase.from('fin_categories').update({
      name: data.name,
      type: data.type,
      color: data.color
    }).eq('id', id);

    if (error) console.error('Error updating category:', error);
    await get().fetchCategories();
    set({ isLoading: false });
  },

  deleteCategory: async (id) => {
    set({ isLoading: true });
    const { error } = await supabase.from('fin_categories').delete().eq('id', id);
    if (error) console.error('Error deleting category:', error);
    await get().fetchCategories();
    set({ isLoading: false });
  },

  addSubcategory: async (subcategory) => {
    set({ isLoading: true });
    const { error } = await supabase.from('fin_subcategories').insert([{
      category_id: subcategory.categoryId,
      name: subcategory.name
    }]);

    if (error) console.error('Error adding subcategory:', error);
    await get().fetchCategories();
    set({ isLoading: false });
  },

  deleteSubcategory: async (id) => {
    set({ isLoading: true });
    const { error } = await supabase.from('fin_subcategories').delete().eq('id', id);
    if (error) console.error('Error deleting subcategory:', error);
    await get().fetchCategories();
    set({ isLoading: false });
  },

  addTransaction: async (data, installmentsCount = 1, recurrence) => {
    const ws = get().workspace;
    if (!ws) return;
    set({ isLoading: true });

    let installmentId: string | undefined;
    let recurrenceId: string | undefined;

    if (installmentsCount > 1) {
      const { data: inst } = await supabase.from('fin_installments').insert([{
        total_amount: data.amount,
        installments_count: installmentsCount
      }]).select().single();
      installmentId = inst?.id;
    }

    if (recurrence && installmentsCount === 1) {
      // Cria a recorrência
      const { data: rec } = await supabase.from('fin_recurrences').insert([{
        frequency: recurrence.frequency,
      }]).select().single();
      recurrenceId = rec?.id;
    }

    const card = data.creditCardId ? get().creditCards.find(c => c.id === data.creditCardId) : null;
    const isCredit = !!card;
    
    // Se for recorrência, geramos 'months' parcelas, mas com valor integral
    const count = recurrence ? recurrence.months : installmentsCount;
    const baseAmount = (installmentsCount > 1 && data.amount) ? data.amount / installmentsCount : data.amount;

    const payloads = [];

    for (let i = 0; i < count; i++) {
      let finalDueDate = data.dueDate!;
      let invoiceDateStr: string | undefined = undefined;

      if (isCredit) {
        const dates = calculateCreditCardDates(data.dueDate!, card.closingDay, card.dueDay, i);
        invoiceDateStr = dates.invoiceDateStr;
        finalDueDate = dates.dueDateStr;
      } else if (i > 0) {
        const nextMonth = new Date(data.dueDate! + 'T00:00:00');
        // Adiciona de acordo com a frequência (simplificado para meses no MVP)
        nextMonth.setMonth(nextMonth.getMonth() + i);
        finalDueDate = nextMonth.toISOString().split('T')[0];
      }

      payloads.push({
        workspace_id: ws.id,
        type: data.type || 'expense',
        entity_type: data.entityType || 'PF',
        description: installmentsCount > 1 ? `${data.description} (${i + 1}/${installmentsCount})` : data.description!,
        amount: baseAmount,
        due_date: finalDueDate,
        invoice_date: invoiceDateStr,
        status: data.status || 'pending',
        payment_date: data.paymentDate,
        category_id: data.categoryId,
        subcategory_id: data.subcategoryId,
        account_id: data.accountId,
        credit_card_id: data.creditCardId,
        installment_id: installmentId,
        recurrence_id: recurrenceId,
        installment_number: installmentsCount > 1 ? i + 1 : null,
        notes: data.notes
      });
    }

    const { error } = await supabase.from('fin_transactions').insert(payloads);
    if (error) console.error('Error adding transaction:', error);
    await get().fetchTransactions();
    set({ isLoading: false });
  },

  updateTransaction: async (id, data) => {
    set({ isLoading: true });
    const payload: any = {};
    if (data.type) payload.type = data.type;
    if (data.entityType) payload.entity_type = data.entityType;
    if (data.description) payload.description = data.description;
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.dueDate) payload.due_date = data.dueDate;
    if (data.status) payload.status = data.status;
    if (data.paymentDate !== undefined) payload.payment_date = data.paymentDate;
    if (data.categoryId !== undefined) payload.category_id = data.categoryId;
    if (data.subcategoryId !== undefined) payload.subcategory_id = data.subcategoryId;
    if (data.accountId !== undefined) payload.account_id = data.accountId;
    if (data.creditCardId !== undefined) payload.credit_card_id = data.creditCardId;
    if (data.notes !== undefined) payload.notes = data.notes;

    await supabase.from('fin_transactions').update(payload).eq('id', id);
    await get().fetchTransactions();
    set({ isLoading: false });
  },

  deleteTransaction: async (id) => {
    set({ isLoading: true });
    await supabase.from('fin_transactions').delete().eq('id', id);
    await get().fetchTransactions();
    set({ isLoading: false });
  },

  markTransactionAsPaid: async (id, paidDate = new Date().toISOString()) => {
    set((state) => ({
      transactions: state.transactions.map((t) => 
        t.id === id ? { ...t, status: 'paid', paymentDate: paidDate } : t
      ),
    }));

    const { error } = await supabase.from('fin_transactions').update({
        status: 'paid',
        payment_date: paidDate,
    }).eq('id', id);
    
    if (error) console.error('Error marking transaction as paid:', error);
  },

  payCreditCardInvoice: async (creditCardId, invoiceDate, accountId) => {
    const ws = get().workspace;
    if (!ws) return;
    set({ isLoading: true });

    const invoiceTxs = get().transactions.filter(t => 
      t.creditCardId === creditCardId && 
      t.invoiceDate === invoiceDate && 
      t.status === 'pending'
    );

    if (invoiceTxs.length === 0) {
      set({ isLoading: false });
      return;
    }

    const totalAmount = invoiceTxs.reduce((sum, t) => sum + t.amount, 0);
    const card = get().creditCards.find(c => c.id === creditCardId);
    const invoiceMonthYear = invoiceDate.substring(0, 7);

    // Creates the payment expense in the bank account
    await supabase.from('fin_transactions').insert([{
      workspace_id: ws.id,
      type: 'expense',
      entity_type: invoiceTxs[0].entityType || 'PF',
      description: `Pagamento Fatura ${card?.name || ''} - ${invoiceMonthYear}`,
      amount: totalAmount,
      due_date: new Date().toISOString().split('T')[0],
      payment_date: new Date().toISOString(),
      status: 'paid',
      account_id: accountId,
      notes: 'Gerado automaticamente ao pagar fatura.'
    }]);

    // Marks all invoice transactions as paid
    const txIds = invoiceTxs.map(t => t.id);
    await supabase.from('fin_transactions')
      .update({ status: 'paid', payment_date: new Date().toISOString() })
      .in('id', txIds);

    await get().fetchTransactions();
    set({ isLoading: false });
  },

  addTransfer: async (data) => {
    const ws = get().workspace;
    if (!ws) return;
    set({ isLoading: true });
    await supabase.from('fin_transfers').insert([{
      workspace_id: ws.id,
      from_account_id: data.fromAccountId,
      to_account_id: data.toAccountId,
      amount: data.amount,
      transfer_date: data.transferDate,
      notes: data.notes
    }]);

    // Opcional: Atualizar os saldos nas contas (Se não usarmos trigger no banco)
    // Para simplificar o MVP, a tela lerá as transfers e abaterá no initial_balance
    // Mas no mundo real, deveríamos rodar uma Function RPC.

    await get().fetchTransfers();
    set({ isLoading: false });
  },

  deleteTransfer: async (id) => {
    set({ isLoading: true });
    await supabase.from('fin_transfers').delete().eq('id', id);
    await get().fetchTransfers();
    set({ isLoading: false });
  },

  addAccount: async (data) => {
    const ws = get().workspace;
    if (!ws) return;
    set({ isLoading: true });
    await supabase.from('fin_accounts').insert([{
      workspace_id: ws.id,
      name: data.name,
      bank: data.bank,
      type: data.type,
      entity_type: data.entityType,
      initial_balance: data.initialBalance,
      color: data.color
    }]);
    await get().fetchAccounts();
    set({ isLoading: false });
  },

  updateAccount: async (id, data) => {
    set({ isLoading: true });
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.bank !== undefined) payload.bank = data.bank;
    if (data.type !== undefined) payload.type = data.type;
    if (data.entityType !== undefined) payload.entity_type = data.entityType;
    if (data.initialBalance !== undefined) payload.initial_balance = data.initialBalance;
    if (data.color !== undefined) payload.color = data.color;

    await supabase.from('fin_accounts').update(payload).eq('id', id);
    await get().fetchAccounts();
    set({ isLoading: false });
  },

  deleteAccount: async (id) => {
    set({ isLoading: true });
    await supabase.from('fin_accounts').delete().eq('id', id);
    await get().fetchAccounts();
    set({ isLoading: false });
  },

  addCreditCard: async (data) => {
    const ws = get().workspace;
    if (!ws) return;
    set({ isLoading: true });
    await supabase.from('fin_credit_cards').insert([{
      workspace_id: ws.id,
      account_id: data.accountId,
      name: data.name,
      flag: data.flag,
      is_additional: data.isAdditional,
      closing_day: data.closingDay,
      due_day: data.dueDay,
      credit_limit: data.creditLimit
    }]);
    await get().fetchCreditCards();
    set({ isLoading: false });
  },

  updateCreditCard: async (id, data) => {
    set({ isLoading: true });
    const payload: any = {};
    if (data.accountId !== undefined) payload.account_id = data.accountId;
    if (data.name !== undefined) payload.name = data.name;
    if (data.flag !== undefined) payload.flag = data.flag;
    if (data.isAdditional !== undefined) payload.is_additional = data.isAdditional;
    if (data.closingDay !== undefined) payload.closing_day = data.closingDay;
    if (data.dueDay !== undefined) payload.due_day = data.dueDay;
    if (data.creditLimit !== undefined) payload.credit_limit = data.creditLimit;

    await supabase.from('fin_credit_cards').update(payload).eq('id', id);
    await get().fetchCreditCards();
    set({ isLoading: false });
  },

  deleteCreditCard: async (id) => {
    set({ isLoading: true });
    await supabase.from('fin_credit_cards').delete().eq('id', id);
    await get().fetchCreditCards();
    set({ isLoading: false });
  }
}));
