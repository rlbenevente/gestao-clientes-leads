import { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Plus, Tag, Trash2, Edit2, ChevronDown, ChevronRight } from 'lucide-react';
import type { Category, TransactionType } from '../types/finance';

export default function FinanceCategories() {
  const { 
    categories, initialize, addCategory, updateCategory, deleteCategory, addSubcategory, deleteSubcategory, isLoading,
    automationRules, addAutomationRule, deleteAutomationRule
  } = useFinanceStore();
  const [activeTab, setActiveTab] = useState<'categories' | 'automations'>('categories');
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [color, setColor] = useState('#10B981');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  // Automations State
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCategoryId, setRuleCategoryId] = useState('');
  const [ruleSubcategoryId, setRuleSubcategoryId] = useState('');

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (isEditing) {
      await updateCategory(isEditing, { name, type, color });
      setIsEditing(null);
    } else {
      await addCategory({ name, type, color });
    }
    
    setName('');
    setType('expense');
    setColor('#10B981');
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleKeyword || !ruleCategoryId) return;
    await addAutomationRule({ keyword: ruleKeyword, categoryId: ruleCategoryId, subcategoryId: ruleSubcategoryId || undefined });
    setRuleKeyword('');
    setRuleCategoryId('');
    setRuleSubcategoryId('');
  };

  const handleEdit = (cat: Category) => {
    setIsEditing(cat.id);
    setName(cat.name);
    setType(cat.type);
    setColor(cat.color || '#10B981');
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setName('');
    setType('expense');
    setColor('#10B981');
  };

  const handleAddSubcategory = async (categoryId: string) => {
    if (!newSubcategoryName) return;
    await addSubcategory({ categoryId, name: newSubcategoryName });
    setNewSubcategoryName('');
  };

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Categorias e Automação</h1>
          <p className="text-white/60">Gerencie a classificação e as regras inteligentes dos lançamentos</p>
        </div>
        <div className="flex bg-black p-1 rounded-lg border border-white/10">
          <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'categories' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}>Categorias</button>
          <button onClick={() => setActiveTab('automations')} className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'automations' ? 'bg-[var(--color-ls-accent)] text-white' : 'text-white/50 hover:text-white'}`}>Regras Inteligentes</button>
        </div>
      </div>

      {activeTab === 'categories' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Formulário de Criação/Edição */}
        <div className="md:col-span-1">
          <div className="glass-panel p-6 rounded-xl sticky top-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[var(--color-ls-accent)]" />
              {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Nome</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field w-full" 
                  placeholder="Ex: Alimentação"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Tipo</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as TransactionType)}
                  className="input-field w-full"
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Cor de Identificação</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent" 
                  />
                  <span className="text-sm font-mono text-white/50 uppercase">{color}</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <button 
                  type="submit" 
                  className="btn-primary w-full justify-center"
                  disabled={isLoading}
                >
                  {isEditing ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
                {isEditing && (
                  <button 
                    type="button" 
                    onClick={cancelEdit}
                    className="btn-secondary w-full justify-center text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Lista de Categorias */}
        <div className="md:col-span-2 space-y-4">
          {categories.length === 0 ? (
            <div className="glass-panel p-8 rounded-xl text-center flex flex-col items-center justify-center">
              <Tag className="w-12 h-12 text-white/20 mb-4" />
              <p className="text-white/60">Nenhuma categoria cadastrada.</p>
              <p className="text-sm text-white/40 mt-1">Crie a sua primeira categoria ao lado.</p>
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="glass-panel rounded-xl overflow-hidden transition-all">
                <div className="p-4 flex items-center justify-between border-b border-white/5 hover:bg-white/5">
                  <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)}>
                    <div 
                      className="w-4 h-4 rounded-full shadow-sm" 
                      style={{ backgroundColor: cat.color || '#10B981' }} 
                    />
                    <div>
                      <h3 className="font-bold flex items-center gap-2">
                        {cat.name}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${cat.type === 'income' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                          {cat.type === 'income' ? 'Receita' : 'Despesa'}
                        </span>
                      </h3>
                      <p className="text-xs text-white/40 mt-1">
                        {cat.subcategories?.length || 0} subcategorias
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(cat)} className="p-2 text-white/40 hover:text-white transition-colors" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteCategory(cat.id)} className="p-2 text-white/40 hover:text-red-500 transition-colors" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setExpandedId(expandedId === cat.id ? null : cat.id)} className="p-2 text-white/40 hover:text-white transition-colors">
                      {expandedId === cat.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Área de Subcategorias Expandida */}
                {expandedId === cat.id && (
                  <div className="p-4 bg-black/20">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-white/60 mb-2">Subcategorias de {cat.name}</h4>
                      {cat.subcategories && cat.subcategories.length > 0 ? (
                        <ul className="space-y-2">
                          {cat.subcategories.map(sub => (
                            <li key={sub.id} className="flex items-center justify-between bg-white/5 px-3 py-2 rounded-lg text-sm">
                              <span>{sub.name}</span>
                              <button onClick={() => deleteSubcategory(sub.id)} className="text-white/30 hover:text-red-500">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-white/30 italic">Nenhuma subcategoria.</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newSubcategoryName}
                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                        placeholder="Nova subcategoria..."
                        className="input-field text-sm flex-1 py-1 px-3"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubcategory(cat.id);
                          }
                        }}
                      />
                      <button 
                        type="button"
                        onClick={() => handleAddSubcategory(cat.id)}
                        className="btn-secondary text-sm py-1 px-3"
                        disabled={!newSubcategoryName || isLoading}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="glass-panel p-6 rounded-xl sticky top-8 border-t-2 border-[var(--color-ls-accent)]">
              <h2 className="text-lg font-bold mb-2">Nova Regra</h2>
              <p className="text-xs text-white/50 mb-6">Quando uma transação contiver a palavra-chave, ela será categorizada automaticamente.</p>
              
              <form onSubmit={handleAddRule} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Palavra-chave</label>
                  <input type="text" value={ruleKeyword} onChange={e => setRuleKeyword(e.target.value)} className="input-field w-full" placeholder="Ex: iFood, Uber" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Categoria Alvo</label>
                  <select value={ruleCategoryId} onChange={e => { setRuleCategoryId(e.target.value); setRuleSubcategoryId(''); }} className="input-field w-full" required>
                    <option value="">Selecione...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {ruleCategoryId && categories.find(c => c.id === ruleCategoryId)?.subcategories?.length! > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Subcategoria Alvo</label>
                    <select value={ruleSubcategoryId} onChange={e => setRuleSubcategoryId(e.target.value)} className="input-field w-full">
                      <option value="">Nenhuma</option>
                      {categories.find(c => c.id === ruleCategoryId)?.subcategories?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
                <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">Salvar Regra</button>
              </form>
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            {automationRules.length === 0 ? (
              <div className="glass-panel p-8 text-center rounded-xl">
                <h3 className="font-bold mb-2">Nenhuma regra ativa</h3>
                <p className="text-sm text-white/50">Crie regras manuais para não precisar preencher categorias toda hora.</p>
              </div>
            ) : (
              automationRules.map(rule => {
                const cat = categories.find(c => c.id === rule.categoryId);
                const sub = cat?.subcategories?.find(s => s.id === rule.subcategoryId);
                
                return (
                  <div key={rule.id} className="glass-panel p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/50 mb-1">Se a descrição contiver:</p>
                      <p className="font-bold text-lg mb-2">"{rule.keyword}"</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 bg-white/10 rounded-md flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{backgroundColor: cat?.color || '#555'}} />
                          {cat?.name || 'Desconhecida'}
                        </span>
                        {sub && <span className="text-xs text-white/40">› {sub.name}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteAutomationRule(rule.id)} className="p-2 text-white/40 hover:text-red-500"><Trash2 className="w-5 h-5"/></button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
