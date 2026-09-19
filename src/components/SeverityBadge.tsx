// ============================================================================
// SeverityBadge — badge di severità con ICONA + ETICHETTA testuale.
// Mai affidarsi al solo colore (§5.2). Icone distinte per severità:
//   Critical: OctagonAlert (rosso) · High: TriangleAlert (arancio)
//   Medium:   Info (blu)           · Info: Bell (grigio)
// Pillola con icona+testo → forma distinta dai chip RACI (quadrato con lettera).
// ============================================================================

import { Bell, Info, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SEVERITY_LABEL } from '../types';
import type { Severity } from '../types';

const META: Record<
  Severity,
  { icon: LucideIcon; pill: string; solid: string }
> = {
  Critical: {
    icon: OctagonAlert,
    pill:
      'bg-rose-50 text-rose-700 ring-1 ring-rose-200 ' +
      'dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30',
    solid: 'bg-rose-600 text-white dark:bg-rose-500 dark:ring-1 dark:ring-rose-300/40',
  },
  High: {
    icon: TriangleAlert,
    pill:
      'bg-orange-50 text-orange-700 ring-1 ring-orange-200 ' +
      'dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30',
    solid: 'bg-orange-500 text-white dark:bg-orange-500 dark:ring-1 dark:ring-orange-300/40',
  },
  Medium: {
    icon: Info,
    pill:
      'bg-blue-50 text-blue-700 ring-1 ring-blue-200 ' +
      'dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30',
    solid: 'bg-blue-600 text-white dark:bg-blue-500 dark:ring-1 dark:ring-blue-300/40',
  },
  Info: {
    icon: Bell,
    pill:
      'bg-slate-100 text-slate-600 ring-1 ring-slate-200 ' +
      'dark:bg-white/10 dark:text-slate-300 dark:ring-white/15',
    solid: 'bg-slate-500 text-white dark:bg-slate-600 dark:ring-1 dark:ring-white/15',
  },
};

interface Props {
  severity: Severity;
  variant?: 'pill' | 'solid';
  size?: 'sm' | 'md';
  className?: string;
  /** Se true e severity === 'Critical', applica un'onda concentrica per attirare l'attenzione. */
  pulse?: boolean;
}

export function SeverityBadge({
  severity,
  variant = 'pill',
  size = 'sm',
  className = '',
  pulse = false,
}: Props) {
  const m = META[severity];
  const Icon = m.icon;
  const sz = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  const icon = size === 'sm' ? 13 : 15;
  // L'onda (gc-pulse-ring) eredita currentColor → usa il colore del testo del badge.
  // Richiede position:relative; la limitiamo alla severità Critical per non distrarre.
  const pulseCls = pulse && severity === 'Critical' ? 'relative gc-pulse-ring' : '';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sz} ${variant === 'solid' ? m.solid : m.pill} ${pulseCls} ${className}`}
    >
      <Icon size={icon} strokeWidth={2.4} aria-hidden />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export const SEVERITY_META = META;
