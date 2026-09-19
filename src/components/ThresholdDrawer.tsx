import { useEffect, useRef } from 'react';
import {
  X,
  SlidersHorizontal,
  RotateCcw,
  Activity,
  Gauge,
  Bell,
} from 'lucide-react';
import type { ThresholdConfig, ReadinessBand } from '../types';
import { fmtYears, fmtMeur, fmtPct, fmtEur, fmtInt } from '../lib/format';

export interface ThresholdDrawerProps {
  open: boolean;
  thresholds: ThresholdConfig;
  onChange: (next: ThresholdConfig) => void;
  onClose: () => void;
  /**
   * Calcolo opzionale del preview in tempo reale: dato un set di soglie,
   * ritorna gli avvisi risultanti e la Gate Readiness con la sua banda.
   * Se non passato, il mini-pannello di preview viene semplicemente omesso.
   */
  computePreview?: (t: ThresholdConfig) => {
    alertCount: number;
    readiness: number;
    band: ReadinessBand;
  };
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  paybackMaxYears: 2.5,
  npvMinMeur: 1.5,
  reconciliationToleranceEUR: 0.01,
  thresholdBreachCriticalPct: 0.25,
};

// Semantica colore banda (coerente con l'engine): verde=emerald, ambra=amber,
// rosso=rose. Stili per il mini-pannello di preview, leggibili in dark e light.
const BAND_PREVIEW: Record<
  ReadinessBand,
  {
    label: string;
    text: string;
    chipBg: string;
    chipText: string;
    dot: string;
    bar: string;
    glow: string;
  }
> = {
  green: {
    label: 'Pronto per il gate',
    text: 'text-emerald-600 dark:text-emerald-300',
    chipBg: 'bg-emerald-50 dark:bg-emerald-500/10',
    chipText: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    bar: 'from-emerald-400 to-emerald-500',
    glow: 'gc-glow-emerald',
  },
  amber: {
    label: 'Da integrare',
    text: 'text-amber-600 dark:text-amber-300',
    chipBg: 'bg-amber-50 dark:bg-amber-500/10',
    chipText: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    bar: 'from-amber-400 to-amber-500',
    glow: 'gc-glow-amber',
  },
  red: {
    label: 'Non pronto',
    text: 'text-rose-600 dark:text-rose-300',
    chipBg: 'bg-rose-50 dark:bg-rose-500/10',
    chipText: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    bar: 'from-rose-400 to-rose-500',
    glow: 'gc-glow-rose',
  },
};

// Una riga di controllo: etichetta + valore corrente formattato,
// con slider PREMIUM (.gc-range) e input numerico sincronizzati sullo stesso campo.
interface ControlRowProps {
  id: string;
  label: string;
  hint: string;
  display: string;
  value: number;
  min: number;
  max: number;
  step: number;
  ariaValueText: string;
  onValueChange: (n: number) => void;
  autoFocus?: boolean;
  delay?: number;
}

function ControlRow({
  id,
  label,
  hint,
  display,
  value,
  min,
  max,
  step,
  ariaValueText,
  onValueChange,
  autoFocus,
  delay = 0,
}: ControlRowProps) {
  const clamp = (n: number) => {
    if (Number.isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  };

  // Percentuale di riempimento del track (per il fill gradient sotto il thumb).
  const pct =
    max > min ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100)) : 0;

  return (
    <div
      className="gc-fade-up rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all duration-300 hover:border-blue-300/70 hover:bg-white dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-400/30 dark:hover:bg-white/[0.05]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}
        </label>
        <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-50">
          {display}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          {/* Binario di fondo + riempimento progressivo (solo transform/opacity-safe:
              il fill usa width statico legato al valore, non animato in transizione). */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <input
            id={id}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            autoFocus={autoFocus}
            onChange={(e) => onValueChange(clamp(Number(e.target.value)))}
            aria-label={label}
            aria-valuetext={ariaValueText}
            className="gc-range relative z-10 w-full"
            style={{ background: 'transparent' }}
          />
        </div>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onValueChange(clamp(Number(e.target.value)))}
          aria-label={`${label}, valore numerico`}
          className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-right font-mono text-sm font-semibold tabular-nums text-slate-900 outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 dark:border-white/15 dark:bg-white/5 dark:text-slate-50 dark:focus:border-blue-400 dark:focus:ring-blue-400/30"
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
          min {min}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</span>
        <span className="font-mono text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
          max {max}
        </span>
      </div>
    </div>
  );
}

// Mini-pannello di preview in tempo reale: avvisi risultanti + Gate Readiness.
interface LivePreviewProps {
  alertCount: number;
  readiness: number;
  band: ReadinessBand;
}

function LivePreview({ alertCount, readiness, band }: LivePreviewProps) {
  const meta = BAND_PREVIEW[band];
  const clampedReadiness = Math.max(0, Math.min(100, readiness));

  return (
    <div
      className="gc-inset overflow-hidden rounded-xl p-4"
      role="status"
      aria-live="polite"
      aria-label={`Anteprima: ${fmtInt(alertCount)} avvisi, Gate Readiness ${Math.round(
        clampedReadiness,
      )} percento, ${meta.label}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <Activity
          className="h-4 w-4 text-blue-500 dark:text-blue-400"
          aria-hidden="true"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Anteprima in tempo reale
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Avvisi risultanti */}
        <div className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            Avvisi
          </div>
          <div
            key={alertCount}
            className="gc-pop-in font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-50"
          >
            {fmtInt(alertCount)}
          </div>
        </div>

        {/* Gate Readiness risultante */}
        <div className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Gauge className="h-3.5 w-3.5" aria-hidden="true" />
            Gate Readiness
          </div>
          <div className="flex items-baseline gap-1">
            <span
              key={Math.round(clampedReadiness)}
              className={`gc-pop-in font-mono text-2xl font-bold tabular-nums ${meta.text}`}
            >
              {Math.round(clampedReadiness)}
            </span>
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">
              /100
            </span>
          </div>
        </div>
      </div>

      {/* Barra readiness + banda */}
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className={`h-full origin-left rounded-full bg-gradient-to-r ${meta.bar} transition-transform duration-500 ease-out`}
            style={{
              width: '100%',
              transform: `scaleX(${clampedReadiness / 100})`,
            }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-end">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chipBg} ${meta.chipText}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
              aria-hidden="true"
            />
            {meta.label}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ThresholdDrawer(props: ThresholdDrawerProps) {
  const { open, thresholds, onChange, onClose, computePreview } = props;
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC chiude il drawer quando è aperto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const set = (patch: Partial<ThresholdConfig>) => {
    onChange({ ...thresholds, ...patch });
  };

  const isDefault =
    thresholds.paybackMaxYears === DEFAULT_THRESHOLDS.paybackMaxYears &&
    thresholds.npvMinMeur === DEFAULT_THRESHOLDS.npvMinMeur &&
    thresholds.reconciliationToleranceEUR ===
      DEFAULT_THRESHOLDS.reconciliationToleranceEUR &&
    thresholds.thresholdBreachCriticalPct ===
      DEFAULT_THRESHOLDS.thresholdBreachCriticalPct;

  // Preview calcolato live sui valori correnti (se la prop è fornita).
  const preview = computePreview ? computePreview(thresholds) : null;

  return (
    <>
      {/* Overlay scuro: chiude al click */}
      <div
        className={[
          'fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 dark:bg-black/60',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Pannello laterale destro */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Configura criteri e soglie"
        className={[
          'gc-surface-strong fixed inset-y-0 right-0 z-40 flex w-[400px] max-w-full flex-col shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full',
        ].join(' ')}
      >
        {/* Intestazione */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20">
              <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Configura criteri e soglie
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Le soglie guidano avvisi e severità.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Preview in tempo reale (in cima, se disponibile) */}
        {preview && (
          <div className="border-b border-slate-200 px-5 pb-4 pt-4 dark:border-white/10">
            <LivePreview
              alertCount={preview.alertCount}
              readiness={preview.readiness}
              band={preview.band}
            />
          </div>
        )}

        {/* Controlli */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <ControlRow
            id="th-payback"
            label="Payback massimo (anni)"
            hint="oltre → avviso"
            display={fmtYears(thresholds.paybackMaxYears)}
            value={thresholds.paybackMaxYears}
            min={1.5}
            max={4.0}
            step={0.1}
            ariaValueText={fmtYears(thresholds.paybackMaxYears)}
            onValueChange={(n) => set({ paybackMaxYears: n })}
            autoFocus={open}
            delay={0}
          />

          <ControlRow
            id="th-npv"
            label="NPV minimo (M€)"
            hint="sotto → avviso"
            display={fmtMeur(thresholds.npvMinMeur)}
            value={thresholds.npvMinMeur}
            min={0}
            max={4}
            step={0.1}
            ariaValueText={fmtMeur(thresholds.npvMinMeur)}
            onValueChange={(n) => set({ npvMinMeur: n })}
            delay={40}
          />

          <ControlRow
            id="th-breach"
            label="Soglia breach critico (%)"
            hint="oltre → Critica"
            display={fmtPct(thresholds.thresholdBreachCriticalPct)}
            value={thresholds.thresholdBreachCriticalPct}
            min={0.05}
            max={0.6}
            step={0.05}
            ariaValueText={fmtPct(thresholds.thresholdBreachCriticalPct)}
            onValueChange={(n) => set({ thresholdBreachCriticalPct: n })}
            delay={80}
          />

          <ControlRow
            id="th-recon"
            label="Tolleranza riconciliazione (€)"
            hint="entro → ok"
            display={fmtEur(thresholds.reconciliationToleranceEUR)}
            value={thresholds.reconciliationToleranceEUR}
            min={0}
            max={1}
            step={0.01}
            ariaValueText={fmtEur(thresholds.reconciliationToleranceEUR)}
            onValueChange={(n) => set({ reconciliationToleranceEUR: n })}
            delay={120}
          />
        </div>

        {/* Nota + ripristino */}
        <div className="border-t border-slate-200 px-5 py-4 dark:border-white/10">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Le modifiche ricalcolano avvisi e Gate Readiness in tempo reale.
          </p>
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_THRESHOLDS })}
            disabled={isDefault}
            aria-label="Ripristina i valori di default"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:bg-white dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/25 dark:hover:bg-white/10 dark:disabled:hover:border-white/15 dark:disabled:hover:bg-white/5"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Ripristina default
          </button>
        </div>
      </div>
    </>
  );
}
