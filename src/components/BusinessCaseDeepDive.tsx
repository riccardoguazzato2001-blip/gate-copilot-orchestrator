// ============================================================================
// BusinessCaseDeepDive — Deep-dive del Business Case (schermata F).
// Confronto Target (G1.12) vs Estimation (G1.13) contro la Baseline G0,
// con evidenza dello sforamento soglie (payback/NPV) e dei delta vs baseline.
// In coda, il "Messaggio dell'agente" sintetizza i rilievi dagli alert reali.
//
// v2: redesign premium dentro .gc-surface (dark + light), bar chart SVG
// orizzontale Target vs Stima per Payback e NPV (soglia di policy = linea
// tratteggiata rossa, baseline G0 = marker a triangolo), barre animate con
// transform scaleX (GPU). Tabella comparativa restilizzata, box agente glass.
// ============================================================================

import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Bot, Minus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { fmtMeur, fmtYears, fmtPct, fmtDelta } from '../lib/format';
import type { Deliverable, ProjectBaseline, ThresholdConfig, Alert } from '../types';

export interface BusinessCaseDeepDiveProps {
  target: Deliverable; // G1.12 (label 'target')
  estimation: Deliverable; // G1.13 (label 'estimation')
  baseline: ProjectBaseline; // G0 Rev0
  thresholds: ThresholdConfig; // paybackMaxYears, npvMinMeur
  alerts: Alert[];
  /** ritardo (ms) per lo stagger d'ingresso dell'animazione (opzionale) */
  animationDelay?: number;
}

// --- Helper locale: legge un campo numerico dal deliverable -----------------
function getNum(d: Deliverable, key: string): number | null {
  const v = d.fields.find((f) => f.key === key)?.value;
  return typeof v === 'number' ? v : null;
}

type MetricKey =
  | 'investmentMeur'
  | 'paybackYears'
  | 'npvMeur'
  | 'irr'
  | 'discountRate'
  | 'horizonYears';

interface MetricDef {
  key: MetricKey;
  label: string;
  fmt: (n: number) => string;
}

const METRICS: MetricDef[] = [
  { key: 'investmentMeur', label: 'Investimento', fmt: fmtMeur },
  { key: 'paybackYears', label: 'Payback', fmt: fmtYears },
  { key: 'npvMeur', label: 'NPV', fmt: fmtMeur },
  { key: 'irr', label: 'IRR', fmt: fmtPct },
  { key: 'discountRate', label: 'Tasso di sconto', fmt: fmtPct },
  { key: 'horizonYears', label: 'Orizzonte', fmt: (n) => fmtYears(n) },
];

const DASH = '—';

// Freccia di delta colorata: `worseUp` indica se "salire" è un peggioramento.
function DeltaArrow({ delta, worseUp }: { delta: number; worseUp: boolean }) {
  if (delta === 0) {
    return (
      <Minus
        size={13}
        strokeWidth={2.4}
        className="text-slate-400 dark:text-slate-500"
        aria-hidden
      />
    );
  }
  const isWorse = worseUp ? delta > 0 : delta < 0;
  const tone = isWorse ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
  const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  return <Icon size={13} strokeWidth={2.4} className={tone} aria-hidden />;
}

// ── Bar chart orizzontale (SVG inline) ──────────────────────────────────────
// Confronta Target vs Stima per una metrica; mostra la soglia di policy come
// linea tratteggiata rossa e la baseline G0 come marker a triangolo.
interface ChartRow {
  metricLabel: string;
  unit: 'anni' | 'M€';
  target: number | null;
  estimation: number | null;
  baseline: number | null;
  threshold: number;
  // semantica soglia: per il payback è un MASSIMO (≤), per l'NPV un MINIMO (≥)
  thresholdKind: 'max' | 'min';
  breach: boolean;
  fmt: (n: number) => string;
}

function MiniChart({ row, play }: { row: ChartRow; play: boolean }) {
  // geometria
  const W = 320;
  const rowH = 30;
  const gap = 10;
  const top = 8;
  const left = 4;
  const right = 14;
  const plotW = W - left - right;

  // dominio: include valori, soglia e baseline (con piccolo padding)
  const candidates = [row.target, row.estimation, row.baseline, row.threshold]
    .filter((v): v is number => typeof v === 'number')
    .concat([0]);
  const rawMax = Math.max(...candidates, 0.0001);
  const domainMax = rawMax * 1.12;
  const xOf = (v: number) => left + (Math.max(0, v) / domainMax) * plotW;

  const bars: { key: 'target' | 'estimation'; label: string; value: number | null }[] = [
    { key: 'target', label: 'Target', value: row.target },
    { key: 'estimation', label: 'Stima', value: row.estimation },
  ];

  const H = top + bars.length * rowH + (bars.length - 1) * gap + 8;
  const thrX = xOf(row.threshold);
  const baseX = row.baseline !== null ? xOf(row.baseline) : null;

  return (
    <figure className="gc-inset rounded-xl p-3.5">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {row.metricLabel}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          soglia {row.thresholdKind === 'max' ? '≤' : '≥'} {row.fmt(row.threshold)}
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={`${row.metricLabel}: target ${
          row.target !== null ? row.fmt(row.target) : 'non disponibile'
        }, stima ${row.estimation !== null ? row.fmt(row.estimation) : 'non disponibile'}, soglia ${
          row.thresholdKind === 'max' ? 'massima' : 'minima'
        } ${row.fmt(row.threshold)}${
          row.baseline !== null ? `, baseline G0 ${row.fmt(row.baseline)}` : ''
        }`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`bcg-tgt-${row.unit}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
          <linearGradient id={`bcg-est-${row.unit}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <linearGradient id={`bcg-est-breach-${row.unit}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#e11d48" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>

        {/* binari di sfondo */}
        {bars.map((b, i) => {
          const y = top + i * (rowH + gap);
          return (
            <rect
              key={`track-${b.key}`}
              x={left}
              y={y}
              width={plotW}
              height={rowH}
              rx={6}
              className="fill-slate-200/70 dark:fill-white/5"
            />
          );
        })}

        {/* barre (animate con scaleX, transform-origin left) */}
        {bars.map((b, i) => {
          if (b.value === null) return null;
          const y = top + i * (rowH + gap);
          const w = Math.max(2, xOf(b.value) - left);
          const isEst = b.key === 'estimation';
          const fillId = isEst
            ? row.breach
              ? `bcg-est-breach-${row.unit}`
              : `bcg-est-${row.unit}`
            : `bcg-tgt-${row.unit}`;
          return (
            <g key={`bar-${b.key}`}>
              <rect
                x={left}
                y={y}
                width={w}
                height={rowH}
                rx={6}
                fill={`url(#${fillId})`}
                style={{
                  transformBox: 'fill-box',
                  transformOrigin: 'left center',
                  transform: play ? 'scaleX(1)' : 'scaleX(0)',
                  transition: 'transform 0.85s cubic-bezier(0.22,1,0.36,1)',
                  transitionDelay: `${0.12 + i * 0.1}s`,
                }}
              />
              {/* etichetta valore dentro/oltre la barra */}
              <text
                x={Math.min(W - right, left + w + 6)}
                y={y + rowH / 2}
                dominantBaseline="central"
                className="fill-slate-700 font-mono text-[11px] font-semibold tabular-nums dark:fill-slate-200"
                style={{
                  opacity: play ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                  transitionDelay: `${0.55 + i * 0.1}s`,
                }}
              >
                {row.fmt(b.value)}
              </text>
              {/* etichetta serie (Target / Stima) a inizio barra */}
              <text
                x={left + 8}
                y={y + rowH / 2}
                dominantBaseline="central"
                className="fill-white/90 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  opacity: play ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                  transitionDelay: `${0.55 + i * 0.1}s`,
                }}
              >
                {b.label}
              </text>
            </g>
          );
        })}

        {/* soglia di policy — linea tratteggiata rossa */}
        <line
          x1={thrX}
          x2={thrX}
          y1={top - 4}
          y2={H - 4}
          stroke="#ef4444"
          strokeWidth={1.6}
          strokeDasharray="4 3"
          style={{
            opacity: play ? 0.95 : 0,
            transition: 'opacity 0.5s ease',
            transitionDelay: '0.3s',
          }}
        />

        {/* baseline G0 — marker a triangolo */}
        {baseX !== null && (
          <g
            style={{
              opacity: play ? 1 : 0,
              transition: 'opacity 0.5s ease',
              transitionDelay: '0.45s',
            }}
          >
            <line
              x1={baseX}
              x2={baseX}
              y1={top - 4}
              y2={H - 4}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <path
              d={`M ${baseX} ${top - 5} l -5 -6 l 10 0 Z`}
              className="fill-slate-500 dark:fill-slate-300"
            />
          </g>
        )}
      </svg>
    </figure>
  );
}

export function BusinessCaseDeepDive({
  target,
  estimation,
  baseline,
  thresholds,
  alerts,
  animationDelay = 0,
}: BusinessCaseDeepDiveProps) {
  // Avvia l'animazione delle barre dopo il mount (rispetta reduced-motion via CSS).
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPlay(true), animationDelay + 80);
    return () => clearTimeout(t);
  }, [animationDelay]);

  // valori per colonna
  const baseVal = (key: MetricKey): number | null => {
    const v = baseline[key];
    return typeof v === 'number' ? v : null;
  };

  // --- sforamenti soglia (caso stima) ---------------------------------------
  const estPayback = getNum(estimation, 'paybackYears');
  const estNpv = getNum(estimation, 'npvMeur');
  const paybackBreach = estPayback !== null && estPayback > thresholds.paybackMaxYears;
  const npvBreach = estNpv !== null && estNpv < thresholds.npvMinMeur;

  // severità da citare nel messaggio: la più alta tra gli alert sulla stima
  const estimationAlerts = alerts.filter((a) => a.finding.deliverableId === estimation.id);
  const blocking = estimationAlerts.some((a) => a.blocksGate);

  // --- messaggio dell'agente (composto dai dati reali) ----------------------
  const parts: string[] = [];
  if (paybackBreach && estPayback !== null) {
    parts.push(
      `il payback del caso stima (${fmtYears(estPayback)}) supera la soglia di ${fmtYears(
        thresholds.paybackMaxYears,
      )}`,
    );
  }
  if (npvBreach && estNpv !== null) {
    parts.push(
      `l'NPV (${fmtMeur(estNpv)}) è sotto il minimo di ${fmtMeur(thresholds.npvMinMeur)}`,
    );
  }
  // confronto col target G0 / Rev 1 se non già sforato
  const tgtNpv = getNum(target, 'npvMeur');
  if (!npvBreach && estNpv !== null && tgtNpv !== null && estNpv < tgtNpv) {
    parts.push(`l'NPV stima (${fmtMeur(estNpv)}) resta sotto il target (${fmtMeur(tgtNpv)})`);
  }

  const agentMessage =
    parts.length > 0
      ? `L'agente segnala: ${parts.join(' e ')}. ${
          blocking
            ? 'Lo scostamento blocca la gate readiness: verifica i numeri prima del comitato.'
            : 'Verifica i numeri prima del comitato.'
        }`
      : "L'agente non rileva sforamenti sul business case: payback e NPV rientrano nelle soglie. I valori sono allineati al target.";

  const anyBreach = paybackBreach || npvBreach;

  // dati per i due chart (Payback e NPV)
  const chartRows: ChartRow[] = [
    {
      metricLabel: 'Payback',
      unit: 'anni',
      target: getNum(target, 'paybackYears'),
      estimation: estPayback,
      baseline: baseVal('paybackYears'),
      threshold: thresholds.paybackMaxYears,
      thresholdKind: 'max',
      breach: paybackBreach,
      fmt: fmtYears,
    },
    {
      metricLabel: 'NPV',
      unit: 'M€',
      target: getNum(target, 'npvMeur'),
      estimation: estNpv,
      baseline: baseVal('npvMeur'),
      threshold: thresholds.npvMinMeur,
      thresholdKind: 'min',
      breach: npvBreach,
      fmt: fmtMeur,
    },
  ];

  return (
    <section
      className="gc-surface gc-fade-up rounded-2xl p-6"
      style={animationDelay ? { animationDelay: `${animationDelay}ms` } : undefined}
      aria-label="Deep-dive del business case: target vs stima"
    >
      {/* intestazione */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Business case: <span className="gc-gradient-text">target vs stima</span>
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Confronto delle metriche di redditività contro la baseline G0 e le soglie di policy.
          </p>
        </div>
        {anyBreach ? (
          <SeverityBadge severity={blocking ? 'Critical' : 'High'} variant="pill" size="sm" />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20">
            <ShieldCheck size={13} strokeWidth={2.4} aria-hidden />
            Entro soglia
          </span>
        )}
      </div>

      {/* ── Bar chart Target vs Stima (Payback + NPV) ──────────────────────── */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {chartRows.map((row) => (
          <MiniChart key={row.metricLabel} row={row} play={play} />
        ))}
      </div>

      {/* legenda del chart */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-r from-blue-500 to-blue-400" aria-hidden />
          Target
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-r from-violet-500 to-violet-400" aria-hidden />
          Stima
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="20" height="8" aria-hidden className="overflow-visible">
            <line x1="0" y1="4" x2="20" y2="4" stroke="#ef4444" strokeWidth="1.6" strokeDasharray="4 3" />
          </svg>
          Soglia di policy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="12" height="10" aria-hidden>
            <path d="M 6 1 l -5 7 l 10 0 Z" className="fill-slate-500 dark:fill-slate-300" />
          </svg>
          Baseline G0
        </span>
      </div>

      {/* ── Tabella comparativa ────────────────────────────────────────────── */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left">
              <th
                scope="col"
                className="rounded-l-lg bg-slate-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400"
              >
                Metrica
              </th>
              <th
                scope="col"
                className="bg-slate-50 px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400"
              >
                Baseline G0
              </th>
              <th
                scope="col"
                className="bg-slate-50 px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400"
              >
                Target (Rev 1)
              </th>
              <th
                scope="col"
                className="rounded-r-lg bg-slate-50 px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400"
              >
                Stima (Rev 1)
              </th>
            </tr>
          </thead>
          <tbody>
            {METRICS.map((m) => {
              const b = baseVal(m.key);
              const t = getNum(target, m.key);
              const e = getNum(estimation, m.key);

              const isPayback = m.key === 'paybackYears';
              const isNpv = m.key === 'npvMeur';
              const estBreach = (isPayback && paybackBreach) || (isNpv && npvBreach);

              // delta stima vs baseline (solo per payback e NPV)
              const showDelta = (isPayback || isNpv) && e !== null && b !== null;
              const delta = showDelta ? (e as number) - (b as number) : 0;

              return (
                <tr
                  key={m.key}
                  className="group transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5"
                >
                  <th
                    scope="row"
                    className="border-b border-slate-100 px-3 py-2.5 text-left font-medium text-slate-700 dark:border-white/10 dark:text-slate-200"
                  >
                    {m.label}
                    {isPayback && (
                      <span className="ml-1.5 font-mono text-[11px] font-normal text-slate-400 dark:text-slate-500">
                        ≤ {fmtYears(thresholds.paybackMaxYears)}
                      </span>
                    )}
                    {isNpv && (
                      <span className="ml-1.5 font-mono text-[11px] font-normal text-slate-400 dark:text-slate-500">
                        ≥ {fmtMeur(thresholds.npvMinMeur)}
                      </span>
                    )}
                  </th>

                  {/* Baseline G0 */}
                  <td className="border-b border-slate-100 px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-700 dark:border-white/10 dark:text-slate-300">
                    {b !== null ? m.fmt(b) : DASH}
                  </td>

                  {/* Target Rev 1 */}
                  <td className="border-b border-slate-100 px-3 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:border-white/10 dark:text-slate-100">
                    {t !== null ? m.fmt(t) : DASH}
                  </td>

                  {/* Stima Rev 1 — con evidenza sforamento + delta vs baseline */}
                  <td
                    className={`border-b px-3 py-2.5 text-right tabular-nums ${
                      estBreach
                        ? 'border-rose-200/70 bg-rose-50/70 dark:border-rose-400/20 dark:bg-rose-500/10'
                        : 'border-slate-100 dark:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-end gap-2">
                      {showDelta && (
                        <span
                          className="inline-flex items-center gap-0.5 font-mono text-[11px] font-medium text-slate-400 dark:text-slate-500"
                          title="Delta rispetto alla baseline G0"
                        >
                          <DeltaArrow delta={delta} worseUp={isPayback} />
                          <span className="tabular-nums">{fmtDelta(delta)}</span>
                        </span>
                      )}
                      <span
                        className={`font-mono font-semibold ${
                          estBreach
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {e !== null ? m.fmt(e) : DASH}
                      </span>
                    </div>
                    {estBreach && (
                      <div className="mt-1 flex justify-end">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/25">
                          <ShieldAlert size={11} strokeWidth={2.6} aria-hidden />
                          oltre soglia
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Messaggio dell'agente ──────────────────────────────────────────── */}
      <div className="gc-inset mt-6 flex items-start gap-3 rounded-xl p-4">
        <span
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-sm gc-glow-blue"
          aria-hidden
        >
          <Bot size={18} strokeWidth={2.2} />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
            Messaggio dell'agente
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {agentMessage}
          </p>
        </div>
      </div>
    </section>
  );
}
