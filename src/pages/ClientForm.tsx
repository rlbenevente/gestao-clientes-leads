import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { Client, ProjectType, Payer } from '../types';

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, addClient, updateClient, isLoading } = useStore();
  
  const isEditing = Boolean(id);
  const existingClient = isEditing ? clients.find(c => c.id === id) : null;

  // Basic Auth
  const [name, setName] = useState('');
  const [segment, setSegment] = useState('');
  const [monthlyValue, setMonthlyValue] = useState<number | ''>('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'active' | 'ended'>('active');

  // Proposal / Project Tracker
  const [hasProject, setHasProject] = useState(false);
  const [projectType, setProjectType] = useState<ProjectType>('service');
  const [projectTotalValue, setProjectTotalValue] = useState<number | ''>('');
  const [hasInstallments, setHasInstallments] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number | ''>('');
  const [installmentValue, setInstallmentValue] = useState<number | ''>('');
  const [projectStartDate, setProjectStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasMonthlyFee, setHasMonthlyFee] = useState(false);
  const [monthlyFeeValue, setMonthlyFeeValue] = useState<number | ''>('');

  // Split Payment
  const [hasSplitPayment, setHasSplitPayment] = useState(false);
  const [payers, setPayers] = useState<Payer[]>([]);

  // Monthly Split (2x)
  const [hasMonthlySplit, setHasMonthlySplit] = useState(false);
  const [monthlySplitDay1, setMonthlySplitDay1] = useState<number | ''>('');
  const [monthlySplitDay2, setMonthlySplitDay2] = useState<number | ''>('');

  useEffect(() => {
    if (existingClient) {
      setName(existingClient.name);
      setSegment(existingClient.segment || '');
      setMonthlyValue(existingClient.monthlyValue);
      setStartDate(existingClient.startDate);
      setStatus(existingClient.status);
      
      setHasProject(existingClient.hasProject);
      setProjectType(existingClient.projectType || 'service');
      setProjectTotalValue(existingClient.projectTotalValue || '');
      setHasInstallments(existingClient.hasInstallments || false);
      setInstallmentsCount(existingClient.installmentsCount || '');
      setInstallmentValue(existingClient.installmentValue || '');
      setProjectStartDate(existingClient.projectStartDate || existingClient.startDate);
      setHasMonthlyFee(existingClient.hasMonthlyFee || false);
      setMonthlyFeeValue(existingClient.monthlyFeeValue || '');

      setHasSplitPayment(existingClient.hasSplitPayment);
      setPayers(existingClient.payers || []);

      setHasMonthlySplit(existingClient.hasMonthlySplit || false);
      setMonthlySplitDay1(existingClient.monthlySplitDay1 || '');
      setMonthlySplitDay2(existingClient.monthlySplitDay2 || '');
    }
  }, [existingClient]);

  // Auto calculate installment value if total & count exist
  useEffect(() => {
    if (hasInstallments && projectTotalValue && installmentsCount) {
       setInstallmentValue(Number(projectTotalValue) / Number(installmentsCount));
    }
  }, [projectTotalValue, installmentsCount, hasInstallments]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || isNaN(Number(monthlyValue)) || !startDate) {
        alert("Preencha os campos obrigatórios.");
        return;
    }

    if (hasSplitPayment) {
        const totalPayers = payers.reduce((acc, p) => acc + Number(p.value), 0);
        if (totalPayers !== Number(monthlyValue)) {
            alert(`A soma dos pagadores (${totalPayers}) deve ser igual ao valor mensal (${monthlyValue}).`);
            return;
        }
    }

    const payload: Omit<Client, 'id'> = {
      name,
      segment,
      monthlyValue: Number(monthlyValue),
      startDate,
      status,
      hasProject,
      projectType: hasProject ? projectType : undefined,
      projectTotalValue: hasProject ? Number(projectTotalValue) : undefined,
      hasInstallments: hasProject ? hasInstallments : undefined,
      installmentsCount: hasProject && hasInstallments ? Number(installmentsCount) : undefined,
      installmentValue: hasProject && hasInstallments ? Number(installmentValue) : undefined,
      projectStartDate: hasProject ? projectStartDate : undefined,
      hasMonthlyFee: hasProject ? hasMonthlyFee : undefined,
      monthlyFeeValue: hasProject && hasMonthlyFee ? Number(monthlyFeeValue) : undefined,
      hasSplitPayment,
      payers: hasSplitPayment ? payers : [],
      hasMonthlySplit,
      monthlySplitDay1: hasMonthlySplit ? Number(monthlySplitDay1) : undefined,
      monthlySplitDay2: hasMonthlySplit ? Number(monthlySplitDay2) : undefined
    };

    if (isEditing && id) {
      await updateClient(id, payload);
    } else {
      await addClient(payload);
    }

    navigate('/clients');
  };

  const addPayer = () => {
      setPayers([...payers, { id: crypto.randomUUID(), name: '', value: 0 }]);
  };

  const updatePayer = (pid: string, key: 'name' | 'value', val: any) => {
      setPayers(payers.map(p => p.id === pid ? { ...p, [key]: val } : p));
  };

  const removePayer = (pid: string) => {
      setPayers(payers.filter(p => p.id !== pid));
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-4xl">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-lg text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl text-white">{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</h1>
          <p className="text-white/60">Configure as regras de faturamento para este cliente.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* SECTION 1: DADOS BÁSICOS */}
        <section className="glass-panel p-6 sm:p-8 rounded-xl space-y-6 border-l-4 border-l-[var(--color-ls-accent)]">
            <h2 className="text-xl text-[var(--color-ls-accent)] font-orbitron mb-4">Dados Básicos</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-sm text-white/80 font-medium">Nome do Cliente *</label>
                 <input required type="text" className="input-field w-full" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Acme Corp" />
               </div>
               
               <div className="space-y-2">
                 <label className="text-sm text-white/80 font-medium">Segmento</label>
                 <input type="text" className="input-field w-full" value={segment} onChange={e => setSegment(e.target.value)} placeholder="Ex: Advocacia" />
               </div>

               <div className="space-y-2">
                 <label className="text-sm text-white/80 font-medium">Valor Mensal de Gestão (R$) *</label>
                 <input required type="number" step="0.01" className="input-field w-full" value={monthlyValue} onChange={e => setMonthlyValue(Number(e.target.value))} placeholder="Ex: 1500.00" />
                 
                 <div className="mt-3 flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center gap-2">
                       <input type="checkbox" id="hasMonthlySplit" className="w-4 h-4 accent-[var(--color-ls-accent)] rounded" checked={hasMonthlySplit} onChange={(e) => setHasMonthlySplit(e.target.checked)} />
                       <label htmlFor="hasMonthlySplit" className="text-sm text-white font-medium cursor-pointer select-none">Dividir em 2x no mês</label>
                    </div>
                    {hasMonthlySplit && (
                       <div className="grid grid-cols-2 gap-3 mt-2">
                          <div className="space-y-1">
                             <label className="text-xs text-white/60">Dia da 1ª parcela</label>
                             <input required={hasMonthlySplit} type="number" min="1" max="31" className="input-field w-full px-3 py-1 text-sm" value={monthlySplitDay1} onChange={e => setMonthlySplitDay1(Number(e.target.value))} />
                          </div>
                          <div className="space-y-1">
                             <label className="text-xs text-white/60">Dia da 2ª parcela</label>
                             <input required={hasMonthlySplit} type="number" min="1" max="31" className="input-field w-full px-3 py-1 text-sm" value={monthlySplitDay2} onChange={e => setMonthlySplitDay2(Number(e.target.value))} />
                          </div>
                          {monthlyValue !== '' && monthlyValue > 0 && (
                              <div className="col-span-2 text-xs text-[var(--color-ls-accent)] font-medium mt-1">
                                  Informativo: 2x de R$ {(Number(monthlyValue) / 2).toFixed(2).replace('.', ',')}
                              </div>
                          )}
                       </div>
                    )}
                 </div>
               </div>

               <div className="space-y-2">
                 <label className="text-sm text-white/80 font-medium">Data de Início * (Define o mês de vencimento)</label>
                 <input required type="date" className="input-field w-full" value={startDate} onChange={e => setStartDate(e.target.value)} />
               </div>

               {isEditing && (
                   <div className="space-y-2">
                     <label className="text-sm text-white/80 font-medium">Status no Sistema</label>
                     <select className="input-field w-full" value={status} onChange={e => setStatus(e.target.value as any)}>
                        <option value="active">Ativo</option>
                        <option value="ended">Encerrado</option>
                     </select>
                   </div>
               )}
            </div>
        </section>


        {/* SECTION 2: PROPOSTA PONTUAL */}
        <section className="glass-panel p-6 sm:p-8 rounded-xl space-y-6">
            <div className="flex items-center gap-3">
               <input type="checkbox" id="hasProject" className="w-5 h-5 accent-[var(--color-ls-accent)] rounded bg-black border-white/20" checked={hasProject} onChange={(e) => setHasProject(e.target.checked)} />
               <label htmlFor="hasProject" className="text-lg text-white font-medium cursor-pointer select-none">Este cliente possui proposta ou projeto pontual</label>
            </div>

            {hasProject && (
                <div className="pl-8 pt-4 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-white/80 font-medium">Tipo de Projeto</label>
                            <select className="input-field w-full" value={projectType} onChange={e => setProjectType(e.target.value as any)}>
                                <option value="service">Serviço Pontual</option>
                                <option value="system">Desenvolvimento de Sistema</option>
                            </select>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-sm text-white/80 font-medium">Valor Total da Proposta (R$)</label>
                            <input required={hasProject} type="number" step="0.01" className="input-field w-full" value={projectTotalValue} onChange={e => setProjectTotalValue(Number(e.target.value))} placeholder="Ex: 5000.00" />
                        </div>
                        
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm text-white/80 font-medium">A primeira cobrança será gerada em:</label>
                            <input required={hasProject} type="date" className="input-field w-full max-w-sm block" value={projectStartDate} onChange={e => setProjectStartDate(e.target.value)} />
                        </div>
                    </div>

                    {/* Installments Toggle */}
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="hasInstallments" className="w-4 h-4 accent-[var(--color-ls-accent)] rounded" checked={hasInstallments} onChange={(e) => setHasInstallments(e.target.checked)} />
                            <label htmlFor="hasInstallments" className="text-sm text-white font-medium cursor-pointer select-none">Dividir em parcelas</label>
                        </div>

                        {hasInstallments && (
                           <div className="flex flex-col sm:flex-row gap-4 mt-2">
                              <div className="flex-1 space-y-2">
                                  <label className="text-xs text-white/60">Nº de Parcelas</label>
                                  <input required={hasInstallments} type="number" min="1" className="input-field w-full" value={installmentsCount} onChange={e => setInstallmentsCount(Number(e.target.value))} />
                              </div>
                              <div className="flex-1 space-y-2">
                                  <label className="text-xs text-white/60">Valor da Parcela (Auto)</label>
                                  <input type="number" readOnly className="input-field w-full bg-black/50 text-white/50" value={installmentValue} />
                              </div>
                           </div>
                        )}
                    </div>

                    {/* Fee Toggle */}
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="hasMonthlyFee" className="w-4 h-4 accent-[var(--color-ls-accent)] rounded" checked={hasMonthlyFee} onChange={(e) => setHasMonthlyFee(e.target.checked)} />
                            <label htmlFor="hasMonthlyFee" className="text-sm text-white font-medium cursor-pointer select-none">Possui fee mensal de manutenção (após ou com o projeto)</label>
                        </div>

                        {hasMonthlyFee && (
                           <div className="mt-2 space-y-2 max-w-sm">
                              <label className="text-xs text-white/60">Valor do Fee Mensal (R$)</label>
                              <input required={hasMonthlyFee} type="number" step="0.01" className="input-field w-full" value={monthlyFeeValue} onChange={e => setMonthlyFeeValue(Number(e.target.value))} />
                           </div>
                        )}
                    </div>
                </div>
            )}
        </section>


        {/* SECTION 3: PAGAMENTO DIVIDIDO */}
        <section className="glass-panel p-6 sm:p-8 rounded-xl space-y-6">
            <div className="flex items-center gap-3">
               <input type="checkbox" id="hasSplitPayment" className="w-5 h-5 accent-[var(--color-ls-accent)] rounded bg-black border-white/20" checked={hasSplitPayment} onChange={(e) => {
                   setHasSplitPayment(e.target.checked);
                   if (e.target.checked && payers.length === 0) {
                       setPayers([{ id: crypto.randomUUID(), name: '', value: monthlyValue || 0 }]);
                   }
               }} />
               <label htmlFor="hasSplitPayment" className="text-lg text-white font-medium cursor-pointer select-none">A Gestão Mensal é dividida entre mais de uma pessoa/sócios</label>
            </div>

            {hasSplitPayment && (
                 <div className="pl-8 pt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                     <p className="text-sm text-white/50">Adicione os pagadores. A soma deve bater com os <strong className="text-white">R$ {monthlyValue}</strong> da gestão.</p>
                     
                     <div className="space-y-3">
                         {payers.map((payer) => (
                             <div key={payer.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                 <div className="flex-1 w-full space-y-1">
                                     <label className="text-xs text-white/50 block sm:hidden">Nome</label>
                                     <input required type="text" className="input-field w-full" placeholder="Nome do pagador" value={payer.name} onChange={e => updatePayer(payer.id, 'name', e.target.value)} />
                                 </div>
                                 <div className="w-full sm:w-48 space-y-1">
                                     <label className="text-xs text-white/50 block sm:hidden">Valor (R$)</label>
                                     <input required type="number" step="0.01" className="input-field w-full" placeholder="Valor" value={payer.value} onChange={e => updatePayer(payer.id, 'value', Number(e.target.value))} />
                                 </div>
                                 {payers.length > 1 && (
                                     <button type="button" onClick={() => removePayer(payer.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg mt-5 sm:mt-0">
                                         <Trash2 className="w-5 h-5" />
                                     </button>
                                 )}
                             </div>
                         ))}
                     </div>

                     <button type="button" onClick={addPayer} className="text-sm text-[var(--color-ls-accent)] font-medium flex items-center gap-1 hover:underline">
                         <Plus className="w-4 h-4" /> Adicionar Pagador
                     </button>
                 </div>
            )}
        </section>

        {/* Submit */}
        <div className="flex justify-end pt-4">
            <button type="submit" disabled={isLoading} className="btn-primary w-full sm:w-auto text-lg px-10 py-3 shadow-lg shadow-[var(--color-ls-accent)]/20 hover:shadow-[var(--color-ls-accent)]/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Save className="w-5 h-5" />
                {isLoading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente')}
            </button>
        </div>

      </form>
    </div>
  );
}
