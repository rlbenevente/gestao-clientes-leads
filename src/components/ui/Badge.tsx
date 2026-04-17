import { cn } from '../../lib/utils';
import type { ChargeStatus } from '../../types';

export function StatusBadge({ status, className }: { status: ChargeStatus | 'active' | 'ended'; className?: string }) {
  const mapper = {
    'PENDING': { label: 'A Receber', classes: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    'PAID': { label: 'Recebido', classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    'OVERDUE': { label: 'Vencido', classes: 'bg-red-500/10 text-red-500 border-red-500/20' },
    'active': { label: 'Ativo', classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    'ended': { label: 'Encerrado', classes: 'bg-white/10 text-white/50 border-white/10' },
  };

  const current = mapper[status];

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", current.classes, className)}>
      {current.label}
    </span>
  );
}
