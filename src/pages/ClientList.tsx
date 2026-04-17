import { useStore } from '../store/useStore';
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { StatusBadge } from '../components/ui/Badge';
import { format, parseISO } from 'date-fns';

export default function ClientList() {
  const clients = useStore(state => state.clients);
  const deleteClient = useStore(state => state.deleteClient);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'ended'>('all');

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (client.segment?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-white">Clientes</h1>
          <p className="text-white/60">Gestão da base de clientes e contratos.</p>
        </div>
        
        <Link to="/clients/new" className="btn-primary shrink-0">
          <Plus className="w-5 h-5" />
          Novo Cliente
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou segmento..." 
            className="input-field w-full pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="input-field w-full sm:w-48 appearance-none bg-[#111] cursor-pointer"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
        >
          <option value="all">Todos os Status</option>
          <option value="active">Apenas Ativos</option>
          <option value="ended">Apenas Encerrados</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
             <thead>
              <tr className="bg-white/5 text-white/50 text-xs uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4 font-medium">Nome & Segmento</th>
                <th className="px-6 py-4 font-medium">Data Início</th>
                <th className="px-6 py-4 font-medium">Valor Mensal</th>
                <th className="px-6 py-4 font-medium">Projeto/Proposta</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/50">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              ) : (
                filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{client.name}</div>
                      <div className="text-xs text-white/50">{client.segment || 'Sem segmento'}</div>
                    </td>
                    <td className="px-6 py-4 text-white/80">
                      {client.startDate ? format(parseISO(client.startDate), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-6 py-4 text-white/80">
                      {formatCurrency(client.monthlyValue)}
                      {client.hasSplitPayment && <span className="text-xs text-white/30 ml-2">(Dividido)</span>}
                    </td>
                    <td className="px-6 py-4 text-white/80">
                      {client.hasProject ? (
                        <div className="flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-[var(--color-ls-accent)]"></span>
                           Sim
                        </div>
                      ) : (
                        <span className="text-white/30">Não</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          title="Ver Detalhes"
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          title="Editar"
                          onClick={() => navigate(`/clients/${client.id}/edit`)}
                          className="p-2 text-white/60 hover:text-[var(--color-ls-accent)] hover:bg-[var(--color-ls-accent)]/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {client.status === 'active' && (
                          <button 
                            title="Encerrar Contrato"
                            onClick={() => {
                              if(confirm('Tem certeza que deseja encerrar o contrato deste cliente? Ele parará de gerar novos pagamentos mensais.')) {
                                deleteClient(client.id);
                              }
                            }}
                            className="p-2 text-white/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
