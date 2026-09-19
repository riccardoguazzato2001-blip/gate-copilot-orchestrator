import {
  Calendar,
  Moon,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import type { ReadinessBand } from '../types';
import { BAND_META } from '../engine/severity';
import { useCountUp } from '../hooks/useCountUp';

export interface HeaderProps {
  projectName: string; // 'New Energy Metering'
  description: string; // descrizione breve del progetto
  gate: string; // 'G1'
  gateName?: string; // 'Feasibility — Requisiti & Fattibilità'
  simulatedDate: string; // '18 giugno 2026'
  readiness: number; // 0..100
  band: ReadinessBand; // 'green' | 'amber' | 'red'
  onOpenThresholds: () => void;
  // --- v2 (opzionali) ---
  isDark?: boolean;
  onToggleTheme?: () => void;
}

// Stroke + glow espliciti per banda (coerenti con la palette severità).
const BAND_STROKE: Record<ReadinessBand, { stroke: string; glow: string }> = {
  green: { stroke: '#10b981', glow: 'rgba(16, 185, 129, 0.45)' },
  amber: { stroke: '#f59e0b', glow: 'rgba(245, 158, 11, 0.45)' },
  red: { stroke: '#f43f5e', glow: 'rgba(244, 63, 94, 0.45)' },
};

export function Header(props: HeaderProps) {
  const {
    projectName,
    description,
    gate,
    gateName,
    simulatedDate,
    readiness,
    band,
    onOpenThresholds,
    isDark,
    onToggleTheme,
  } = props;

  const meta = BAND_META[band];
  const score = Math.round(Math.max(0, Math.min(100, readiness)));
  const animated = useCountUp(score, { duration: 1100 });
  const display = Math.round(animated);

  const bandColor = BAND_STROKE[band];

  // Geometria del progress radiale.
  const SIZE = 132;
  const STROKE = 11;
  const R = (SIZE - STROKE) / 2;
  const C = 2 * Math.PI * R;
  // Riempimento basato sullo score finale; lo stroke-dashoffset si anima all'entrata.
  const dashOffset = C * (1 - score / 100);

  return (
    <header className="gc-aurora sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-gc-night/70">
      {/* Contenuto sopra l'aurora animata */}
      <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col gap-6 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        {/* ─── Identità progetto + gate ─── */}
        <div className="min-w-0 flex-1 gc-fade-right">
          <div className="flex flex-wrap items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-2.5 py-1 text-sm font-semibold text-white shadow-sm shadow-blue-500/30 dark:from-blue-500 dark:to-violet-500"
              aria-label="Gate Co-Pilot"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Gate Co-Pilot
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              title={gateName}
            >
              <span className="font-semibold">Gate {gate}</span>
              {gateName ? (
                <span
                  className="hidden text-slate-300 dark:text-slate-600 sm:inline"
                  aria-hidden="true"
                >
                  ·
                </span>
              ) : null}
              {gateName ? (
                <span className="hidden font-normal text-slate-500 dark:text-slate-400 sm:inline">
                  {gateName}
                </span>
              ) : null}
            </span>
          </div>

          <h1 className="mt-3 truncate text-2xl font-bold tracking-tight sm:text-3xl">
            <span className="gc-gradient-text">{projectName}</span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-slate-200/70 bg-white/60 px-3 py-1 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            <Calendar
              className="h-4 w-4 text-slate-400 dark:text-slate-500"
              aria-hidden="true"
            />
            <span>
              Data simulata:{' '}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {simulatedDate}
              </span>
            </span>
          </div>
        </div>

        {/* ─── Gate readiness (radiale) + azioni ─── */}
        <div className="flex shrink-0 items-center gap-5 gc-fade-up">
          {/* Progress radiale dominante */}
          <div
            className="relative flex flex-col items-center"
            role="group"
            aria-label={`Gate readiness ${score} su 100 — ${meta.label}`}
          >
            <div
              className="relative gc-float"
              style={{ width: SIZE, height: SIZE }}
            >
              {/* Alone colorato dietro l'anello, in base alla banda */}
              <div
                className="pointer-events-none absolute inset-2 rounded-full blur-2xl"
                style={{ backgroundColor: bandColor.glow }}
                aria-hidden="true"
              />
              <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                className="relative -rotate-90"
                role="progressbar"
                aria-valuenow={score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Avanzamento gate readiness"
              >
                {/* Traccia di fondo */}
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  strokeWidth={STROKE}
                  className="stroke-slate-200/90 dark:stroke-white/10"
                />
                {/* Arco di riempimento (si anima via stroke-dashoffset) */}
                <circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  fill="none"
                  stroke={bandColor.stroke}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={dashOffset}
                  style={{
                    transition:
                      'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
                    filter: `drop-shadow(0 0 6px ${bandColor.glow})`,
                  }}
                />
              </svg>

              {/* Numero al centro */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="font-mono text-4xl font-bold leading-none tabular-nums text-slate-900 dark:text-white"
                  style={{ color: bandColor.stroke }}
                >
                  {display}
                </span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  / 100
                </span>
              </div>
            </div>

            {/* Etichetta della banda */}
            <div className="mt-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Gate Readiness
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.bg} ${meta.text} ring-1 ${meta.ring} dark:bg-white/5 dark:ring-white/10`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${meta.dot}`}
                  aria-hidden="true"
                />
                {meta.label}
              </span>
            </div>
          </div>

          {/* Azioni: toggle tema + configura soglie */}
          <div className="flex flex-col gap-2.5">
            {onToggleTheme ? (
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label={isDark ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
                title={isDark ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm transition-all duration-200 hover:scale-105 hover:border-slate-400 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white"
              >
                {isDark ? (
                  <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
                ) : (
                  <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
                )}
              </button>
            ) : null}

            <button
              type="button"
              onClick={onOpenThresholds}
              aria-label="Configura le soglie di accettazione del gate"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/10"
            >
              <SlidersHorizontal
                className="h-4 w-4 text-slate-500 dark:text-slate-400"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Configura soglie</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
