// ============================================================================
// Gate Co-Pilot v2 — App (orchestrazione + layout premium)
// Single-page PM dashboard. Stato in memoria. "Scansiona cartella di rete"
// simula l'ingestione del seed con messaggi dinamici e popola la dashboard con
// uno stagger d'ingresso. Dark mode di default. Chatbot AI integrato.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FolderSearch, Loader2, Moon, ScanLine, ShieldCheck, Sun } from 'lucide-react';

import { Header } from './components/Header';
import { GateTimeline } from './components/GateTimeline';
import { KpiRow } from './components/KpiRow';
import { DeliverableTable } from './components/DeliverableTable';
import { AlertCenter } from './components/AlertCenter';
import { AlertsPopup } from './components/AlertsPopup';
import { ReconciliationView } from './components/ReconciliationView';
import { BusinessCaseDeepDive } from './components/BusinessCaseDeepDive';
import { ThresholdDrawer } from './components/ThresholdDrawer';
import { ChatPanel } from './components/ChatPanel';

import { useEngine, computeEngine } from './hooks/useEngine';
import { useTheme } from './hooks/useTheme';
import {
  DELIVERABLES,
  DEFAULT_THRESHOLDS,
  PROJECT,
  SIMULATED_DATE,
  GATE_TIMELINE,
} from './data/seed';
import type { Deliverable, GateInfo, ThresholdConfig } from './types';
import type { ChatContext } from './engine/chatbot';

const GATE_NAME = 'Feasibility — Requisiti & Fattibilità';

// helper: legge un valore numerico da un deliverable
function getNum(d: Deliverable | undefined, key: string): number {
  const v = d?.fields.find((f) => f.key === key)?.value;
  return typeof v === 'number' ? v : 0;
}

const TARGET = DELIVERABLES.find((d) => d.id === 'G1.12')!;
const ESTIMATION = DELIVERABLES.find((d) => d.id === 'G1.13')!;

const LOADING_STEPS = [
  'Accesso alla cartella di rete…',
  'Analisi del Business Case (target vs stima)…',
  'Controllo della riconciliazione cross-deliverable…',
  'Instradamento RACI e generazione report…',
];

export default function App() {
  const [thresholds, setThresholds] = useState<ThresholdConfig>(DEFAULT_THRESHOLDS);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);

  const { isDark, toggle: toggleTheme } = useTheme();
  const engine = useEngine(DELIVERABLES, thresholds, PROJECT.baseline);

  const currentPayback = getNum(ESTIMATION, 'paybackYears');
  const currentNpv = getNum(ESTIMATION, 'npvMeur');

  // `selectedAlertId` indica quale avviso aprire espanso nel Centro Avvisi
  // (finestra a comparsa). Se l'id diventa stale (cambio soglie), il popup
  // ricade in sicurezza sul primo avviso disponibile.

  // Onda visiva (ripple) quando si cambiano le soglie (salta il primo render)
  const firstThresholdRender = useRef(true);
  useEffect(() => {
    if (firstThresholdRender.current) {
      firstThresholdRender.current = false;
      return;
    }
    setRippleKey((k) => k + 1);
  }, [thresholds]);

  // Gate timeline con il gate attivo (G1) popolato dai dati live dell'engine
  const gatesLive: GateInfo[] = useMemo(() => {
    const total = engine.findings.length;
    const passed = engine.findings.filter((f) => f.status === 'pass').length;
    return GATE_TIMELINE.map((g) =>
      g.status === 'active'
        ? { ...g, readiness: engine.gateReadiness, passedChecks: passed, totalChecks: total }
        : g,
    );
  }, [engine.findings, engine.gateReadiness]);

  // Contesto per il chatbot (si aggiorna quando cambiano soglie/engine)
  const chatCtx: ChatContext = useMemo(
    () => ({
      project: PROJECT,
      gate: PROJECT.currentGate,
      gateName: `Gate ${PROJECT.currentGate} — ${GATE_NAME}`,
      simulatedDate: SIMULATED_DATE,
      engine,
      deliverables: DELIVERABLES,
      thresholds,
      gates: gatesLive,
    }),
    [engine, thresholds, gatesLive],
  );

  // Preview in tempo reale per il drawer delle soglie
  const computePreview = useCallback((t: ThresholdConfig) => {
    const r = computeEngine(DELIVERABLES, t, PROJECT.baseline);
    return { alertCount: r.alerts.length, readiness: r.gateReadiness, band: r.band };
  }, []);

  function handleScan() {
    setLoading(true);
    setLoadStep(0);
    let step = 0;
    const iv = window.setInterval(() => {
      step += 1;
      if (step < LOADING_STEPS.length) setLoadStep(step);
    }, 430);
    window.setTimeout(() => {
      window.clearInterval(iv);
      setLoadStep(LOADING_STEPS.length - 1);
      setLoading(false);
      setScanned(true);
      setSelectedAlertId(engine.alerts[0]?.id ?? null);
    }, 1900);
  }

  // ---- Stato iniziale: prima della scansione --------------------------------
  if (!scanned) {
    return (
      <div className="gc-app-bg gc-grid-pattern min-h-screen">
        <TopBar isDark={isDark} onToggleTheme={toggleTheme} />
        <main className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center sm:py-28">
          <div className="gc-float relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-lg gc-glow-blue">
            <FolderSearch size={34} aria-hidden />
          </div>
          <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-5xl">
            <span className="gc-gradient-text">{PROJECT.name}</span>
          </h1>
          <p className="mt-3 max-w-xl text-slate-600 dark:text-slate-300">{PROJECT.description}</p>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            L'agente di governance ingerisce i deliverable del gate{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {PROJECT.currentGate}
            </span>{' '}
            dalla cartella di rete, li verifica contro i criteri di accettazione GEWISS e instrada
            gli avvisi secondo ruolo RACI e severità.
          </p>
          <button
            type="button"
            onClick={handleScan}
            disabled={loading}
            aria-label="Scansiona cartella di rete"
            className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-110 disabled:opacity-60 gc-glow-blue"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} aria-hidden />
                Scansione in corso…
              </>
            ) : (
              <>
                <ScanLine size={18} aria-hidden />
                Scansiona cartella di rete
              </>
            )}
          </button>

          {loading && (
            <div className="mt-12 w-full gc-fade-in">
              <ScanProgress step={loadStep} />
              <div className="mt-6">
                <ScanSkeleton />
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ---- Dashboard popolata ---------------------------------------------------
  return (
    <div className="gc-app-bg gc-grid-pattern min-h-screen">
      {/* Onda visiva al cambio soglie */}
      {rippleKey > 0 && (
        <span
          key={rippleKey}
          aria-hidden
          className="gc-ripple"
          style={{ position: 'fixed', top: '72px', right: '48px', width: '72px', height: '72px', zIndex: 60 }}
        />
      )}

      <div className="mx-auto max-w-[1480px] px-4 pt-4 sm:px-6">
        <div className="gc-fade-up">
          <Header
            projectName={PROJECT.name}
            description={PROJECT.description}
            gate={PROJECT.currentGate}
            gateName={GATE_NAME}
            simulatedDate={SIMULATED_DATE}
            readiness={engine.gateReadiness}
            band={engine.band}
            isDark={isDark}
            onToggleTheme={toggleTheme}
            onOpenThresholds={() => setDrawerOpen(true)}
          />
        </div>
      </div>

      <main className="mx-auto max-w-[1480px] space-y-6 px-4 py-6 sm:px-6">
        <div className="gc-fade-up" style={{ animationDelay: '120ms' }}>
          <GateTimeline gates={gatesLive} band={engine.band} />
        </div>

        <div className="gc-fade-up" style={{ animationDelay: '220ms' }}>
          <KpiRow
            deliverableCount={DELIVERABLES.length}
            counts={engine.counts}
            reconciliation={engine.reconciliation}
            baseline={PROJECT.baseline}
            currentPayback={currentPayback}
            currentNpv={currentNpv}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="gc-fade-up" style={{ animationDelay: '360ms' }}>
              <DeliverableTable
                deliverables={DELIVERABLES}
                matrix={engine.matrix}
                selectedId={selectedDeliverableId}
                onSelect={(id) => setSelectedDeliverableId((prev) => (prev === id ? null : id))}
              />
            </div>
            <div className="gc-fade-up" style={{ animationDelay: '460ms' }}>
              <BusinessCaseDeepDive
                target={TARGET}
                estimation={ESTIMATION}
                baseline={PROJECT.baseline}
                thresholds={thresholds}
                alerts={engine.alerts}
              />
            </div>
            <div className="gc-fade-up" style={{ animationDelay: '560ms' }}>
              <ReconciliationView links={engine.reconciliation} />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div
              className="gc-fade-right lg:sticky lg:top-24"
              style={{ animationDelay: '420ms' }}
            >
              <AlertCenter
                alerts={engine.alerts}
                deliverables={DELIVERABLES}
                onOpen={(id) => {
                  if (id) setSelectedAlertId(id);
                  setAlertsOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      </main>

      <ThresholdDrawer
        open={drawerOpen}
        thresholds={thresholds}
        onChange={setThresholds}
        onClose={() => setDrawerOpen(false)}
        computePreview={computePreview}
      />

      <AlertsPopup
        open={alertsOpen}
        onClose={() => setAlertsOpen(false)}
        alerts={engine.alerts}
        deliverables={DELIVERABLES}
        initialAlertId={selectedAlertId ?? engine.alerts[0]?.id ?? null}
      />

      <ChatPanel ctx={chatCtx} />
    </div>
  );
}

// --- Barra superiore minimale (stato pre-scansione) ------------------------
function TopBar({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  return (
    <header className="border-b border-slate-200/70 dark:border-white/10">
      <div className="mx-auto flex max-w-[1480px] items-center gap-2 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white">
          <ShieldCheck size={18} aria-hidden />
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-white">Gate Co-Pilot</span>
        <span className="hidden text-sm text-slate-400 sm:inline dark:text-slate-500">
          · Gate governance assistita · GEWISS
        </span>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Attiva tema chiaro' : 'Attiva tema scuro'}
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          {isDark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
        </button>
      </div>
    </header>
  );
}

// --- Progress bar + messaggi dinamici durante lo scan ----------------------
function ScanProgress({ step }: { step: number }) {
  const pct = Math.round(((step + 1) / LOADING_STEPS.length) * 100);
  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600 dark:text-slate-300">{LOADING_STEPS[step]}</span>
        <span className="font-mono tabular-nums text-slate-400">{pct}%</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// --- Skeleton di caricamento (simula l'ingestione) -------------------------
function ScanSkeleton() {
  return (
    <div className="space-y-4">
      <div className="gc-skeleton h-20 w-full" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="gc-skeleton h-24 w-full" />
        ))}
      </div>
      <div className="gc-skeleton h-64 w-full" />
    </div>
  );
}
