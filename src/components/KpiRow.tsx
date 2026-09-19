// ============================================================================
// KpiRow — riga di KPI della schermata B.
// Griglia di card-statistica: numero deliverable, avvisi per severità, stato
// di riconciliazione, payback e NPV (baseline vs caso corrente con delta).
// I delta usano frecce + colore, ma SEMPRE accompagnati da testo/numero.
// v2: redesign premium — bordo sinistro accentato, conteggi animati (useCountUp),
//     delta con micro-bounce (.gc-pop-in), sparkline baseline→corrente, stagger.
// ============================================================================

import {
  FileStack,
  Link2,
  Unlink,
  TrendingDown,
  TrendingUp,
  Minus,
  Bell,
  Clock,
  Coins,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { SeverityBadge } from './SeverityBadge';
import { fmtMeur, fmtYears, fmtDelta } from '../lib/format';
import { SEVERITY_LABEL } from '../types';
import type { Severity, ReconciliationLink, ProjectBaseline } from '../types';
import { useCountUp } from '../hooks/useCountUp';

export interface KpiRowProps {
  deliverableCount: number;
  counts: Record<Severity, number>;
  reconciliation: ReconciliationLink[];
  baseline: ProjectBaseline;
  currentPayback: number;
  currentNpv: number;
}

// Ordine di presentazione delle severità (dalla più grave alla meno grave).
const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Info'];

// --- Card guscio condiviso --------------------------------------------------
// `accent` definisce l'aria/bordo sinistro per tipologia (scansione rapida,
// sempre accompagnato da etichetta + icona — mai solo colore).
type Accent = 'blue' | 'violet' | 'emerald' | 'rose' | 'amber' | 'sky';

const ACCENT_BORDER: Record<Accent, string> = {
  blue: 'border-l-blue-500',
  violet: 'border-l-violet-500',
  emerald: 'border-l-emerald-500',
  rose: 'border-l-rose-500',
  amber: 'border-l-amber-500',
  sky: 'border-l-sky-500',
};

const ACCENT_ICON: Record<Accent, string> = {
  blue: 'text-blue-500',
  violet: 'text-violet-500',
  emerald: 'text-emerald-500',
  rose: 'text-rose-500',
  amber: 'text-amber-500',
  sky: 'text-sky-500',
};

// Alone tenue dietro l'icona, coerente con l'accent della card.
const ACCENT_ICON_BG: Record<Accent, string> = {
  blue: 'bg-blue-50 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-400/20',
  violet:
    'bg-violet-50 ring-violet-100 dark:bg-violet-500/10 dark:ring-violet-400/20',
  emerald:
    'bg-emerald-50 ring-emerald-100 dark:bg-emerald-500/10 dark:ring-emerald-400/20',
  rose: 'bg-rose-50 ring-rose-100 dark:bg-rose-500/10 dark:ring-rose-400/20',
  amber: 'bg-amber-50 ring-amber-100 dark:bg-amber-500/10 dark:ring-amber-400/20',
  sky: 'bg-sky-50 ring-sky-100 dark:bg-sky-500/10 dark:ring-sky-400/20',
};

function KpiCard({
  label,
  icon: Icon,
  accent,
  index,
  children,
}: {
  label: string;
  icon: LucideIcon;
  accent: Accent;
  index: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`gc-surface gc-hover-lift gc-fade-up flex flex-col gap-3 rounded-2xl border-l-4 p-5 ${ACCENT_BORDER[accent]}`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${ACCENT_ICON_BG[accent]}`}
        >
          <Icon
            size={15}
            strokeWidth={2.4}
            className={ACCENT_ICON[accent]}
            aria-hidden
          />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

// --- Sparkline miniatura (baseline → corrente) ------------------------------
// SVG inline ~64×20, 2 punti (baseline, corrente) con punto finale evidenziato.
// Il colore segue il verdetto del delta (rose=peggiora, emerald=migliora).
function Sparkline({
  from,
  to,
  tone,
  label,
}: {
  from: number;
  to: number;
  tone: 'rose' | 'emerald' | 'slate';
  label: string;
}) {
  const W = 64;
  const H = 20;
  const PAD = 3;
  // Normalizza i due valori su [PAD, H-PAD] (Y invertito: alto = valore maggiore).
  const min = Math.min(from, to);
  const max = Math.max(from, to);
  const span = max - min || 1;
  const yOf = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);
  const x0 = PAD;
  const x1 = W - PAD;
  const y0 = yOf(from);
  const y1 = yOf(to);

  const stroke =
    tone === 'rose' ? '#f43f5e' : tone === 'emerald' ? '#10b981' : '#94a3b8';
  const fillId = `spark-${tone}`;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      fill="none"
      className="shrink-0 overflow-visible"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Riempimento sotto la curva */}
      <path
        d={`M ${x0} ${y0} L ${x1} ${y1} L ${x1} ${H} L ${x0} ${H} Z`}
        fill={`url(#${fillId})`}
      />
      {/* Curva baseline → corrente */}
      <path
        d={`M ${x0} ${y0} L ${x1} ${y1}`}
        stroke={stroke}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      {/* Punto baseline (tenue) */}
      <circle cx={x0} cy={y0} r={1.8} fill={stroke} fillOpacity={0.5} />
      {/* Punto corrente (pieno + alone) */}
      <circle cx={x1} cy={y1} r={3.4} fill={stroke} fillOpacity={0.2} />
      <circle cx={x1} cy={y1} r={2.2} fill={stroke} />
    </svg>
  );
}

// --- Indicatore di variazione baseline → corrente ---------------------------
// `worseUp` indica se un aumento del valore è un peggioramento (payback: sì).
function DeltaBlock({
  baselineLabel,
  currentValue,
  decimals,
  formatCurrent,
  delta,
  deltaLabel,
  worseUp,
  unitSuffix = '',
  index,
}: {
  baselineLabel: string;
  currentValue: number;
  decimals: number;
  formatCurrent: (n: number) => string;
  delta: number;
  deltaLabel: string;
  worseUp: boolean;
  unitSuffix?: string;
  index: number;
}) {
  const worsens = worseUp ? delta > 0 : delta < 0;
  const improves = worseUp ? delta < 0 : delta > 0;
  const Arrow = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const tone = worsens ? 'rose' : improves ? 'emerald' : 'slate';
  const toneText =
    tone === 'rose'
      ? 'text-rose-600 dark:text-rose-400'
      : tone === 'emerald'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-500 dark:text-slate-400';
  const toneBg =
    tone === 'rose'
      ? 'bg-rose-50 dark:bg-rose-500/10'
      : tone === 'emerald'
        ? 'bg-emerald-50 dark:bg-emerald-500/10'
        : 'bg-slate-100 dark:bg-white/5';
  const verdict = worsens
    ? 'in peggioramento'
    : improves
      ? 'in miglioramento'
      : 'stabile';

  // Numero grande animato (rispetta prefers-reduced-motion via hook).
  const animated = useCountUp(currentValue, {
    decimals,
    duration: 1100,
    delay: index * 80 + 120,
  });

  // Baseline numerica per la sparkline (estratta dal valore corrente − delta).
  const baselineValue = currentValue - delta;

  return (
    <>
      <div className="flex items-end justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {formatCurrent(animated)}
          </span>
          <span
            className={`gc-pop-in inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums ${toneText} ${toneBg}`}
            style={{ animationDelay: `${index * 80 + 260}ms` }}
          >
            <Arrow size={13} strokeWidth={2.8} aria-hidden />
            {deltaLabel}
            {unitSuffix}
          </span>
        </div>
        <Sparkline
          from={baselineValue}
          to={currentValue}
          tone={tone}
          label={`Andamento da baseline ${baselineLabel} al valore corrente, ${verdict}`}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Baseline{' '}
        <span className="font-mono font-medium tabular-nums text-slate-700 dark:text-slate-300">
          {baselineLabel}
        </span>{' '}
        · {verdict}
      </p>
    </>
  );
}

export function KpiRow({
  deliverableCount,
  counts,
  reconciliation,
  baseline,
  currentPayback,
  currentNpv,
}: KpiRowProps) {
  const totalLinks = reconciliation.length;
  const brokenLinks = reconciliation.filter((l) => !l.ok).length;
  const allReconciled = brokenLinks === 0;
  const activeSeverities = SEVERITY_ORDER.filter((s) => counts[s] > 0);

  const paybackDelta = currentPayback - baseline.paybackYears;
  const npvDelta = currentNpv - baseline.npvMeur;

  // Conteggi animati (interi) per le prime card.
  const animatedDeliverables = useCountUp(deliverableCount, {
    decimals: 0,
    duration: 900,
    delay: 120,
  });
  const animatedBroken = useCountUp(brokenLinks, {
    decimals: 0,
    duration: 900,
    delay: 280,
  });
  const animatedTotal = useCountUp(totalLinks, {
    decimals: 0,
    duration: 900,
    delay: 280,
  });

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      {/* 1) Deliverable */}
      <KpiCard label="Deliverable" icon={FileStack} accent="blue" index={0}>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-50">
            {animatedDeliverables}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            in valutazione
          </span>
        </div>
      </KpiCard>

      {/* 2) Avvisi per severità */}
      <KpiCard
        label="Avvisi per severità"
        icon={Bell}
        accent="violet"
        index={1}
      >
        {activeSeverities.length === 0 ? (
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Nessun avviso
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeSeverities.map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <SeverityBadge severity={s} size="sm" />
                <span
                  className="font-mono text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300"
                  aria-label={`${counts[s]} avvisi di severità ${SEVERITY_LABEL[s]}`}
                >
                  ×{counts[s]}
                </span>
              </span>
            ))}
          </div>
        )}
      </KpiCard>

      {/* 3) Riconciliazione */}
      <KpiCard
        label="Riconciliazione"
        icon={allReconciled ? Link2 : Unlink}
        accent={allReconciled ? 'emerald' : 'rose'}
        index={2}
      >
        {allReconciled ? (
          <>
            <span className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
              Tutte riconciliate
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono tabular-nums">{animatedTotal}</span>{' '}
              rotte coerenti
            </p>
          </>
        ) : (
          <>
            <span className="text-base font-semibold text-rose-600 dark:text-rose-400">
              <span className="font-mono tabular-nums">{animatedBroken}</span> su{' '}
              <span className="font-mono tabular-nums">{animatedTotal}</span>{' '}
              rotte
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              disallineamenti da risolvere
            </p>
          </>
        )}
      </KpiCard>

      {/* 4) Payback */}
      <KpiCard label="Payback" icon={Clock} accent="amber" index={3}>
        <DeltaBlock
          baselineLabel={fmtYears(baseline.paybackYears)}
          currentValue={currentPayback}
          decimals={2}
          formatCurrent={fmtYears}
          delta={paybackDelta}
          deltaLabel={`${fmtDelta(paybackDelta)} anni`}
          worseUp
          index={3}
        />
      </KpiCard>

      {/* 5) NPV */}
      <KpiCard label="NPV" icon={Coins} accent="sky" index={4}>
        <DeltaBlock
          baselineLabel={fmtMeur(baseline.npvMeur)}
          currentValue={currentNpv}
          decimals={2}
          formatCurrent={fmtMeur}
          delta={npvDelta}
          deltaLabel={`${fmtDelta(npvDelta)} M€`}
          worseUp={false}
          index={4}
        />
      </KpiCard>
    </div>
  );
}
