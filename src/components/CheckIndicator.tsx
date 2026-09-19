// ============================================================================
// CheckIndicator — mini-indicatore di stato per uno dei 4 livelli di check.
// Verde (pass) · ambra (warn) · rosso (fail) · neutro (n/a). Forma + icona +
// tooltip testuale: leggibile senza affidarsi al solo colore.
// ============================================================================

import { Check, Minus, TriangleAlert, X } from 'lucide-react';
import { CHECK_LABEL } from '../types';
import type { CheckType, FindingStatus } from '../types';

const STATUS_STYLE: Record<
  FindingStatus | 'na',
  { cls: string; icon: typeof Check; label: string }
> = {
  pass: {
    cls:
      'bg-emerald-50 text-emerald-600 ring-emerald-200 ' +
      'dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
    icon: Check,
    label: 'OK',
  },
  warn: {
    cls:
      'bg-amber-50 text-amber-600 ring-amber-200 ' +
      'dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
    icon: TriangleAlert,
    label: 'Avviso',
  },
  fail: {
    cls:
      'bg-rose-50 text-rose-600 ring-rose-200 ' +
      'dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
    icon: X,
    label: 'Errore',
  },
  na: {
    cls:
      'bg-slate-100 text-slate-500 ring-slate-200 ' +
      'dark:bg-white/5 dark:text-slate-500 dark:ring-white/10',
    icon: Minus,
    label: 'N/D',
  },
};

interface Props {
  type: CheckType;
  status?: FindingStatus;
  size?: 'sm' | 'md';
}

export function CheckIndicator({ type, status, size = 'sm' }: Props) {
  const key = (status ?? 'na') as FindingStatus | 'na';
  const m = STATUS_STYLE[key];
  const Icon = m.icon;
  const dim = size === 'sm' ? 'h-6 w-6' : 'h-7 w-7';
  const label = `${CHECK_LABEL[type]}: ${m.label}`;
  return (
    <span
      className={`inline-flex ${dim} items-center justify-center rounded-md ring-1 ${m.cls}`}
      title={label}
      aria-label={label}
    >
      <Icon
        className="gc-pop-in"
        size={size === 'sm' ? 13 : 15}
        strokeWidth={2.6}
        aria-hidden
      />
    </span>
  );
}

// Riga dei 4 indicatori (Presence / Conformance / Threshold / Reconciliation)
import { CHECK_ORDER } from '../types';
export function CheckIndicatorRow({
  statuses,
  size = 'sm',
}: {
  statuses: Partial<Record<CheckType, FindingStatus>>;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="flex items-center gap-1.5">
      {CHECK_ORDER.map((t) => (
        <CheckIndicator key={t} type={t} status={statuses[t]} size={size} />
      ))}
    </div>
  );
}
