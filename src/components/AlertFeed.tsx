// ============================================================================
// AlertFeed — feed degli avvisi (schermata D). [v2 redesign premium]
// Lista di card-avviso ordinate per severità (già ordinate a monte).
// Ogni card: severità + tipo di check + eventuale blocco gate, regola scattata,
// criterio di riferimento, deliverable interessato, valori rilevato/atteso,
// azione consigliata e instradamento RACI (chi viene notificato, su quale canale).
// REGOLA UX §5.2: mai solo colore → SeverityBadge (icona+testo) e RaciChip (lettera).
// ============================================================================

import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { CHANNEL_LABEL, CHECK_LABEL } from '../types';
import type { Alert, Deliverable, RoleNotification, Severity } from '../types';
import { SeverityBadge } from './SeverityBadge';
import { RaciChip } from './RaciChip';

export interface AlertFeedProps {
  alerts: Alert[]; // GIÀ ordinati per severità
  deliverables: Deliverable[];
  selectedAlertId: string | null;
  onSelectAlert: (id: string) => void;
}

// Bordo sinistro colorato per scansione rapida (sempre accompagnato dal badge testuale).
const SEVERITY_BORDER: Record<Severity, string> = {
  Critical: 'border-l-rose-500',
  High: 'border-l-orange-500',
  Medium: 'border-l-blue-500',
  Info: 'border-l-slate-400',
};

// Alone tenue dietro la striscia, per dare profondità alla severità (dark soprattutto).
const SEVERITY_STRIP_GLOW: Record<Severity, string> = {
  Critical: 'from-rose-500/15',
  High: 'from-orange-500/15',
  Medium: 'from-blue-500/15',
  Info: 'from-slate-400/10',
};

// Pallino diagnostico (oltre alla striscia) per ribadire la severità senza solo-colore.
const SEVERITY_DOT: Record<Severity, string> = {
  Critical: 'bg-rose-500',
  High: 'bg-orange-500',
  Medium: 'bg-blue-500',
  Info: 'bg-slate-400',
};

export function AlertFeed({
  alerts,
  deliverables,
  selectedAlertId,
  onSelectAlert,
}: AlertFeedProps) {
  const byId = new Map(deliverables.map((d) => [d.id, d]));

  return (
    <section
      className="gc-surface rounded-2xl p-5"
      aria-label="Feed degli avvisi"
    >
      {/* Intestazione */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20"
          >
            <ShieldAlert size={17} strokeWidth={2.2} />
          </span>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Avvisi
          </h2>
        </div>
        <span className="inline-flex items-baseline gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-200/70 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10">
          <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {alerts.length}
          </span>
          {alerts.length === 1 ? 'avviso' : 'avvisi'}
        </span>
      </div>

      {alerts.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="flex flex-col gap-3">
          {alerts.map((a, i) => (
            <li
              key={a.id}
              className="gc-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
            >
              <AlertCard
                alert={a}
                deliverable={byId.get(a.finding.deliverableId)}
                selected={a.id === selectedAlertId}
                onSelect={onSelectAlert}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------

interface AlertCardProps {
  alert: Alert;
  deliverable: Deliverable | undefined;
  selected: boolean;
  onSelect: (id: string) => void;
  /** Mostra l'instradamento RACI compatto ("Notifica a"). Default true.
   *  Va disattivato quando sotto la card si mostra l'anteprima notifiche completa. */
  showRouting?: boolean;
  /** Mostra una freccia di espansione (per le card-accordion nella finestra avvisi). */
  expandable?: boolean;
}

export function AlertCard({
  alert,
  deliverable,
  selected,
  onSelect,
  showRouting = true,
  expandable = false,
}: AlertCardProps) {
  const { finding, severity, blocksGate, recommendedAction, notifiedRoles } =
    alert;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-expanded={expandable ? selected : undefined}
      aria-label={`Avviso ${CHECK_LABEL[finding.type]} su ${deliverable ? deliverable.name : finding.deliverableId}`}
      onClick={() => onSelect(alert.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(alert.id);
        }
      }}
      className={[
        'group relative cursor-pointer overflow-hidden rounded-xl border border-l-4 p-4 text-left',
        'transition-[transform,box-shadow,border-color,background-color] duration-300 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60',
        SEVERITY_BORDER[severity],
        selected
          ? 'gc-glow-blue -translate-y-0.5 border-blue-400/50 bg-blue-50/70 ring-2 ring-blue-500/50 dark:border-blue-400/40 dark:bg-blue-500/10'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.05]',
      ].join(' ')}
    >
      {/* Alone tenue dietro la striscia di severità (decorativo) */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r to-transparent opacity-70 ${SEVERITY_STRIP_GLOW[severity]}`}
      />

      <div className="relative">
        {/* Riga superiore: severità + tipo check + blocco gate */}
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={severity} />
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/70 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[severity]}`}
            />
            {CHECK_LABEL[finding.type]}
          </span>
          {blocksGate && (
            <span
              className={`gc-pulse-glow inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/30 ${
                expandable ? '' : 'ml-auto'
              }`}
            >
              <ShieldAlert size={13} strokeWidth={2.4} aria-hidden />
              Blocca il gate
            </span>
          )}
          {expandable && (
            <ChevronDown
              size={18}
              strokeWidth={2.4}
              aria-hidden
              className={`ml-auto shrink-0 text-slate-400 transition-transform duration-300 dark:text-slate-500 ${
                selected ? 'rotate-180 text-blue-500 dark:text-blue-400' : ''
              }`}
            />
          )}
        </div>

        {/* Regola scattata */}
        <p className="mt-3 text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-100">
          {finding.message}
        </p>

        {/* Criterio di riferimento */}
        <div className="mt-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Criterio di riferimento
          </p>
          <blockquote className="mt-1 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-500 dark:border-white/15 dark:text-slate-400">
            {finding.criterionRef}
          </blockquote>
        </div>

        {/* Deliverable interessato */}
        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Deliverable
          </span>
          {deliverable ? (
            <span className="text-slate-700 dark:text-slate-300">
              <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {deliverable.id}
              </span>{' '}
              · {deliverable.name}
            </span>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">
              {finding.deliverableId}
            </span>
          )}
        </div>

        {/* Rilevato / atteso */}
        {(finding.observed || finding.expected) && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {finding.observed && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${
                  severity === 'Critical' || severity === 'High'
                    ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/30'
                    : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30'
                }`}
              >
                <span className="font-normal opacity-70">rilevato:</span>
                <span className="font-mono tabular-nums">
                  {finding.observed}
                </span>
              </span>
            )}
            {finding.expected && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10">
                <span className="font-normal opacity-70">atteso:</span>
                <span className="font-mono tabular-nums">
                  {finding.expected}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Azione consigliata */}
        {recommendedAction && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-blue-50/70 px-3 py-2 ring-1 ring-blue-100 dark:bg-blue-500/10 dark:ring-blue-400/20">
            <Wrench
              size={14}
              strokeWidth={2.2}
              className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-300"
              aria-hidden
            />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Azione consigliata:
              </span>{' '}
              {recommendedAction}
            </p>
          </div>
        )}

        {/* Notifica a: instradamento RACI (nascosto quando sotto c'è l'anteprima completa) */}
        {showRouting && notifiedRoles.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/10">
            <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              <ArrowRight size={12} strokeWidth={2.4} aria-hidden />
              Notifica a
            </p>
            <ul className="flex flex-col gap-1.5">
              {notifiedRoles.map((n) => (
                <NotifiedRole key={n.role} notification={n} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------

function NotifiedRole({ notification }: { notification: RoleNotification }) {
  const { role, letter, channel, blocking } = notification;
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
      <RaciChip letter={letter} role={role} showRole />
      <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-white/5 dark:text-slate-400">
        {CHANNEL_LABEL[channel]}
      </span>
      {blocking && (
        <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/30">
          <span aria-hidden>*</span>
          ACK richiesto
        </span>
      )}
    </li>
  );
}

// ----------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <span
        aria-hidden
        className="gc-pop-in flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25"
      >
        <CheckCircle2 size={30} strokeWidth={2} />
      </span>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Nessun avviso
      </p>
      <p className="max-w-[18rem] text-xs text-slate-500 dark:text-slate-400">
        Nessuna regola scattata sui deliverable del gate.
      </p>
    </div>
  );
}
