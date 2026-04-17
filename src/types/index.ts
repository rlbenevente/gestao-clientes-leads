export type ProjectType = 'service' | 'system' | 'none';

export type ChargeStatus = 'PENDING' | 'PAID' | 'OVERDUE';

export interface Payer {
  id: string;
  name: string;
  value: number;
}

export interface Client {
  id: string;
  name: string;
  segment: string;
  monthlyValue: number;
  startDate: string; // ISO string YYYY-MM-DD
  status: 'active' | 'ended';
  
  // Project / Proposal
  hasProject: boolean;
  projectType?: ProjectType;
  projectTotalValue?: number;
  hasInstallments?: boolean;
  installmentsCount?: number;
  installmentValue?: number;
  projectStartDate?: string; // ISO string YYYY-MM-DD
  hasMonthlyFee?: boolean;
  monthlyFeeValue?: number;

  // Split Payment
  hasSplitPayment: boolean;
  payers: Payer[];

  // Monthly Split (2x)
  hasMonthlySplit?: boolean;
  monthlySplitDay1?: number;
  monthlySplitDay2?: number;
}

export interface Charge {
  id: string;
  clientId: string;
  description: string; // e.g. "Mensalidade", "Parcela 1/3", "Fee de Manutenção", "Mensalidade (Maria)"
  predictedValue: number;
  paidValue?: number;
  dueDate: string; // ISO String
  paymentDate?: string; // ISO String
  status: ChargeStatus;
  isInstallment?: boolean;
  installmentNumber?: number;
  totalInstallments?: number;
}
