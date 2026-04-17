-- Habilita extensão de uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: clients
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    segment TEXT,
    monthly_value NUMERIC NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    
    -- Project/Proposal
    has_project BOOLEAN NOT NULL DEFAULT FALSE,
    project_type TEXT,
    project_total_value NUMERIC,
    has_installments BOOLEAN,
    installments_count INTEGER,
    installment_value NUMERIC,
    project_start_date DATE,
    has_monthly_fee BOOLEAN,
    monthly_fee_value NUMERIC,

    -- Split Payment
    has_split_payment BOOLEAN NOT NULL DEFAULT FALSE,

    -- Monthly Split (2x)
    has_monthly_split BOOLEAN NOT NULL DEFAULT FALSE,
    monthly_split_day_1 INTEGER,
    monthly_split_day_2 INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: payers (for split payments)
CREATE TABLE public.payers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: charges
CREATE TABLE public.charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    predicted_value NUMERIC NOT NULL,
    paid_value NUMERIC,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'PENDING',
    is_installment BOOLEAN DEFAULT FALSE,
    installment_number INTEGER,
    total_installments INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security) e Criar Policies permissivas para o MVP
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous full access clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous full access payers" ON public.payers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous full access charges" ON public.charges FOR ALL USING (true) WITH CHECK (true);
