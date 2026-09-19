// ============================================================================
// Gate Co-Pilot — Seed in memoria (dati mock)
// Caso: "New Energy Metering" — contatore di energia connesso su guida DIN
// (MID + lettura remota). Numeri dal materiale GEWISS, internamente coerenti.
//
// Le RACI di Business Case (G1.12/G1.13) e Risk Plan (G1.7) sono prese dal
// reference pack ufficiale (gate_templates.json). Le RACI di G1.3 e G1.10 sono
// placeholder ragionevoli (vedi README).
//
// DIFETTO SEMINATO DI PROPOSITO: in G1.13 il costo BOM usato è 34,50 € mentre la
// verità tecnica in G1.3 è 36,80 € → genera un'anomalia di riconciliazione Critica.
// ============================================================================

import type {
  Deliverable,
  GateInfo,
  Project,
  RaciLetter,
  RaciRole,
  ThresholdConfig,
} from '../types';

// helper per scrivere la RACI in modo posizionale (PM·Product·R&D·Finance·Lab·Quality)
function raci(
  pm: RaciLetter,
  product: RaciLetter,
  rnd: RaciLetter,
  finance: RaciLetter,
  lab: RaciLetter,
  quality: RaciLetter,
): Record<RaciRole, RaciLetter> {
  return { PM: pm, Product: product, RnD: rnd, Finance: finance, Lab: lab, Quality: quality };
}

export const PROJECT: Project = {
  name: 'New Energy Metering',
  description: 'Contatore di energia connesso su guida DIN (MID + lettura remota)',
  currentGate: 'G1',
  baseline: {
    // G0 Business Case Rev 0 — riferimento di progetto
    investmentMeur: 1.85,
    paybackYears: 2.4,
    npvMeur: 2.1,
    irr: 0.31,
    grossMargin5yMeur: 6.2,
    discountRate: 0.1,
    horizonYears: 5,
  },
};

export const SIMULATED_DATE = '18 giugno 2026';

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  paybackMaxYears: 2.5,
  npvMinMeur: 1.5,
  reconciliationToleranceEUR: 0.01,
  thresholdBreachCriticalPct: 0.25,
};

// --- Deliverable G1 --------------------------------------------------------
export const DELIVERABLES: Deliverable[] = [
  {
    id: 'G1.12',
    name: 'Business Case based on Targets',
    gate: 'G1',
    revision: 'Rev 1',
    // dal pack: business_case_targets_g1 → C·A·I·R·I·I
    raci: raci('C', 'A', 'I', 'R', 'I', 'I'),
    fields: [
      { key: 'label', label: 'Tipo caso', value: 'target' },
      { key: 'investmentMeur', label: 'Investimento', value: 1.85, unit: 'M€', source: 'Business Requirements Rev 1' },
      { key: 'paybackYears', label: 'Payback', value: 2.4, unit: 'anni', source: 'Business Requirements Rev 1' },
      { key: 'npvMeur', label: 'NPV', value: 2.1, unit: 'M€', source: 'Business Requirements Rev 1' },
      { key: 'irr', label: 'IRR', value: 0.31, unit: '%', source: 'Business Requirements Rev 1' },
      { key: 'discountRate', label: 'Tasso di sconto', value: 0.1, unit: '%', source: 'Policy GEWISS' },
      { key: 'horizonYears', label: 'Orizzonte', value: 5, unit: 'anni', source: 'Policy GEWISS' },
    ],
  },
  {
    id: 'G1.13',
    name: 'Business Case based on Estimation',
    gate: 'G1',
    revision: 'Rev 1',
    // dal pack: business_case_estimation_g1 → C·A·I·R·I·I
    raci: raci('C', 'A', 'I', 'R', 'I', 'I'),
    fields: [
      { key: 'label', label: 'Tipo caso', value: 'estimation' },
      { key: 'investmentMeur', label: 'Investimento', value: 1.9, unit: 'M€', source: 'Detailed Plan G1→G2' },
      { key: 'paybackYears', label: 'Payback', value: 2.7, unit: 'anni', source: 'Costo POC' }, // > 2.5 → sforamento soglia
      { key: 'npvMeur', label: 'NPV', value: 1.6, unit: 'M€', source: 'Costo POC' },
      { key: 'irr', label: 'IRR', value: 0.26, unit: '%', source: 'Costo POC' },
      { key: 'discountRate', label: 'Tasso di sconto', value: 0.1, unit: '%', source: 'Policy GEWISS' },
      { key: 'horizonYears', label: 'Orizzonte', value: 5, unit: 'anni', source: 'Policy GEWISS' },
      // costo BOM usato nel caso stima — DIFETTO: 34,50 ≠ 36,80 (verità tecnica G1.3)
      { key: 'bomUnitCostUsed', label: 'Costo BOM usato', value: 34.5, unit: '€', source: 'Stima preliminare' },
      { key: 'volumesY1', label: 'Volumi anno 1', value: 50000, unit: 'u' },
      { key: 'volumesYn', label: 'Volumi a regime', value: 130000, unit: 'u' },
      // DIFETTO: fonte delle assunzioni mancante
      { key: 'assumptionsSource', label: 'Fonte assunzioni', value: null, source: null },
    ],
  },
  {
    id: 'G1.3',
    name: 'Technical info about POC & BOM',
    gate: 'G1',
    revision: 'Rev 1',
    // placeholder ragionevole (non dal pack)
    raci: raci('A', 'C', 'R', 'I', 'C', 'C'),
    fields: [
      // fonte di verità per la riconciliazione del costo BOM
      { key: 'bomUnitCost', label: 'Costo unitario BOM', value: 36.8, unit: '€', source: 'Roll-up BOM POC' },
      { key: 'pocStatus', label: 'Stato POC', value: 'Funzionante', source: 'Lab interno' },
      { key: 'singleSourceFlag', label: 'Componente single-source', value: 'Metering IC' },
    ],
  },
  {
    id: 'G1.10',
    name: 'Detailed Plan G1→G2 (Capex/Opex)',
    gate: 'G1',
    revision: 'Rev 1',
    // placeholder ragionevole (non dal pack)
    raci: raci('A', 'C', 'C', 'R', 'I', 'I'),
    fields: [
      // riconcilia con G1.13.investmentMeur (1.9 == 1.9 → pass)
      { key: 'totalInvestmentMeur', label: 'Investimento totale', value: 1.9, unit: 'M€', source: 'Preventivi fornitori' },
      { key: 'capexMeur', label: 'Capex', value: 1.1, unit: 'M€', source: 'Preventivi fornitori' },
      { key: 'opexMeur', label: 'Opex', value: 0.8, unit: 'M€', source: 'Stima interna' },
      { key: 'launchLabel', label: 'Lancio previsto', value: 'Q3 2027', source: 'Schedule G1→G2' },
    ],
  },
  {
    id: 'G1.7',
    name: 'Risk & Mitigation Plan',
    gate: 'G1',
    revision: 'Rev 1',
    // dal pack: risk_mitigation_g1 → A·C·R·C·I·C
    raci: raci('A', 'C', 'R', 'C', 'I', 'C'),
    fields: [{ key: 'riskCount', label: 'Rischi mappati', value: 3, unit: '' }],
    risks: [
      {
        id: 'R1',
        name: 'Roll-up BOM oltre il costo target',
        category: 'Tecnico',
        owner: 'R&D',
        dueDate: '2026-09-15',
        residual: 'Medio',
      },
      {
        // DIFETTO: mitigazione senza due date
        id: 'R2',
        name: 'Iter di certificazione MID non pianificato',
        category: 'Normativo',
        owner: 'Laboratory',
        dueDate: null,
        residual: 'Alto',
      },
      {
        id: 'R3',
        name: 'Metering IC single-source',
        category: 'Fornitura',
        owner: 'R&D',
        dueDate: '2026-10-30',
        residual: 'Medio',
      },
    ],
  },
];

// --- Ciclo di vita dei gate (per la timeline/stepper visivo) ---------------
// G0 superato (idea/concept), G1 attivo (feasibility, il caso demo), G2 futuro.
// Il `readiness` di G1 è lasciato a undefined: lo calcola l'engine in tempo reale.
export const GATE_TIMELINE: GateInfo[] = [
  {
    id: 'G0',
    name: 'Gate 0 — Concept',
    shortName: 'Concept',
    status: 'passed',
    completedDate: '10 marzo 2026',
    readiness: 92,
    deliverableCount: 4,
    passedChecks: 11,
    totalChecks: 12,
    keyMilestones: [
      { label: 'Business Case Rev 0 approvato', done: true },
      { label: 'Market assessment completato', done: true },
      { label: 'Sponsor confermato', done: true },
    ],
  },
  {
    id: 'G1',
    name: 'Gate 1 — Feasibility',
    shortName: 'Feasibility',
    status: 'active',
    readiness: undefined, // calcolato dall'engine (gateReadiness)
    deliverableCount: 5,
    keyMilestones: [
      { label: 'Business Case Target vs Estimation', done: true },
      { label: 'POC & BOM validati', done: true },
      { label: 'Risk Plan completo', done: false },
      { label: 'Riconciliazione cross-deliverable', done: false },
    ],
  },
  {
    id: 'G2',
    name: 'Gate 2 — Planning',
    shortName: 'Planning',
    status: 'upcoming',
    deliverableCount: 8,
    keyMilestones: [
      { label: 'Requisiti Rev 2 (low level)', done: false },
      { label: 'WBS & baseline', done: false },
      { label: 'Business Case Rev 2 commitment-grade', done: false },
    ],
  },
];
