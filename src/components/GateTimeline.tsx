// ============================================================================
// GateTimeline — COMPONENTE EROE della dashboard Gate Co-Pilot v2.
// Stepper visivo del ciclo di vita dei decision gate (G0 → G1 → G2) per il PM.
//
// • Timeline ORIZZONTALE su desktop, VERTICALE su mobile (<768px).
// • Nodi circolari per ogni gate, connessi da una linea di progressione con
//   flusso luminoso animato sul tratto passed→active.
// • Stati: passed (emerald + check), active (anello gradient rotante + pulse,
//   glow blu), upcoming (semi-trasparente, bordo tratteggiato).
// • Sotto il gate ATTIVO una card espandibile (default espansa) con il Gate
//   Readiness come progress RADIALE animato (SVG + useCountUp, colore = banda),
//   la lista keyMilestones e passedChecks/totalChecks.
// • Tooltip sui gate passed: data completamento, score finale, n. deliverable.
//
// REGOLE: nessun ricalcolo di dominio (i dati arrivano già popolati da App).
// Animazioni solo transform/opacity + stroke-dashoffset. Dark + light. IT.
// ============================================================================

import { useState } from 'react';
import {
  Check,
  Clock,
  CircleDashed,
  ChevronDown,
  Target,
  FileStack,
  CalendarCheck,
  ListChecks,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCountUp } from '../hooks/useCountUp';
import type {
  GateInfo,
  ReadinessBand,
  GateStatus,
  GateMilestone,
} from '../types';

export interface GateTimelineProps {
  gates: GateInfo[];
  band: ReadinessBand;
  /** consente di forzare lo stato espanso iniziale (default: gate attivo) */
  defaultExpandedId?: GateInfo['id'] | null;
}

// --- Etichette e semantica di stato ----------------------------------------
const STATUS_LABEL: Record<GateStatus, string> = {
  passed: 'Completato',
  active: 'In corso',
  upcoming: 'Da avviare',
};

const STATUS_ICON: Record<GateStatus, LucideIcon> = {
  passed: Check,
  active: Clock,
  upcoming: CircleDashed,
};

// Colore della banda di readiness (NON cambiare la semantica).
const BAND_HEX: Record<ReadinessBand, string> = {
  green: '#10b981', // emerald-500
  amber: '#f59e0b', // amber-500
  red: '#f43f5e', // rose-500
};

const BAND_LABEL: Record<ReadinessBand, string> = {
  green: 'Pronto per la revisione',
  amber: 'Attenzione richiesta',
  red: 'Non pronto — azioni bloccanti',
};

// Classi testo banda (leggibili in entrambi i temi).
const BAND_TEXT: Record<ReadinessBand, string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  red: 'text-rose-600 dark:text-rose-400',
};

// Banda "effettiva" della card di dettaglio: il gate ATTIVO usa la banda live
// dell'engine (prop); i gate passati/futuri derivano dalla propria readiness
// (stesse soglie dell'engine: ≥85 verde · 60–84 ambra · <60 rosso).
function bandForGate(gate: GateInfo, activeBand: ReadinessBand): ReadinessBand {
  if (gate.status === 'active') return activeBand;
  if (typeof gate.readiness !== 'number') return 'amber';
  return gate.readiness >= 85 ? 'green' : gate.readiness >= 60 ? 'amber' : 'red';
}

// =============================================================================
// Nodo circolare del gate
// =============================================================================
function GateNode({
  gate,
  band,
  expanded,
  onToggle,
}: {
  gate: GateInfo;
  band: ReadinessBand;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const StatusGlyph = STATUS_ICON[gate.status];

  const isPassed = gate.status === 'passed';
  const isActive = gate.status === 'active';

  // Cerchio: superficie/colore per stato.
  const circleBase =
    'relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300';

  const circleByStatus =
    isPassed
      ? 'bg-emerald-500 text-white gc-glow-emerald'
      : isActive
        ? 'bg-blue-500 text-white gc-glow-blue'
        : 'border-2 border-dashed border-slate-300 bg-slate-100/60 text-slate-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-400';

  return (
    <div
      className="relative flex shrink-0 flex-col items-center"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Tooltip per i gate completati */}
      {isPassed && hover && (
        <div
          role="tooltip"
          className="gc-surface-strong gc-fade-in absolute bottom-full z-30 mb-3 w-56 rounded-xl p-3 text-left shadow-xl md:left-1/2 md:-translate-x-1/2"
        >
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {gate.name}
          </p>
          <dl className="mt-2 space-y-1.5 text-xs">
            {gate.completedDate && (
              <div className="flex items-center justify-between gap-2">
                <dt className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <CalendarCheck size={13} aria-hidden /> Completato
                </dt>
                <dd className="font-medium text-slate-700 dark:text-slate-200">
                  {gate.completedDate}
                </dd>
              </div>
            )}
            {typeof gate.readiness === 'number' && (
              <div className="flex items-center justify-between gap-2">
                <dt className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Target size={13} aria-hidden /> Score finale
                </dt>
                <dd className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {gate.readiness}%
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <dt className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <FileStack size={13} aria-hidden /> Deliverable
              </dt>
              <dd className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {gate.deliverableCount}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Pulsante-nodo: cliccabile + navigabile da tastiera */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${gate.name} — ${STATUS_LABEL[gate.status]}${
          typeof gate.readiness === 'number' ? `, readiness ${gate.readiness}%` : ''
        }. ${expanded ? 'Comprimi' : 'Espandi'} dettagli.`}
        className="group flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl px-2 py-1.5 outline-none"
      >
        {/* Anello rotante solo per il gate attivo */}
        <div
          className={
            isActive
              ? 'gc-ring-rotate rounded-full transition-transform duration-300 group-hover:scale-105'
              : 'transition-transform duration-300 group-hover:scale-105'
          }
        >
          <div className={`${circleBase} ${circleByStatus}`}>
            {/* Onda concentrica per il nodo attivo */}
            {isActive && (
              <span
                className="gc-pulse-ring absolute inset-0 rounded-full text-blue-400"
                aria-hidden
              />
            )}
            <StatusGlyph
              size={26}
              strokeWidth={2.6}
              className={isPassed ? 'gc-pop-in' : ''}
              aria-hidden
            />
          </div>
        </div>

        {/* Etichette: id + shortName + stato */}
        <div className="flex flex-col items-center text-center">
          <span className="font-mono text-xs font-bold tracking-wider text-slate-400 dark:text-slate-500">
            {gate.id}
          </span>
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {gate.shortName}
          </span>
          <StatusPill status={gate.status} band={band} />
        </div>

        {/* Chevron solo per il gate attivo (la card si espande sotto) */}
        {isActive && (
          <ChevronDown
            size={16}
            aria-hidden
            className={`text-blue-500 transition-transform duration-300 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>
    </div>
  );
}

// --- Pill di stato -----------------------------------------------------------
function StatusPill({ status, band }: { status: GateStatus; band: ReadinessBand }) {
  const cls =
    status === 'passed'
      ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300'
      : status === 'active'
        ? band === 'red'
          ? 'bg-rose-500/10 text-rose-700 ring-rose-500/30 dark:text-rose-300'
          : band === 'amber'
            ? 'bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300'
            : 'bg-blue-500/10 text-blue-700 ring-blue-500/30 dark:text-blue-300'
      : 'bg-slate-500/10 text-slate-500 ring-slate-400/20 dark:text-slate-400';

  return (
    <span
      className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${cls}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

// =============================================================================
// Connettore tra due nodi (orizzontale su desktop, verticale su mobile)
// =============================================================================
function Connector({ filled }: { filled: boolean }) {
  // `filled` = tratto passed→active (pieno + flusso luminoso).
  // !filled  = tratto active→upcoming (tratteggiato semi-trasparente).
  return (
    <div
      aria-hidden
      className="relative flex shrink-0 self-stretch md:mt-8 md:flex-1 md:self-auto"
    >
      {/* MOBILE: linea verticale */}
      <div className="relative mx-auto h-10 w-0.5 md:hidden">
        {filled ? (
          <>
            <div className="h-full w-full rounded-full bg-gradient-to-b from-emerald-500 to-blue-500" />
            <div className="gc-flow absolute inset-0 rounded-full opacity-80" />
          </>
        ) : (
          <div className="h-full w-full rounded-full border-l-2 border-dashed border-slate-300 dark:border-white/15" />
        )}
      </div>

      {/* DESKTOP: linea orizzontale */}
      <div className="relative hidden h-1 w-full overflow-hidden rounded-full md:block">
        {filled ? (
          <>
            <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500" />
            <div className="gc-flow absolute inset-0 rounded-full opacity-80" />
          </>
        ) : (
          <div className="h-0 w-full border-t-2 border-dashed border-slate-300 dark:border-white/15" />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Progress radiale (SVG) del Gate Readiness — animato con useCountUp
// =============================================================================
function RadialReadiness({ value, band }: { value: number; band: ReadinessBand }) {
  const animated = useCountUp(value, { duration: 1200, decimals: 0, delay: 200 });
  const size = 132;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - animated / 100);
  const color = BAND_HEX[band];

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Gate Readiness ${value}% — ${BAND_LABEL[band]}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        {/* track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-white/10"
        />
        {/* progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            transition: 'stroke-dashoffset 0.2s linear',
            filter: `drop-shadow(0 0 6px ${color}66)`,
          }}
        />
      </svg>
      {/* numero centrale */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-mono text-3xl font-bold tabular-nums leading-none"
          style={{ color }}
        >
          {animated}
          <span className="text-lg font-semibold">%</span>
        </span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Readiness
        </span>
      </div>
    </div>
  );
}

// --- Riga di milestone -------------------------------------------------------
function MilestoneRow({ m, index }: { m: GateMilestone; index: number }) {
  return (
    <li
      className="gc-fade-right flex items-center gap-2.5"
      style={{ animationDelay: `${150 + index * 70}ms` }}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          m.done
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : 'bg-slate-400/10 text-slate-400 dark:text-slate-500'
        }`}
        aria-hidden
      >
        {m.done ? (
          <Check size={13} strokeWidth={3} />
        ) : (
          <CircleDashed size={13} strokeWidth={2.4} />
        )}
      </span>
      <span
        className={`text-sm ${
          m.done
            ? 'text-slate-700 dark:text-slate-200'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {m.label}
      </span>
      <span className="sr-only">{m.done ? '(completata)' : '(da completare)'}</span>
    </li>
  );
}

// =============================================================================
// Card espandibile sotto un gate
// =============================================================================
function GateDetailCard({ gate, band }: { gate: GateInfo; band: ReadinessBand }) {
  const readiness = typeof gate.readiness === 'number' ? gate.readiness : 0;
  const hasChecks =
    typeof gate.passedChecks === 'number' && typeof gate.totalChecks === 'number';
  const checkPct =
    hasChecks && gate.totalChecks
      ? Math.round((gate.passedChecks! / gate.totalChecks) * 100)
      : 0;
  const doneCount = gate.keyMilestones.filter((m) => m.done).length;

  return (
    <div className="gc-inset gc-scale-in mt-2 overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr] md:items-center">
        {/* Colonna sinistra: radiale + banda */}
        <div className="flex flex-col items-center gap-3">
          <RadialReadiness value={readiness} band={band} />
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${BAND_TEXT[band]}`}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: BAND_HEX[band] }}
              aria-hidden
            />
            {BAND_LABEL[band]}
          </span>
          {hasChecks && (
            <div className="w-full max-w-[180px] text-center">
              <p className="font-mono text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {gate.passedChecks}/{gate.totalChecks}
                <span className="ml-1.5 text-xs font-normal text-slate-500 dark:text-slate-400">
                  verifiche superate
                </span>
              </p>
              {/* barra verifiche (solo transform per l'animazione) */}
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full origin-left rounded-full bg-emerald-500 transition-transform duration-700"
                  style={{ transform: `scaleX(${checkPct / 100})`, width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Colonna destra: milestone chiave */}
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              <ListChecks size={16} className="text-blue-500" aria-hidden />
              Milestone chiave
            </h4>
            <span className="font-mono text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
              {doneCount}/{gate.keyMilestones.length}
            </span>
          </div>
          <ul className="space-y-2.5">
            {gate.keyMilestones.map((m, i) => (
              <MilestoneRow key={m.label} m={m} index={i} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Componente principale
// =============================================================================
export function GateTimeline({ gates, band, defaultExpandedId }: GateTimelineProps) {
  const activeGate = gates.find((g) => g.status === 'active');
  const initialExpanded =
    defaultExpandedId !== undefined ? defaultExpandedId : activeGate?.id ?? null;
  const [expandedId, setExpandedId] = useState<GateInfo['id'] | null>(initialExpanded);

  const expandedGate = gates.find((g) => g.id === expandedId);

  const toggle = (id: GateInfo['id']) =>
    setExpandedId((cur) => (cur === id ? null : id));

  return (
    <section
      className="gc-surface gc-fade-up rounded-2xl p-6"
      aria-label="Timeline dei decision gate"
    >
      {/* Intestazione */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Ciclo di vita dei gate
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Percorso di governance del progetto attraverso i decision gate.
          </p>
        </div>
        {activeGate && (
          <span className="hidden shrink-0 items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-500/25 dark:text-blue-300 sm:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            Gate attivo: {activeGate.id}
          </span>
        )}
      </div>

      {/* Riga di nodi + connettori (orizzontale desktop / verticale mobile) */}
      <ol className="flex flex-col items-stretch md:flex-row md:items-start md:justify-between">
        {gates.map((gate, i) => {
          const next = gates[i + 1];
          // Un connettore è "pieno" se parte da un gate completato.
          const connectorFilled = gate.status === 'passed';
          return (
            <li
              key={gate.id}
              className="flex flex-col items-center md:flex-1 md:flex-row md:items-start"
            >
              <div
                className="gc-pop-in flex justify-center md:flex-1"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <GateNode
                  gate={gate}
                  band={band}
                  expanded={expandedId === gate.id}
                  onToggle={() => toggle(gate.id)}
                />
              </div>
              {next && <Connector filled={connectorFilled} />}
            </li>
          );
        })}
      </ol>

      {/* Card di dettaglio del gate espanso */}
      {expandedGate && (
        <GateDetailCard gate={expandedGate} band={bandForGate(expandedGate, band)} />
      )}
    </section>
  );
}
