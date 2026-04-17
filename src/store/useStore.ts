import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Client, Charge, ChargeStatus } from '../types';
import { addMonths, parseISO, isBefore, startOfDay, getMonth, getYear, setDate, isAfter, isSameMonth, startOfMonth } from 'date-fns';

interface AppState {
  clients: Client[];
  charges: Charge[];
  
  // Actions
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  markChargeAsPaid: (chargeId: string, paidDate?: string) => void;
  markChargeAsPending: (chargeId: string) => void;
  generateMonthlyCharges: (targetDate?: Date) => void;
  updateOverdueStatus: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      clients: [],
      charges: [],

      addClient: (client) => {
        const newClient: Client = { ...client, id: crypto.randomUUID() };
        set((state) => ({ clients: [...state.clients, newClient] }));
        get().generateMonthlyCharges();
      },

      updateClient: (id, data) => {
        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
        get().generateMonthlyCharges();
      },

      deleteClient: (id) => {
        set((state) => ({
          clients: state.clients.map(c => c.id === id ? { ...c, status: 'ended' } : c)
        }));
      },

      markChargeAsPaid: (chargeId, paidDate = new Date().toISOString()) => {
        set((state) => ({
          charges: state.charges.map((c) => 
            c.id === chargeId 
              ? { ...c, status: 'PAID', paymentDate: paidDate, paidValue: c.predictedValue } 
              : c
          ),
        }));
      },

      markChargeAsPending: (chargeId) => {
        set((state) => ({
          charges: state.charges.map((c) => {
            if (c.id === chargeId) {
              const chargeDate = parseISO(c.dueDate);
              const isOverdue = isBefore(startOfDay(chargeDate), startOfDay(new Date()));
              return { ...c, status: isOverdue ? 'OVERDUE' : 'PENDING', paymentDate: undefined, paidValue: undefined };
            }
            return c;
          }),
        }));
      },

      updateOverdueStatus: () => {
        const today = startOfDay(new Date());
        set((state) => {
          let changed = false;
          const newCharges = state.charges.map(c => {
            if (c.status === 'PENDING' && isBefore(startOfDay(parseISO(c.dueDate)), today)) {
              changed = true;
              return { ...c, status: 'OVERDUE' as ChargeStatus };
            }
            // re-validate overdue just in case it's in the future now (shouldn't happen but good practice)
            if (c.status === 'OVERDUE' && !isBefore(startOfDay(parseISO(c.dueDate)), today)) {
              changed = true;
              return { ...c, status: 'PENDING' as ChargeStatus };
            }
            return c;
          });
          return changed ? { charges: newCharges } : state;
        });
      },

      generateMonthlyCharges: (targetDate = new Date()) => {
        set((state) => {
          const newCharges: Charge[] = [...state.charges];
          const today = startOfDay(new Date());

          state.clients.forEach(client => {
            if (client.status !== 'active') return;

            const baseDate = parseISO(client.startDate);
            
            // Basic check if the client's start date is not after the end of the target month
            // We just generate charges up to targetDate
            
            // We generate for current month requested.
            // Loop from start date up to target month, or just check the target month specifically.
            // Let's generate specifically for the targetDate's month and year.
            
            // If the target month is before the month of baseDate, skip completely
            const targetMonthStart = startOfMonth(targetDate);
            const baseMonthStart = startOfMonth(baseDate);
            if (isBefore(targetMonthStart, baseMonthStart)) return;

            const chargeDateForMonth = setDate(targetDate, baseDate.getDate());

            const existingCharges = newCharges.filter(c => c.clientId === client.id);

            // Helper to add charge if it doesn't exist
            const addCharge = (desc: string, val: number, isInst = false, instNum?: number, totalInst?: number, customDate?: Date) => {
               const finalDate = customDate || chargeDateForMonth;
               
               // A charge is unique by clientId + description + yyyy-mm
               const exists = existingCharges.some(c => 
                  c.description === desc && 
                  getYear(parseISO(c.dueDate)) === getYear(finalDate) && 
                  getMonth(parseISO(c.dueDate)) === getMonth(finalDate)
               );

               if (!exists) {
                   const isPastDueDate = isBefore(startOfDay(finalDate), today);
                   newCharges.push({
                       id: crypto.randomUUID(),
                       clientId: client.id,
                       description: desc,
                       predictedValue: val,
                       dueDate: finalDate.toISOString(),
                       status: isPastDueDate ? 'OVERDUE' : 'PENDING',
                       isInstallment: isInst,
                       installmentNumber: instNum,
                       totalInstallments: totalInst
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
                // Installment charge date is based on projectStartDate day but in the target month
                const installmentChargeDate = setDate(targetDate, projStartDate.getDate());
                
                if (client.hasInstallments && client.installmentsCount && client.installmentValue) {
                    // Check which installment number this is
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
                     // Single payment
                     if (isSameMonth(targetDate, projStartDate) && getYear(targetDate) === getYear(projStartDate)) {
                          addCharge('Pagamento Projeto Pontual', client.projectTotalValue);
                     }
                }

                // 3. Project Monthly Fee
                if (client.hasMonthlyFee && client.monthlyFeeValue) {
                     // usually starts alongside or after project
                     if (!isBefore(installmentChargeDate, startOfDay(projStartDate))) {
                         addCharge('Fee de Manutenção', client.monthlyFeeValue);
                     }
                }
            }
          });

          return { charges: newCharges };
        });
      }

    }),
    {
      name: 'leads-solution-ia-storage',
    }
  )
);
