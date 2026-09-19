// ============================================================================
// Gate Co-Pilot v2 — CHAT PANEL
//
// Pannello chatbot del Project Manager. Self-contained: include sia il pulsante
// floating (trigger) sia il pannello slide-in da destra.
//
// • Lo stato dei messaggi vive in useState e PERSISTE per tutta la sessione:
//   chiudendo/riaprendo il pannello la conversazione resta.
// • La logica delle risposte NON è reimplementata qui: si usa answer() dal
//   motore già pronto (../engine/chatbot). Il contesto (soglie, engine, …) può
//   cambiare nel tempo: lo teniamo in un useRef sincronizzato, così le risposte
//   usano sempre i dati correnti al momento dell'invio.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import {
  answer,
  isChatAiEnabled,
  makeMessage,
  QUICK_PROMPTS,
  welcomeMessage,
} from '../engine/chatbot';
import type { ChatContext, ChatMessage } from '../engine/chatbot';
import { renderMarkdown } from '../lib/markdown';

export interface ChatPanelProps {
  ctx: ChatContext;
  /** Apri il pannello già aperto al primo mount (opzionale). */
  defaultOpen?: boolean;
}

// Ritardo artificiale prima di mostrare la risposta (effetto "sta pensando").
const THINKING_MIN = 600;
const THINKING_MAX = 900;

function thinkingDelay(): number {
  return THINKING_MIN + Math.random() * (THINKING_MAX - THINKING_MIN);
}

// ---------------------------------------------------------------------------
// Bubble di un singolo messaggio
// ---------------------------------------------------------------------------
function MessageBubble({ msg, index }: { msg: ChatMessage; index: number }) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div
        className="gc-fade-up flex justify-end"
        style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
      >
        <div className="max-w-[82%] rounded-2xl rounded-br-md bg-gradient-to-br from-blue-500 to-violet-500 px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-lg shadow-blue-500/20">
          {msg.content}
        </div>
      </div>
    );
  }

  // Bubble assistant: avatar bot + contenuto markdown + chip sorgenti
  return (
    <div
      className="gc-fade-up flex items-start gap-2.5"
      style={{ animationDelay: `${Math.min(index, 6) * 30}ms` }}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-md shadow-violet-500/30"
      >
        <Bot className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="min-w-0 max-w-[88%] flex-1">
        <div className="gc-inset rounded-2xl rounded-tl-md px-3.5 py-2.5 text-slate-700 dark:text-slate-200">
          {renderMarkdown(msg.content)}
        </div>
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {msg.sources.map((s, i) => (
              <span
                key={i}
                className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                title={s}
              >
                <Sparkles className="h-2.5 w-2.5 flex-none text-blue-500" aria-hidden="true" />
                <span className="truncate">da: {s}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bubble "sta scrivendo…"
// ---------------------------------------------------------------------------
function TypingBubble() {
  return (
    <div className="gc-fade-up flex items-start gap-2.5" aria-label="L'assistente sta scrivendo">
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-md shadow-violet-500/30"
      >
        <Bot className="h-5 w-5" strokeWidth={2} />
      </span>
      <div className="gc-inset flex items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3.5 text-blue-500">
        <span className="gc-typing-dot" />
        <span className="gc-typing-dot" />
        <span className="gc-typing-dot" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pannello chat
// ---------------------------------------------------------------------------
export function ChatPanel(props: ChatPanelProps) {
  const { ctx, defaultOpen = false } = props;

  const [open, setOpen] = useState(defaultOpen);
  const [initialized, setInitialized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);

  // ctx può cambiare (le soglie cambiano): teniamo un ref sincronizzato e lo
  // usiamo al momento dell'invio, così le risposte usano i dati correnti.
  const ctxRef = useRef(ctx);
  useEffect(() => {
    ctxRef.current = ctx;
  }, [ctx]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const thinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aiReal = isChatAiEnabled();

  // Inizializza la conversazione al primo mount con il messaggio di benvenuto.
  // Lo stato non si resetta più, così la chat persiste chiudendo/riaprendo.
  useEffect(() => {
    if (initialized) return;
    const welcome = welcomeMessage(ctxRef.current);
    setMessages([{ ...welcome, timestamp: Date.now() }]);
    setInitialized(true);
  }, [initialized]);

  // Autoscroll in fondo quando arrivano messaggi o parte il typing.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, open]);

  // Focus sull'input all'apertura.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 320);
    return () => clearTimeout(t);
  }, [open]);

  // Escape chiude il pannello (e riporta il focus sul trigger).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Pulizia del timer in smontaggio.
  useEffect(() => {
    return () => {
      if (thinkTimer.current) clearTimeout(thinkTimer.current);
    };
  }, []);

  // Invio di una domanda: append user → typing → risposta.
  const send = (raw: string) => {
    const text = raw.trim();
    if (!text || thinking) return;

    const userMsg = makeMessage('user', text);
    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setThinking(true);

    const snapshotCtx = ctxRef.current; // dati correnti al momento dell'invio

    const delay = thinkingDelay();
    thinkTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await answer(text, snapshotCtx);
          const reply = makeMessage('assistant', res.content, { sources: res.sources });
          setMessages((prev) => [...prev, reply]);
        } catch {
          const reply = makeMessage(
            'assistant',
            'Si è verificato un problema nel recuperare la risposta. Riprova tra un istante.',
          );
          setMessages((prev) => [...prev, reply]);
        } finally {
          setThinking(false);
        }
      })();
    }, delay);
  };

  const onSubmit = () => send(draft);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <>
      {/* ---------------------------------------------------------------- */}
      {/* TRIGGER — pulsante floating in basso a destra                    */}
      {/* ---------------------------------------------------------------- */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Apri assistente AI"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={[
          'gc-pulse-glow group fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full',
          'bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-xl shadow-blue-500/30',
          'transition-transform duration-300 ease-out hover:scale-110 active:scale-95',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2',
          'dark:focus-visible:ring-offset-gc-night',
          open ? 'pointer-events-none scale-0 opacity-0' : 'scale-100 opacity-100',
        ].join(' ')}
      >
        <MessageCircle
          className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12"
          strokeWidth={2.2}
          aria-hidden="true"
        />
        {/* Badge "AI" */}
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex h-5 items-center justify-center rounded-full bg-white px-1.5 text-[9px] font-bold tracking-wide text-violet-600 shadow-md ring-2 ring-violet-500/40 dark:bg-slate-900 dark:text-violet-300"
        >
          AI
        </span>
      </button>

      {/* ---------------------------------------------------------------- */}
      {/* OVERLAY (solo mobile) — chiude al click                          */}
      {/* ---------------------------------------------------------------- */}
      <div
        aria-hidden="true"
        onClick={() => setOpen(false)}
        className={[
          'fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 sm:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      {/* ---------------------------------------------------------------- */}
      {/* PANNELLO — slide-in da destra. Sempre montato (chat persiste).   */}
      {/* ---------------------------------------------------------------- */}
      <aside
        role="dialog"
        aria-modal={open ? true : undefined}
        aria-label="Gate Co-Pilot AI — assistente documenti"
        aria-hidden={open ? undefined : true}
        className={[
          'gc-surface-strong fixed inset-y-0 right-0 z-50 flex w-full flex-col sm:w-[400px]',
          'border-l border-blue-500/30 shadow-2xl shadow-blue-500/10 dark:border-violet-500/30',
          'transition-transform duration-300 ease-out will-change-transform',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
        ].join(' ')}
      >
        {/* Riga gradient sul bordo sinistro (accento brand) */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-blue-500 via-violet-500 to-sky-400"
        />

        {/* HEADER ------------------------------------------------------- */}
        <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3.5 dark:border-white/10">
          <span className="gc-ring-rotate flex h-10 w-10 flex-none items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-white">
            <Bot className="h-5 w-5" strokeWidth={2.1} aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-bold text-slate-900 dark:text-white">
                Gate Co-Pilot AI
              </h2>
              <span
                className={[
                  'flex-none rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                  aiReal
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
                ].join(' ')}
                title={aiReal ? 'Risposte generate da AI reale' : 'Modalità dimostrativa (risposte locali)'}
              >
                {aiReal ? 'AI reale' : 'demo'}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="truncate">Assistente documenti</span>
              <span aria-hidden="true" className="text-slate-300 dark:text-white/20">
                •
              </span>
              <span className="flex items-center gap-1">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Online</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            aria-label="Chiudi assistente"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        {/* AREA MESSAGGI ------------------------------------------------ */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
          role="log"
          aria-live="polite"
          aria-label="Conversazione con l'assistente"
        >
          {messages.map((m, i) => (
            <MessageBubble key={m.id} msg={m} index={i} />
          ))}
          {thinking && <TypingBubble />}
        </div>

        {/* QUICK PROMPTS ------------------------------------------------ */}
        <div className="border-t border-slate-200 px-4 pt-3 dark:border-white/10">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Domande rapide
          </p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                disabled={thinking}
                onClick={() => send(p)}
                className="gc-hover-lift rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors duration-200 hover:border-blue-400 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-violet-400/60 dark:hover:text-violet-300"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* INPUT -------------------------------------------------------- */}
        <div className="px-4 pb-4 pt-3">
          <div className="gc-inset flex items-end gap-2 rounded-2xl p-1.5 transition-colors duration-200 focus-within:border-blue-400 dark:focus-within:border-violet-400/60">
            <label htmlFor="gc-chat-input" className="sr-only">
              Scrivi un messaggio all'assistente
            </label>
            <textarea
              id="gc-chat-input"
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Scrivi una domanda sul gate…"
              aria-label="Scrivi un messaggio all'assistente"
              className="max-h-28 min-h-[2.25rem] flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={onSubmit}
              disabled={!draft.trim() || thinking}
              aria-label="Invia messaggio"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-md shadow-blue-500/30 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100 dark:focus-visible:ring-offset-transparent"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-slate-400 dark:text-slate-500">
            <kbd className="font-mono">Invio</kbd> per inviare ·{' '}
            <kbd className="font-mono">Shift</kbd>+<kbd className="font-mono">Invio</kbd> per andare a capo
          </p>
        </div>
      </aside>
    </>
  );
}
