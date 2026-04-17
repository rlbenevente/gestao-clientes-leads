import { create } from 'zustand';
import type { Client, Charge, ChargeStatus } from '../types';
import { supabase } from '../lib/supabase';
import { addMonths, parseISO, isBefore, startOfDay, getMonth, getYear, setDate, isAfter, isSameMonth, startOfMonth } from 'date-fns';

interface AppState {
  clients: Client[];
  charges: Charge[];
  isLoading: boolean;
  
  fetchData: () => Promise<void>;
  addClient: (client: Omit<Client, 'id'>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  markChargeAsPaid: (chargeId: string, paidDate?: string) => Promise<void>;
  markChargeAsPending: (chargeId: string) => Promise<void>;
  generateMonthlyCharges: (targetDate?: Date) => Promise<void>;
  updateOverdueStatus: () => Promise<void>;
}

// Helpers map DB snake_case to app camelCase
const mapClientFromDB = (dbClient: any): Client => ({
  id: dbClient.id,
  name: dbClient.name,
  segment: dbClient.segment,
  monthlyValue: Number(dbClient.monthly_value),
  startDate: dbClient.start_date,
  status: dbClient.status,
  
  hasProject: dbClient.has_project,
  projectType: dbClient.project_type,
  projectTotalValue: dbClient.project_total_value ? Number(dbClient.project_total_value) : undefined,
  hasInstallments: dbClient.has_installments,
  installmentsCount: dbClient.installments_count,
  installmentValue: dbClient.installment_value ? Number(dbClient.installment_value) : undefined,
  projectStartDate: dbClient.project_start_date,
  hasMonthlyFee: dbClient.has_monthly_fee,
  monthlyFeeValue: dbClient.monthly_fee_value ? Number(dbClient.monthly_fee_value) : undefined,
  
  hasSplitPayment: dbClient.has_split_payment,
  payers: (dbClient.payers || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      value: Number(p.value)
  })),

  hasMonthlySplit: dbClient.has_monthly_split,
  monthlySplitDay1: dbClient.monthly_split_day_1,
  monthlySplitDay2: dbClient.monthly_split_day_2,
});

const mapChargeFromDB = (dbCharge: any): Charge => ({
  id: dbCharge.id,
  clientId: dbCharge.client_id,
  description: dbCharge.description,
  predictedValue: Number(dbCharge.predicted_value),
  paidValue: dbCharge.paid_value ? Number(dbCharge.paid_value) : undefined,
  dueDate: dbCharge.due_date,
  paymentDate: dbCharge.payment_date,
  status: dbCharge.status as ChargeStatus,
  isInstallment: dbCharge.is_installment,
  installmentNumber: dbCharge.installment_number,
  totalInstallments: dbCharge.total_installments,
});

export const useStore = create<AppState>()((set, get) => ({
  clients: [],
  charges: [],
  isLoading: false,

  fetchData: async () => {
    set({ isLoading: true });
    
    const [clientsRes, chargesRes] = await Promise.all([
        supabase.from('clients').select('*, payers(*)'),
        supabase.from('charges').select('*')
    ]);

    if (clientsRes.error) console.error('Error fetching clients:', clientsRes.error);
    if (chargesRes.error) console.error('Error fetching charges:', chargesRes.error);

    const clients = (clientsRes.data || []).map(mapClientFromDB);
    const charges = (chargesRes.data || []).map(mapChargeFromDB);

    set({ clients, charges, isLoading: false });
    get().updateOverdueStatus();
  },

  addClient: async (clientData) => {
    set({ isLoading: true });
    
    // Format to DB style
    const clientPayload = {
        name: clientData.name,
        segment: clientData.segment,
        monthly_value: clientData.monthlyValue,
        start_date: clientData.startDate,
        status: clientData.status,
        
        has_project: clientData.hasProject,
        project_type: clientData.projectType,
        project_total_value: clientData.projectTotalValue,
        has_installments: clientData.hasInstallments,
        installments_count: clientData.installmentsCount,
        installment_value: clientData.installmentValue,
        project_start_date: clientData.projectStartDate,
        has_monthly_fee: clientData.hasMonthlyFee,
        monthly_fee_value: clientData.monthlyFeeValue,

        has_split_payment: clientData.hasSplitPayment,
        has_monthly_split: clientData.hasMonthlySplit,
        monthly_split_day_1: clientData.monthlySplitDay1,
        monthly_split_day_2: clientData.monthlySplitDay2,
    };

    const { data: insertedClient, error } = await supabase.from('clients').insert(clientPayload).select().single();
    
    if (error) {
        console.error("Error creating client", error);
        set({ isLoading: false });
        return;
    }

    if (clientData.hasSplitPayment && clientData.payers && clientData.payers.length > 0) {
        const payersPayload = clientData.payers.map(p => ({
            client_id: insertedClient.id,
            name: p.name,
            value: p.value
        }));
        await supabase.from('payers').insert(payersPayload);
    }

    await get().fetchData();
  },

  updateClient: async (id, data) => {
    set({ isLoading: true });

    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.segment !== undefined) payload.segment = data.segment;
    if (data.monthlyValue !== undefined) payload.monthly_value = data.monthlyValue;
    if (data.startDate !== undefined) payload.start_date = data.startDate;
    if (data.status !== undefined) payload.status = data.status;
    
    if (data.hasProject !== undefined) payload.has_project = data.hasProject;
    if (data.projectType !== undefined) payload.project_type = data.projectType;
    if (data.projectTotalValue !== undefined) payload.project_total_value = data.projectTotalValue;
    if (data.hasInstallments !== undefined) payload.has_installments = data.hasInstallments;
    if (data.installmentsCount !== undefined) payload.installments_count = data.installmentsCount;
    if (data.installmentValue !== undefined) payload.installment_value = data.installmentValue;
    if (data.projectStartDate !== undefined) payload.project_start_date = data.projectStartDate;
    if (data.hasMonthlyFee !== undefined) payload.has_monthly_fee = data.hasMonthlyFee;
    if (data.monthlyFeeValue !== undefined) payload.monthly_fee_value = data.monthlyFeeValue;

    if (data.hasSplitPayment !== undefined) payload.has_split_payment = data.hasSplitPayment;
    if (data.hasMonthlySplit !== undefined) payload.has_monthly_split = data.hasMonthlySplit;
    if (data.monthlySplitDay1 !== undefined) payload.monthly_split_day_1 = data.monthlySplitDay1;
    if (data.monthlySplitDay2 !== undefined) payload.monthly_split_day_2 = data.monthlySplitDay2;

    await supabase.from('clients').update(payload).eq('id', id);

    if (data.hasSplitPayment && data.payers) {
        // Replace all payers
        await supabase.from('payers').delete().eq('client_id', id);
        const payersPayload = data.payers.map(p => ({
            client_id: id,
            name: p.name,
            value: p.value
        }));
        await supabase.from('payers').insert(payersPayload);
    } else if (data.hasSplitPayment === false) {
        // Clean up payers if deactivated
        await supabase.from('payers').delete().eq('client_id', id);
    }

    await get().fetchData();
  },

  deleteClient: async (id) => {
    set({ isLoading: true });
    await supabase.from('clients').update({ status: 'ended' }).eq('id', id);
    await get().fetchData();
  },

  markChargeAsPaid: async (chargeId, paidDate = new Date().toISOString()) => {
    set((state) => ({
      charges: state.charges.map((c) => 
        c.id === chargeId 
          ? { ...c, status: 'PAID', paymentDate: paidDate, paidValue: c.predictedValue } 
          : c
      ),
    }));

    // Optimistic UI update before network
    const charge = get().charges.find(c => c.id === chargeId);
    if (!charge) return;

    await supabase.from('charges').update({
        status: 'PAID',
        payment_date: paidDate,
        paid_value: charge.predictedValue
    }).eq('id', chargeId);
  },

  markChargeAsPending: async (chargeId) => {
    // Find expected status locally based on date
    const charge = get().charges.find((c) => c.id === chargeId);
    if (!charge) return;
    
    const chargeDate = parseISO(charge.dueDate);
    const isOverdue = isBefore(startOfDay(chargeDate), startOfDay(new Date()));
    const finalStatus = isOverdue ? 'OVERDUE' : 'PENDING';

    set((state) => ({
      charges: state.charges.map((c) => 
        c.id === chargeId 
            ? { ...c, status: finalStatus, paymentDate: undefined, paidValue: undefined } 
            : c
      ),
    }));

    await supabase.from('charges').update({
        status: finalStatus,
        payment_date: null,
        paid_value: null
    }).eq('id', chargeId);
  },

  updateOverdueStatus: async () => {
    const today = startOfDay(new Date());
    const charges = get().charges;
    const toUpdate: string[] = [];

    const newCharges = charges.map(c => {
      let finalStatus = c.status;
      if (c.status === 'PENDING' && isBefore(startOfDay(parseISO(c.dueDate)), today)) {
        finalStatus = 'OVERDUE';
        toUpdate.push(c.id);
      }
      if (c.status === 'OVERDUE' && !isBefore(startOfDay(parseISO(c.dueDate)), today)) {
        finalStatus = 'PENDING';
        toUpdate.push(c.id);
      }
      return { ...c, status: finalStatus };
    });

    if (toUpdate.length > 0) {
      set({ charges: newCharges });
      
      // Update in DB (simple iterative loop since supabase JS doesn't support bulk update easily)
      for (const id of toUpdate) {
         const newStatus = newCharges.find(c => c.id === id)?.status;
         await supabase.from('charges').update({ status: newStatus }).eq('id', id);
      }
    }
  },

  generateMonthlyCharges: async (targetDate = new Date()) => {
    const state = get();
    // Do not set isLoading entirely as this happens silently on month traversal.
    const today = startOfDay(new Date());
    const chargesToInsertDB: any[] = [];
    const simulatedCharges = [...state.charges];

    state.clients.forEach(client => {
      if (client.status !== 'active') return;

      const baseDate = parseISO(client.startDate);
      const targetMonthStart = startOfMonth(targetDate);
      const baseMonthStart = startOfMonth(baseDate);
      if (isBefore(targetMonthStart, baseMonthStart)) return;

      const chargeDateForMonth = setDate(targetDate, baseDate.getDate());
      const existingCharges = simulatedCharges.filter(c => c.clientId === client.id);

      const addCharge = (desc: string, val: number, isInst = false, instNum?: number, totalInst?: number, customDate?: Date) => {
          const finalDate = customDate || chargeDateForMonth;
          
          const exists = existingCharges.some(c => 
            c.description === desc && 
            getYear(parseISO(c.dueDate)) === getYear(finalDate) && 
            getMonth(parseISO(c.dueDate)) === getMonth(finalDate)
          );

          if (!exists) {
              const isPastDueDate = isBefore(startOfDay(finalDate), today);
              const statusStr = isPastDueDate ? 'OVERDUE' : 'PENDING';
              
              const newLocalId = crypto.randomUUID();
              
              simulatedCharges.push({
                  id: newLocalId,
                  clientId: client.id,
                  description: desc,
                  predictedValue: val,
                  dueDate: finalDate.toISOString(),
                  status: statusStr,
                  isInstallment: isInst,
                  installmentNumber: instNum,
                  totalInstallments: totalInst
              });

              chargesToInsertDB.push({
                  client_id: client.id,
                  description: desc,
                  predicted_value: val,
                  due_date: finalDate.toISOString(),
                  status: statusStr,
                  is_installment: isInst,
                  installment_number: instNum,
                  total_installments: totalInst
              });
          }
      };

      // 1. Monthly Management Fee
      if (client.monthlyValue > 0) {
          const generateStandardOrSplit = (descBase: string, val: number) => {
              if (client.hasMonthlySplit && client.monthlySplitDay1 && client.monthlySplitDay2) {
                  const splitVal = val / 2;
                  const date1 = setDate(targetDate, client.monthlySplitDay1);
                  const date2 = setDate(targetDate, client.monthlySplitDay2);
                  addCharge(`${descBase} — 1ª parcela`, splitVal, false, undefined, undefined, date1);
                  addCharge(`${descBase} — 2ª parcela`, splitVal, false, undefined, undefined, date2);
              } else {
                  addCharge(descBase, val);
              }
          };

          if (client.hasSplitPayment && client.payers && client.payers.length > 0) {
              client.payers.forEach(p => {
                  generateStandardOrSplit(`Mensalidade (${p.name})`, p.value);
              });
          } else {
              generateStandardOrSplit('Mensalidade', client.monthlyValue);
          }
      }

      // 2. Project Installments
      if (client.hasProject && client.projectStartDate) {
          const projStartDate = parseISO(client.projectStartDate);
          const installmentChargeDate = setDate(targetDate, projStartDate.getDate());
          
          if (client.hasInstallments && client.installmentsCount && client.installmentValue) {
              let instNum = 1;
              let cursorDate = startOfDay(projStartDate);
              while(isBefore(cursorDate, startOfDay(installmentChargeDate)) && !isSameMonth(cursorDate, installmentChargeDate)) {
                  cursorDate = addMonths(cursorDate, 1);
                  instNum++;
              }

              if (instNum <= client.installmentsCount && (isSameMonth(cursorDate, installmentChargeDate) || isAfter(installmentChargeDate, projStartDate) || isSameMonth(installmentChargeDate, projStartDate))) {
                    addCharge(`Parcela Projeto ${instNum}/${client.installmentsCount}`, client.installmentValue, true, instNum, client.installmentsCount);
              }
          } else if (!client.hasInstallments && client.projectTotalValue) {
                if (isSameMonth(targetDate, projStartDate) && getYear(targetDate) === getYear(projStartDate)) {
                    addCharge('Pagamento Projeto Pontual', client.projectTotalValue);
                }
          }

          // 3. Project Monthly Fee
          if (client.hasMonthlyFee && client.monthlyFeeValue) {
                if (!isBefore(installmentChargeDate, startOfDay(projStartDate))) {
                    addCharge('Fee de Manutenção', client.monthlyFeeValue);
                }
          }
      }
    });

    if (chargesToInsertDB.length > 0) {
       // Insert missing into Supabase
       const { error } = await supabase.from('charges').insert(chargesToInsertDB);
       if (error) {
           console.error("Error bulk inserting generated charges", error);
       } else {
           // Refetch all to get real IDs instead of our mocked simulated ones.
           await get().fetchData();
       }
    }
  }

}));
