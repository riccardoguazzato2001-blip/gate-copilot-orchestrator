// ============================================================================
// Gate Co-Pilot — Tipi del dominio
// Modello dati per la governance dei decision gate GEWISS.
// L'agente assiste il Project Manager: ingerisce i deliverable di un gate,
// li verifica contro i criteri di accettazione (reference pack GEWISS) e
// instrada gli avvisi secondo ruolo RACI e severità.
// ============================================================================

// --- RACI ------------------------------------------------------------------
export type RaciRole = 'PM' | 'Product' | 'RnD' | 'Finance' | 'Lab' | 'Quality';

export const RACI_ORDER: RaciRole[] = [
  'PM',
  'Product',
  'RnD',
  'Finance',
  'Lab',
  'Quality',
];

export const RACI_LABEL: Record<RaciRole, string> = {
  PM: 'Project Manager',
  Product: 'Product Manager',
  RnD: 'R&D',
  Finance: 'Finance',
  Lab: 'Laboratory',
  Quality: 'Quality',
};

export type RaciLetter = 'A' | 'R' | 'C' | 'I';

// Colori RACI dal pack: A=red-600, R=amber-500, C=blue-500, I=slate-400.
// REGOLA UX: mostrare SEMPRE la lettera, mai affidarsi al solo colore.
export const RACI_LETTER_LABEL: Record<RaciLetter, string> = {
  A: 'Accountable',
  R: 'Responsible',
  C: 'Consulted',
  I: 'Informed',
};

// --- Check & findings ------------------------------------------------------
export type CheckType =
  | 'Presence'
  | 'Conformance'
  | 'Threshold'
  | 'Reconciliation';

export const CHECK_ORDER: CheckType[] = [
  'Presence',
  'Conformance',
  'Threshold',
  'Reconciliation',
];

export const CHECK_LABEL: Record<CheckType, string> = {
  Presence: 'Presenza',
  Conformance: 'Conformità',
  Threshold: 'Soglie',
  Reconciliation: 'Riconciliazione',
};

export type FindingStatus = 'pass' | 'warn' | 'fail';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Info';

export const SEVERITY_LABEL: Record<Severity, string> = {
  Critical: 'Critica',
  High: 'Alta',
  Medium: 'Media',
  Info: 'Info',
};

// --- Deliverable -----------------------------------------------------------
export interface DeliverableField {
  key: string; // es. 'paybackYears'
  label: string; // es. 'Payback'
  value: number | string | null;
  unit?: string; // es. 'anni', 'M€', '%'
  source?: string | null; // provenienza del dato (criterio: "states the source")
}

export interface RiskItem {
  id: string; // es. 'R2'
  name: string;
  category: 'Tecnico' | 'Mercato' | 'Normativo' | 'Fornitura';
  owner: string | null;
  dueDate: string | null; // ISO o null se mancante
  residual: 'Basso' | 'Medio' | 'Alto' | null;
}

export interface Deliverable {
  id: string; // es. 'G1.12'
  name: string; // es. 'Business Case based on Targets'
  gate: 'G0' | 'G1' | 'G2';
  revision: string; // es. 'Rev 1'
  raci: Record<RaciRole, RaciLetter>;
  fields: DeliverableField[];
  risks?: RiskItem[]; // solo per il Risk & Mitigation Plan
}

// --- Findings & alert ------------------------------------------------------
export interface Finding {
  id: string;
  deliverableId: string;
  type: CheckType;
  status: FindingStatus;
  message: string; // descrizione dell'anomalia, in italiano
  criterionRef: string; // criterio "accept only if…" violato (parafrasato dal pack)
  observed?: string; // es. '2.7 anni'
  expected?: string; // es. '≤ 2.5 anni'
  recommendedAction?: string;
  breachPct?: number; // per i Threshold: di quanto si supera la soglia (0.08 = +8%)
}

export type NotificationChannel = 'direct' | 'dashboard' | 'digest';

export const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  direct: 'Diretto',
  dashboard: 'Dashboard',
  digest: 'Digest',
};

export interface RoleNotification {
  role: RaciRole;
  letter: RaciLetter;
  channel: NotificationChannel;
  message: string;
  blocking: boolean; // l'Accountable deve dare acknowledgement
}

export interface Alert {
  id: string;
  finding: Finding;
  severity: Severity;
  importance: 1 | 2 | 3 | 4; // 4 = blocca la gate readiness
  blocksGate: boolean; // importance >= 3
  notifiedRoles: RoleNotification[];
  recommendedAction: string;
}

// --- Configurazione soglie -------------------------------------------------
export interface ThresholdConfig {
  paybackMaxYears: number; // default 2.5
  npvMinMeur: number; // default 1.5
  reconciliationToleranceEUR: number; // default 0.01
  thresholdBreachCriticalPct: number; // default 0.25 (oltre +25% → Critical)
}

// --- Baseline di progetto (G0 Business Case Rev 0) -------------------------
export interface ProjectBaseline {
  investmentMeur: number;
  paybackYears: number;
  npvMeur: number;
  irr: number;
  grossMargin5yMeur: number;
  discountRate: number;
  horizonYears: number;
}

export interface Project {
  name: string;
  description: string;
  currentGate: 'G0' | 'G1' | 'G2';
  baseline: ProjectBaseline;
}

// --- Output del motore -----------------------------------------------------
export type ReadinessBand = 'green' | 'amber' | 'red';

export interface ReconciliationLink {
  id: string;
  label: string; // es. 'Costo unitario BOM'
  fromId: string; // deliverable sorgente (verità)
  fromLabel: string;
  toId: string; // deliverable che usa il dato
  toLabel: string;
  fromValue: string;
  toValue: string;
  ok: boolean;
}

export interface EngineResult {
  findings: Finding[];
  alerts: Alert[];
  reconciliation: ReconciliationLink[];
  gateReadiness: number; // 0..100
  band: ReadinessBand;
  counts: Record<Severity, number>;
  // mappa (deliverableId -> CheckType -> stato peggiore) per i mini-indicatori
  matrix: Record<string, Partial<Record<CheckType, FindingStatus>>>;
}

// --- Ciclo di vita dei gate (timeline/stepper visivo) ----------------------
export type GateStatus = 'passed' | 'active' | 'upcoming';

export interface GateMilestone {
  label: string;
  done: boolean; // ✓ completata vs ○ in corso/da fare
}

export interface GateInfo {
  id: 'G0' | 'G1' | 'G2';
  name: string; // es. 'Gate 0 — Idea Screening'
  shortName: string; // es. 'Idea Screening'
  status: GateStatus;
  completedDate?: string; // es. '10 marzo 2026'
  readiness?: number; // 0-100 (per gate passati = score finale; per attivo = calcolato dall'engine)
  deliverableCount: number;
  passedChecks?: number;
  totalChecks?: number;
  keyMilestones: GateMilestone[];
}
