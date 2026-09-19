// ============================================================================
// AlertCenter — pannello "lancia-finestra" degli avvisi nella dashboard.
// Riepilogo compatto (conteggi per severità + teaser cliccabili) con una CTA
// prominente che apre il Centro Avvisi come finestra a comparsa (AlertsPopup).
// ============================================================================

import { ChevronRight, Maximize2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { CHECK_LABEL, SEVERITY_LABEL } from '../types';
import type { Alert, Deliverable, Severity } from '../types';
import { SeverityBadge } from './SeverityBadge';

export interface AlertCenterProps {
  alerts: Alert[];
  deliverables: Deliverable[];
  /** Apre la finestra avvisi; se passato un id, quell'avviso parte espanso. */
  onOpen: (id?: string) => void;
}

const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Info'];

const SEVERITY_DOT: Record<Severity, string> = {
  Critical: 'bg-rose-500',
  High: 'bg-orange-500',
  Medium: 'bg-blue-500',
  Info: 'bg-slate-400',
};

export function AlertCenter({ alerts, deliverables, onOpen }: AlertCenterProps) {
  const byId = new Map(deliverables.map((d) => [d.id, d]));
  const counts: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Info: 0 };
  for (const a of alerts) counts[a.severity] += 1;
  const blocking = alerts.filter((a) => a.blocksGate).length;
  const activeSeverities = SEVERITY_ORDER.filter((s) => counts[s] > 0);

  return (
    <section
      className="gc-surface rounded-2xl p-5"
      aria-label="Centro avvisi"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-200/70 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20"
          >
            <ShieldAlert size={17} strokeWidth={2.2} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Centro Avvisi
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {alerts.length}
              </span>{' '}
              {alerts.length === 1 ? 'avviso rilevato' : 'avvisi rilevati'}
            </p>
          </div>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl bg-emerald-50/60 py-8 text-center ring-1 ring-emerald-200/60 dark:bg-emerald-500/10 dark:ring-emerald-400/20">
          <ShieldCheck
            size={28}
            strokeWidth={2}
            className="text-emerald-500 dark:text-emerald-300"
            aria-hidden
          />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            Nessun avviso
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tutti i controlli del gate sono superati.
          </p>
        </div>
      ) : (
        <>
          {/* Banner bloccante */}
          {blocking > 0 && (
            <div className="gc-pulse-glow mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/30">
              <ShieldAlert size={16} strokeWidth={2.4} aria-hidden />
              {blocking} {blocking === 1 ? 'avviso blocca' : 'avvisi bloccano'} il gate
            </div>
          )}

          {/* Conteggi per severità */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {activeSeverities.map((s) => (
              <span key={s} className="inline-flex items-center gap-1">
                <SeverityBadge severity={s} />
                <span
                  className="font-mono text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-200"
                  aria-label={`${counts[s]} avvisi di severità ${SEVERITY_LABEL[s]}`}
                >
                  ×{counts[s]}
                </span>
              </span>
            ))}
          </div>

          {/* Teaser cliccabili */}
          <ul className="mt-4 flex flex-col gap-2">
            {alerts.map((a) => {
              const d = byId.get(a.finding.deliverableId);
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(a.id)}
                    aria-label={`Apri l'avviso ${CHECK_LABEL[a.finding.type]} su ${d ? d.name : a.finding.deliverableId}`}
                    className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-all duration-200 hover:-translate-y-px hover:border-blue-300 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-400/40 dark:hover:bg-white/[0.06]"
                  >
                    <span
                      aria-hidden
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[a.severity]}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                        {a.finding.message}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium dark:bg-white/10">
                          {CHECK_LABEL[a.finding.type]}
                        </span>
                        {d && (
                          <span className="font-mono tabular-nums">{d.id}</span>
                        )}
                        {a.blocksGate && (
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            · blocca
                          </span>
                        )}
                      </span>
                    </span>
                    <ChevronRight
                      size={16}
                      aria-hidden
                      className="shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600 dark:group-hover:text-blue-400"
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* CTA: apri la finestra a comparsa */}
          <button
            type="button"
            onClick={() => onOpen()}
            aria-label="Apri il centro avvisi a tutto schermo"
            className="gc-glow-blue mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gc-night"
          >
            <Maximize2 size={16} strokeWidth={2.4} aria-hidden />
            Apri centro avvisi
          </button>
        </>
      )}
    </section>
  );
}
