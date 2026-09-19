// ============================================================================
// AlertsPopup — "Centro Avvisi" come FINESTRA A COMPARSA (modale).
// Effetto wow: overlay con blur + pannello glass che entra in scala/fade.
// Ogni avviso è una card-accordion: cliccandola si espande e mostra SOTTO di sé
// l'anteprima delle notifiche RELATIVA SOLO A QUELL'AVVISO (NotificationPreview).
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { ShieldAlert, ShieldCheck, X } from 'lucide-react';
import type { Alert, Deliverable } from '../types';
import { AlertCard } from './AlertFeed';
import { NotificationPreview } from './NotificationPreview';

export interface AlertsPopupProps {
  open: boolean;
  onClose: () => void;
  alerts: Alert[];
  deliverables: Deliverable[];
  /** Avviso da espandere all'apertura (di norma il più severo). */
  initialAlertId: string | null;
}

export function AlertsPopup({
  open,
  onClose,
  alerts,
  deliverables,
  initialAlertId,
}: AlertsPopupProps) {
  const byId = new Map(deliverables.map((d) => [d.id, d]));
  const [expandedId, setExpandedId] = useState<string | null>(initialAlertId);
  const closeRef = useRef<HTMLButtonElement>(null);

  const blocking = alerts.filter((a) => a.blocksGate).length;

  // All'apertura: espandi l'avviso indicato (o il primo), guardando da id stale.
  useEffect(() => {
    if (!open) return;
    const valid = alerts.some((a) => a.id === initialAlertId)
      ? initialAlertId
      : alerts[0]?.id ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedId(valid);
    const t = setTimeout(() => closeRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, initialAlertId, alerts]);

  // Esc chiude.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Centro avvisi del gate"
    >
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className="gc-fade-in fixed inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-black/60"
      />

      {/* Pannello */}
      <div
        className="gc-scale-in gc-surface-strong relative z-10 my-auto flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accento gradient in alto */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-violet-500 to-sky-400"
        />

        {/* Header */}
        <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <span
            aria-hidden
            className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-md shadow-blue-500/30"
          >
            <ShieldAlert size={20} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Centro Avvisi
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                {alerts.length}
              </span>{' '}
              {alerts.length === 1 ? 'avviso' : 'avvisi'}
              {blocking > 0 && (
                <>
                  {' · '}
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {blocking} {blocking === 1 ? 'bloccante' : 'bloccanti'}
                  </span>
                </>
              )}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Chiudi centro avvisi"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        {/* Corpo scrollabile */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <span
                aria-hidden
                className="gc-pop-in flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25"
              >
                <ShieldCheck size={34} strokeWidth={2} />
              </span>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">
                Nessun avviso aperto
              </p>
              <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
                Tutti i controlli del gate sono superati: nessuna regola è scattata
                sui deliverable.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {alerts.map((a, i) => {
                const isOpen = expandedId === a.id;
                return (
                  <li
                    key={a.id}
                    className="gc-fade-up"
                    style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
                  >
                    <AlertCard
                      alert={a}
                      deliverable={byId.get(a.finding.deliverableId)}
                      selected={isOpen}
                      onSelect={toggle}
                      showRouting={false}
                      expandable
                    />

                    {/* Anteprima notifiche SOTTO l'avviso, solo per quell'avviso */}
                    {isOpen && (
                      <div className="gc-fade-in mt-2 ml-3 rounded-xl border-l-2 border-blue-400/50 bg-slate-50/60 py-1 pl-4 pr-3 dark:border-blue-400/40 dark:bg-white/[0.03]">
                        <NotificationPreview alert={a} deliverables={deliverables} bare />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
