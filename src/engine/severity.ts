// ============================================================================
// Gate Co-Pilot — SEVERITÀ & GATE READINESS
//
// Mappa ogni finding (non-pass) a una severità + importanza, e calcola il
// punteggio aggregato di Gate Readiness.
//
//   Riconciliazione fallita ............... Critical · 4 (blocca)
//   Sforamento soglia oltre +25% .......... Critical · 4 (blocca)
//   Sforamento soglia entro +25% .......... High     · 3 (blocca)
//   Campo obbligatorio mancante ........... High     · 3 (blocca)
//   Fonte/assunzione/conformità soft ...... Medium   · 2 (avvisa)
//   Nota informativa/stilistica ........... Info     · 1
//
//   Gate Readiness = clamp(100 − 30·#Critical − 15·#High − 5·#Medium, 0, 100)
//   Bande: ≥85 verde · 60–84 ambra · <60 rosso
// ============================================================================

import type {
  Finding,
  ReadinessBand,
  Severity,
} from '../types';

export interface Classification {
  severity: Severity;
  importance: 1 | 2 | 3 | 4;
  blocksGate: boolean; // importanza ≥ 3
}

const CRITICAL: Classification = { severity: 'Critical', importance: 4, blocksGate: true };
const HIGH: Classification = { severity: 'High', importance: 3, blocksGate: true };
const MEDIUM: Classification = { severity: 'Medium', importance: 2, blocksGate: false };
const INFO: Classification = { severity: 'Info', importance: 1, blocksGate: false };

const CRITICAL_BREACH = 0.25; // oltre +25% → Critical

export function classify(finding: Finding): Classification {
  // i pass non generano alert
  if (finding.status === 'pass') return INFO;

  switch (finding.type) {
    case 'Reconciliation':
      // qualsiasi riconciliazione rotta è bloccante
      return finding.status === 'fail' ? CRITICAL : MEDIUM;

    case 'Threshold':
      if (finding.status === 'fail') {
        const over = finding.breachPct ?? 0;
        return over > CRITICAL_BREACH ? CRITICAL : HIGH;
      }
      return MEDIUM;

    case 'Presence':
      // campo obbligatorio core mancante = High; fonte/assunzione soft = Medium
      return finding.status === 'fail' ? HIGH : MEDIUM;

    case 'Conformance':
      // conformità "soft" (label, comparabilità, owner/date rischio)
      return finding.status === 'fail' ? HIGH : MEDIUM;

    default:
      return INFO;
  }
}

// --- Gate Readiness --------------------------------------------------------
const WEIGHT: Record<Severity, number> = {
  Critical: 30,
  High: 15,
  Medium: 5,
  Info: 0,
};

export function gateReadiness(counts: Record<Severity, number>): number {
  const raw =
    100 -
    WEIGHT.Critical * counts.Critical -
    WEIGHT.High * counts.High -
    WEIGHT.Medium * counts.Medium;
  return Math.max(0, Math.min(100, raw));
}

export function bandOf(score: number): ReadinessBand {
  if (score >= 85) return 'green';
  if (score >= 60) return 'amber';
  return 'red';
}

export const BAND_META: Record<
  ReadinessBand,
  { label: string; text: string; bg: string; ring: string; dot: string }
> = {
  green: {
    label: 'Pronto per il gate',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  amber: {
    label: 'Da integrare',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    dot: 'bg-amber-500',
  },
  red: {
    label: 'Non pronto',
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    ring: 'ring-rose-200',
    dot: 'bg-rose-500',
  },
};
