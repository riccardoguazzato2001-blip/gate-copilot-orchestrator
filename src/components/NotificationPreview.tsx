// ============================================================================
// NotificationPreview v2 — anteprima delle notifiche per ruolo RACI (schermata G).
// Per l'alert selezionato mostra il MESSAGGIO ESATTO che ciascun ruolo
// riceverebbe, navigabile per destinatario con TAB animate (A→R→C→I).
// Ogni destinatario ha un avatar di ruolo (PM/Product/R&D/Finance/Lab/Quality),
// canale (Diretto/Dashboard/Digest), badge "ACK bloccante" e SeverityBadge in testata.
// Effetto "typing": all'apertura del messaggio l'agente "scrive" (3 dot → testo con fade).
// AI opzionale: se la chiave è presente, un bottone riformula i testi.
// REGOLA UX §5.2: mai solo colore → usa RaciChip (lettera) e SeverityBadge.
// ============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Beaker,
  ClipboardCheck,
  Cpu,
  LayoutDashboard,
  Lock,
  Mail,
  MailQuestion,
  Send,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CHANNEL_LABEL, RACI_LABEL } from '../types';
import type {
  Alert,
  Deliverable,
  NotificationChannel,
  RaciLetter,
  RaciRole,
  RoleNotification,
} from '../types';
import { RaciChip } from './RaciChip';
import { SeverityBadge } from './SeverityBadge';
import { enhanceNotifications, isAiEnabled } from '../engine/ai';

export interface NotificationPreviewProps {
  alert: Alert | null;
  deliverables: Deliverable[];
  /** Opzionale: durata in ms dell'effetto "typing" (default 520). */
  typingMs?: number;
  /** Modalità incorporata (es. sotto una card avviso): niente superficie/glass
   *  propria né intestazione con severità/deliverable (già mostrati dalla card). */
  bare?: boolean;
}

// Ordine di presentazione delle notifiche per lettera RACI.
const LETTER_ORDER: Record<RaciLetter, number> = { A: 0, R: 1, C: 2, I: 3 };

// Etichetta breve della lettera per la tab.
const LETTER_SHORT: Record<RaciLetter, string> = {
  A: 'Accountable',
  R: 'Responsible',
  C: 'Consulted',
  I: 'Informed',
};

// Sottotitolo che spiega il tipo di destinatario in base alla lettera.
const RECIPIENT_HINT: Record<RaciLetter, string> = {
  A: 'serve decisione/firma',
  R: 'correggi questo',
  C: 'serve il tuo parere',
  I: 'FYI',
};

// Icona per il canale di notifica.
const CHANNEL_ICON: Record<NotificationChannel, LucideIcon> = {
  direct: Send,
  dashboard: LayoutDashboard,
  digest: Mail,
};

// Avatar/icona per ciascun ruolo RACI (coerente con la semantica del ruolo).
const ROLE_ICON: Record<RaciRole, LucideIcon> = {
  PM: UserRound,
  Product: LayoutDashboard,
  RnD: Cpu,
  Finance: Wallet,
  Lab: Beaker,
  Quality: ClipboardCheck,
};

// Accento cromatico dell'avatar per ruolo (gradient sottile, leggibile in light/dark).
const ROLE_ACCENT: Record<RaciRole, string> = {
  PM: 'from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-300 ring-blue-500/20',
  Product:
    'from-violet-500/15 to-violet-500/5 text-violet-600 dark:text-violet-300 ring-violet-500/20',
  RnD: 'from-cyan-500/15 to-cyan-500/5 text-cyan-600 dark:text-cyan-300 ring-cyan-500/20',
  Finance:
    'from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-300 ring-emerald-500/20',
  Lab: 'from-fuchsia-500/15 to-fuchsia-500/5 text-fuchsia-600 dark:text-fuchsia-300 ring-fuchsia-500/20',
  Quality:
    'from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-300 ring-amber-500/20',
};

export function NotificationPreview({
  alert,
  deliverables,
  typingMs = 520,
  bare = false,
}: NotificationPreviewProps) {
  // Testi mostrati: di default i template dell'alert, eventualmente riformulati dall'AI.
  const [notifications, setNotifications] = useState<RoleNotification[]>(
    alert?.notifiedRoles ?? [],
  );
  const [loading, setLoading] = useState(false);
  // Indice della tab/destinatario attivo.
  const [activeIdx, setActiveIdx] = useState(0);
  // Effetto "typing": true finché l'agente "sta scrivendo" il messaggio attivo.
  const [typing, setTyping] = useState(false);
  const aiEnabled = isAiEnabled();

  // Riferimenti ai bottoni-tab per dimensionare/posizionare l'indicatore scorrevole.
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabListRef = useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState<{ x: number; w: number }>({
    x: 0,
    w: 0,
  });

  // Notifiche ordinate per lettera RACI (A→R→C→I).
  const sorted = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => LETTER_ORDER[a.letter] - LETTER_ORDER[b.letter],
      ),
    [notifications],
  );

  // Reset al cambio di alert: torna ai template, prima tab, niente loading.
  // (Sincronizzazione legittima di stato derivato dai prop al cambio di alert.)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNotifications(alert?.notifiedRoles ?? []);
    setLoading(false);
    setActiveIdx(0);
  }, [alert?.id, alert?.notifiedRoles]);

  // Mantiene l'indice valido se il numero di notifiche cambia.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIdx((i) => (sorted.length === 0 ? 0 : Math.min(i, sorted.length - 1)));
  }, [sorted.length]);

  // Effetto "typing" al cambio di destinatario o dopo una riformulazione AI.
  const activeKey = sorted[activeIdx]
    ? `${sorted[activeIdx].role}-${sorted[activeIdx].letter}-${sorted[activeIdx].message}`
    : '';
  useEffect(() => {
    if (!activeKey) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTyping(true);
    const t = window.setTimeout(() => setTyping(false), typingMs);
    return () => window.clearTimeout(t);
  }, [activeKey, typingMs]);

  // Posiziona l'indicatore scorrevole sotto la tab attiva (transform translateX).
  useEffect(() => {
    const el = tabRefs.current[activeIdx];
    const list = tabListRef.current;
    if (!el || !list) return;
    const update = () => {
      const elRect = el.getBoundingClientRect();
      const listRect = list.getBoundingClientRect();
      setIndicator({ x: elRect.left - listRect.left, w: elRect.width });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [activeIdx, sorted.length, sorted]);

  const handleEnhance = async () => {
    setLoading(true);
    try {
      const next = await enhanceNotifications(alert!);
      setNotifications(next);
    } finally {
      setLoading(false);
    }
  };

  // Navigazione tab da tastiera (frecce ←/→, Home/End).
  const onTabKeyDown = (e: React.KeyboardEvent) => {
    if (sorted.length === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % sorted.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + sorted.length) % sorted.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIdx(sorted.length - 1);
    }
  };

  // Stato vuoto: nessun alert selezionato.
  if (!alert) {
    return (
      <section className={bare ? '' : 'gc-surface rounded-2xl p-6'}>
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <span className="gc-float inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-500 dark:ring-white/10">
            <MailQuestion size={26} strokeWidth={2} aria-hidden />
          </span>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Seleziona un avviso per vedere le notifiche
          </p>
          <p className="max-w-xs text-xs text-slate-400 dark:text-slate-500">
            Verrà mostrato il messaggio esatto recapitato a ciascun ruolo RACI,
            con canale e acknowledgement richiesto.
          </p>
        </div>
      </section>
    );
  }

  const deliverable = deliverables.find((d) => d.id === alert.finding.deliverableId);
  const active = sorted[activeIdx];

  return (
    <section
      className={bare ? '' : 'gc-surface rounded-2xl p-5 sm:p-6'}
      aria-label="Anteprima notifiche per ruolo RACI"
    >
      {/* ── Header card ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/15 to-violet-500/10 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-300"
              aria-hidden
            >
              <Send size={14} strokeWidth={2.4} />
            </span>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {bare ? 'Anteprima notifiche per ruolo' : 'Anteprima notifiche'}
            </h2>
          </div>
          {!bare && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              {deliverable && (
                <span className="truncate text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {deliverable.id}
                  </span>{' '}
                  · {deliverable.name}
                </span>
              )}
            </div>
          )}
        </div>

        {aiEnabled && (
          <button
            type="button"
            onClick={handleEnhance}
            disabled={loading}
            aria-label="Riformula le notifiche con l'AI"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition-all duration-200 hover:-translate-y-px hover:border-blue-300 hover:bg-blue-100 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:border-blue-400/40 dark:hover:bg-blue-500/20"
          >
            <Sparkles
              size={15}
              strokeWidth={2.2}
              aria-hidden
              className={
                loading
                  ? 'animate-pulse'
                  : 'transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110'
              }
            />
            {loading ? 'Riformulo…' : 'Riformula con AI'}
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-white/10 dark:text-slate-500">
          Nessun destinatario per questo avviso.
        </div>
      ) : (
        <>
          {/* ── Tab destinatari con indicatore scorrevole ──────────────── */}
          <div className="mt-5">
            <div
              ref={tabListRef}
              role="tablist"
              aria-label="Destinatari della notifica"
              onKeyDown={onTabKeyDown}
              className="relative flex gap-1 rounded-xl bg-slate-100/80 p-1 ring-1 ring-slate-200 dark:bg-white/5 dark:ring-white/10"
            >
              {/* Indicatore: scorre con translateX, larghezza animata via transform-free width set una tantum */}
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-1 top-1 rounded-lg bg-white shadow-sm ring-1 ring-slate-200 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-white/10 dark:ring-white/10"
                style={{
                  width: indicator.w,
                  transform: `translateX(${indicator.x}px)`,
                }}
              />
              {sorted.map((n, i) => {
                const selected = i === activeIdx;
                return (
                  <button
                    key={`${n.role}-${n.letter}`}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`notif-tab-${i}`}
                    aria-selected={selected}
                    aria-controls={`notif-panel-${i}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActiveIdx(i)}
                    className={[
                      'relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors duration-200',
                      selected
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                    ].join(' ')}
                  >
                    <RaciChip letter={n.letter} />
                    <span className="hidden sm:inline">{LETTER_SHORT[n.letter]}</span>
                    {n.blocking && (
                      <Lock
                        size={11}
                        strokeWidth={2.6}
                        aria-hidden
                        className="text-rose-500 dark:text-rose-400"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Pannello del destinatario attivo (fade al cambio) ───────── */}
          {active && (
            <article
              key={`${active.role}-${active.letter}-${activeIdx}`}
              id={`notif-panel-${activeIdx}`}
              role="tabpanel"
              aria-labelledby={`notif-tab-${activeIdx}`}
              className="gc-fade-in mt-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors dark:border-white/10 dark:bg-white/[0.03]"
            >
              {/* Intestazione: avatar ruolo + RaciChip, hint, canale, ACK bloccante */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <RoleAvatar role={active.role} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <RaciChip letter={active.letter} />
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {RACI_LABEL[active.role]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {RECIPIENT_HINT[active.letter]}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                  {active.blocking && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/30"
                      title="Acknowledgement obbligatorio: blocca la gate readiness"
                    >
                      <Lock size={12} strokeWidth={2.4} aria-hidden />
                      ACK bloccante
                    </span>
                  )}
                  <ChannelBadge channel={active.channel} />
                </div>
              </div>

              {/* Corpo: il messaggio esatto, con effetto "typing" iniziale.
                  Il testo completo resta sempre nel DOM (accessibile) anche durante il typing. */}
              <div className="relative mt-3">
                {typing && (
                  <div
                    aria-hidden
                    className="gc-fade-in absolute inset-0 flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 text-slate-400 ring-1 ring-slate-100 dark:bg-white/5 dark:text-slate-500 dark:ring-white/10"
                  >
                    <span className="gc-typing-dot" />
                    <span className="gc-typing-dot" />
                    <span className="gc-typing-dot" />
                    <span className="ml-1 text-xs font-medium">
                      {RACI_LABEL[active.role]} sta ricevendo…
                    </span>
                  </div>
                )}
                <p
                  className={[
                    'rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-100 transition-opacity duration-300 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10',
                    typing ? 'opacity-0' : 'opacity-100',
                  ].join(' ')}
                >
                  {active.message}
                </p>
              </div>

              {/* Riga inferiore: progressione destinatario (X di N) */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                    {activeIdx + 1}
                  </span>
                  <span>/</span>
                  <span className="font-mono tabular-nums">{sorted.length}</span>
                  <span className="ml-1">destinatari</span>
                </span>
                <span className="hidden items-center gap-1 sm:inline-flex">
                  Usa ← → per navigare
                </span>
              </div>
            </article>
          )}

          {/* ── Riepilogo compatto degli altri destinatari (scansione rapida) ── */}
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Tutti i destinatari">
            {sorted.map((n, i) => {
              const RoleIcon = ROLE_ICON[n.role];
              const selected = i === activeIdx;
              return (
                <li key={`mini-${n.role}-${n.letter}`}>
                  <button
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    aria-label={`Mostra notifica per ${RACI_LABEL[n.role]} (${LETTER_SHORT[n.letter]})`}
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-200',
                      selected
                        ? 'border-blue-300 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-200'
                        : 'border-slate-200 bg-white text-slate-500 hover:-translate-y-px hover:border-slate-300 hover:text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 dark:hover:border-white/20 dark:hover:text-slate-200',
                    ].join(' ')}
                  >
                    <RoleIcon size={13} strokeWidth={2.2} aria-hidden />
                    {RACI_LABEL[n.role]}
                    {n.blocking && (
                      <Lock
                        size={10}
                        strokeWidth={2.6}
                        aria-hidden
                        className="text-rose-500 dark:text-rose-400"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------

// Avatar circolare del ruolo, con accento cromatico per ruolo (light + dark).
function RoleAvatar({ role }: { role: RaciRole }) {
  const Icon = ROLE_ICON[role];
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ring-1 ${ROLE_ACCENT[role]}`}
      aria-hidden
    >
      <Icon size={18} strokeWidth={2.2} />
    </span>
  );
}

// ----------------------------------------------------------------------------

// Badge del canale di notifica, con icona coerente.
function ChannelBadge({ channel }: { channel: NotificationChannel }) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-300 dark:ring-white/10"
      aria-label={`Canale: ${CHANNEL_LABEL[channel]}`}
    >
      <Icon size={12} strokeWidth={2.2} aria-hidden />
      {CHANNEL_LABEL[channel]}
    </span>
  );
}
