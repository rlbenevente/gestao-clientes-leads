export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'paid' | 'overdue';
export type EntityType = 'PF' | 'PJ';
export type AccountType = 'checking' | 'savings' | 'investment' | 'wallet';

export interface Workspace {
  id: string;
  name: string;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
}

export interface Category {
  id: string;
  workspaceId: string;
  name: string;
  type: TransactionType;
  color?: string;
  subcategories?: Subcategory[];
}

export interface Account {
  id: string;
  workspaceId: string;
  name: string;
  bank?: string;
  type: AccountType;
  entityType: EntityType;
  initialBalance: number;
  color?: string;
}

export interface CreditCard {
  id: string;
  workspaceId: string;
  accountId?: string; // Conta associada para pagamento da fatura
  name: string;
  flag?: string;
  isAdditional: boolean;
  closingDay: number;
  dueDay: number;
  creditLimit: number;
}

export interface Installment {
  id: string;
  totalAmount: number;
  installmentsCount: number;
}

export interface AutomationRule {
  id: string;
  workspaceId: string;
  keyword: string;
  categoryId: string;
  subcategoryId?: string;
}

// ==========================================
// FASE 10: PREPARAÇÃO P/ FUTURAS INTEGRAÇÕES
// ==========================================

export interface ImportBatch {
  id: string;
  workspaceId: string;
  fileName: string;
  status: 'processing' | 'completed' | 'failed';
  source: 'ofx' | 'csv' | 'open_finance';
}

export interface Investment {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  investedAmount: number;
  currentBalance: number;
}

export interface AppNotification {
  id: string;
  workspaceId: string;
  title: string;
  message: string;
  type: 'alert' | 'ai_insight' | 'due_date';
  isRead: boolean;
}

export interface Transfer {
  id: string;
  workspaceId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  transferDate: string;
  notes?: string;
}

export interface Transaction {
  id: string;
  workspaceId: string;
  accountId?: string;
  creditCardId?: string;
  categoryId?: string;
  subcategoryId?: string;
  installmentId?: string;
  type: TransactionType;
  entityType: EntityType;
  description: string;
  amount: number;
  dueDate: string;
  invoiceDate?: string;
  paymentDate?: string;
  status: TransactionStatus;
  installmentNumber?: number;
  notes?: string;
  
  category?: Category;
  subcategory?: Subcategory;
  account?: Account;
  creditCard?: CreditCard;
}
