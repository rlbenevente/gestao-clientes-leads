-- ==========================================
-- SCRIPT DE DEPLOY - MÓDULO FINANCEIRO (SEGURO)
-- Limpeza prévia para garantir que recrie as tabelas
-- Isso NÃO afeta as tabelas "clients", "payers" ou "charges".
-- ==========================================

DROP TABLE IF EXISTS public.fin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.fin_notifications CASCADE;
DROP TABLE IF EXISTS public.fin_investments CASCADE;
DROP TABLE IF EXISTS public.fin_bank_integrations CASCADE;
DROP TABLE IF EXISTS public.fin_import_batches CASCADE;
DROP TABLE IF EXISTS public.fin_transfers CASCADE;
DROP TABLE IF EXISTS public.fin_transactions CASCADE;
DROP TABLE IF EXISTS public.fin_automation_rules CASCADE;
DROP TABLE IF EXISTS public.fin_recurrences CASCADE;
DROP TABLE IF EXISTS public.fin_installments CASCADE;
DROP TABLE IF EXISTS public.fin_subcategories CASCADE;
DROP TABLE IF EXISTS public.fin_categories CASCADE;
DROP TABLE IF EXISTS public.fin_credit_cards CASCADE;
DROP TABLE IF EXISTS public.fin_accounts CASCADE;
DROP TABLE IF EXISTS public.fin_workspaces CASCADE;

DROP TYPE IF EXISTS fin_account_type CASCADE;
DROP TYPE IF EXISTS fin_transaction_type CASCADE;
DROP TYPE IF EXISTS fin_transaction_status CASCADE;
DROP TYPE IF EXISTS fin_entity_type CASCADE;

-- ENUMS
CREATE TYPE fin_account_type AS ENUM ('checking', 'savings', 'investment', 'wallet');
CREATE TYPE fin_transaction_type AS ENUM ('income', 'expense');
CREATE TYPE fin_transaction_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE fin_entity_type AS ENUM ('PF', 'PJ');

-- 1. WORKSPACES
CREATE TABLE public.fin_workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CONTAS BANCÁRIAS
CREATE TABLE public.fin_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bank TEXT NOT NULL,
    type TEXT NOT NULL, -- 'checking', 'savings', 'investment'
    entity_type TEXT NOT NULL DEFAULT 'PF', -- 'PF' ou 'PJ'
    initial_balance NUMERIC NOT NULL DEFAULT 0,
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CARTÕES DE CRÉDITO
CREATE TABLE public.fin_credit_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.fin_accounts(id) ON DELETE SET NULL, -- Cartão pode estar atrelado a uma conta para débito automático
    name TEXT NOT NULL,
    brand TEXT NOT NULL, -- 'visa', 'mastercard', etc.
    limit_amount NUMERIC NOT NULL DEFAULT 0,
    closing_day INTEGER NOT NULL,
    due_day INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CATEGORIAS E SUBCATEGORIAS
CREATE TABLE public.fin_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'income' ou 'expense'
    color TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.fin_subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.fin_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. AGRUPADORES
CREATE TABLE public.fin_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_amount NUMERIC NOT NULL,
    installments_count INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.fin_recurrences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    frequency TEXT NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.fin_automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.fin_categories(id) ON DELETE RESTRICT,
    subcategory_id UUID REFERENCES public.fin_subcategories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. LANÇAMENTOS (TRANSAÇÕES)
CREATE TABLE public.fin_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
    
    type fin_transaction_type NOT NULL,
    entity_type fin_entity_type NOT NULL DEFAULT 'PF',
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATE,
    invoice_date DATE,
    status fin_transaction_status NOT NULL DEFAULT 'pending',
    installment_number INTEGER,
    ofx_transaction_id TEXT UNIQUE,
    notes TEXT,
    
    account_id UUID REFERENCES public.fin_accounts(id) ON DELETE RESTRICT,
    credit_card_id UUID REFERENCES public.fin_credit_cards(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.fin_categories(id) ON DELETE RESTRICT,
    subcategory_id UUID REFERENCES public.fin_subcategories(id) ON DELETE SET NULL,
    installment_id UUID REFERENCES public.fin_installments(id) ON DELETE SET NULL,
    recurrence_id UUID REFERENCES public.fin_recurrences(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT check_account_or_card CHECK (
        (account_id IS NOT NULL AND credit_card_id IS NULL) OR 
        (account_id IS NULL AND credit_card_id IS NOT NULL)
    )
);

-- 6. TRANSFERÊNCIAS
CREATE TABLE public.fin_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
    from_account_id UUID NOT NULL REFERENCES public.fin_accounts(id) ON DELETE CASCADE,
    to_account_id UUID NOT NULL REFERENCES public.fin_accounts(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    transfer_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PERMISSÕES E RLS (IMPLEMENTAÇÃO DE SEGURANÇA SÊNIOR)
ALTER TABLE public.fin_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_recurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_automation_rules ENABLE ROW LEVEL SECURITY;

-- 1. Políticas de Workspace (Somente dono acessa)
CREATE POLICY "Isolamento de Workspaces" ON public.fin_workspaces FOR ALL USING (owner_id = auth.uid());

-- 2. Políticas Filhas (Acesso se for dono do workspace vinculado)
CREATE POLICY "Isolamento de Contas" ON public.fin_accounts FOR ALL USING (workspace_id IN (SELECT id FROM public.fin_workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Isolamento de Cartões" ON public.fin_credit_cards FOR ALL USING (workspace_id IN (SELECT id FROM public.fin_workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Isolamento de Categorias" ON public.fin_categories FOR ALL USING (workspace_id IN (SELECT id FROM public.fin_workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Isolamento de Regras" ON public.fin_automation_rules FOR ALL USING (workspace_id IN (SELECT id FROM public.fin_workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Isolamento de Transações" ON public.fin_transactions FOR ALL USING (workspace_id IN (SELECT id FROM public.fin_workspaces WHERE owner_id = auth.uid()));
CREATE POLICY "Isolamento de Transferências" ON public.fin_transfers FOR ALL USING (workspace_id IN (SELECT id FROM public.fin_workspaces WHERE owner_id = auth.uid()));

-- Entidades não vinculadas diretamente ao workspace herdam acesso global pro usuário logado provisoriamente (MVP)
CREATE POLICY "Isolamento de Parcelamentos" ON public.fin_installments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Isolamento de Recorrências" ON public.fin_recurrences FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Isolamento de Subcategorias" ON public.fin_subcategories FOR ALL USING (auth.uid() IS NOT NULL);

-- ==========================================
-- FASE 10: PREPARAÇÃO P/ FUTURAS INTEGRAÇÕES
-- ==========================================

-- 7. IMPORTAÇÕES EM LOTE (OFX / CSV)
CREATE TABLE public.fin_import_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing', -- 'processing', 'completed', 'failed'
    source TEXT NOT NULL, -- 'ofx', 'csv', 'open_finance'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. OPEN FINANCE / INTEGRAÇÕES DE BANCOS
CREATE TABLE public.fin_bank_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'pluggy', 'belvo'
    item_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. INVESTIMENTOS
CREATE TABLE public.fin_investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'cdb', 'acoes', 'fii', 'crypto'
    invested_amount NUMERIC NOT NULL DEFAULT 0,
    current_balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. NOTIFICAÇÕES & INSIGHTS DE IA
CREATE TABLE public.fin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES public.fin_workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'alert', 'ai_insight', 'due_date'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- COLUNAS DE SUPORTE EM TRANSAÇÕES (Para OFX e IA)
ALTER TABLE public.fin_transactions 
ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES public.fin_import_batches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS bank_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC;

-- RLS DAS NOVAS TABELAS
ALTER TABLE public.fin_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_bank_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous full access" ON public.fin_import_batches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous full access" ON public.fin_bank_integrations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous full access" ON public.fin_notifications FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- FASE EXTRA: AUDITORIA E LOGS (SEGURANÇA SÊNIOR)
-- ==========================================

-- 11. LOGS DE AUDITORIA (Imutáveis)
CREATE TABLE public.fin_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.fin_audit_logs ENABLE ROW LEVEL SECURITY;
-- Apenas super admins devem ler isso no futuro, mas o dono do registro original pode ver o log se quisermos
CREATE POLICY "Isolamento de Logs" ON public.fin_audit_logs FOR SELECT USING (changed_by = auth.uid());

-- FUNÇÃO TRIGGER DE AUDITORIA
CREATE OR REPLACE FUNCTION public.log_financial_audit()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.fin_audit_logs(table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.fin_audit_logs(table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.fin_audit_logs(table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb, auth.uid());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- APLICANDO O TRIGGER NAS TABELAS SENSÍVEIS
CREATE TRIGGER audit_fin_transactions
    AFTER INSERT OR UPDATE OR DELETE ON public.fin_transactions
    FOR EACH ROW EXECUTE FUNCTION public.log_financial_audit();

CREATE TRIGGER audit_fin_transfers
    AFTER INSERT OR UPDATE OR DELETE ON public.fin_transfers
    FOR EACH ROW EXECUTE FUNCTION public.log_financial_audit();

