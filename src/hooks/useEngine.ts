// ============================================================================
// Gate Co-Pilot — useEngine
// Hook che, dati (deliverables, thresholds, baseline), riesegue tutti i check e
// produce (findings, alerts, reconciliation, gateReadiness, counts, matrix).
// Cambiando le soglie nello stato React, tutto si ricalcola in tempo reale.
// ============================================================================

import { useMemo } from 'react';
import {
  buildReconciliationLinks,
  runChecks,
} from '../engine/checks';
import { bandOf, classify, gateReadiness } from '../engine/severity';
import { routeAlert } from '../engine/routing';
import type {
  Alert,
  CheckType,
  Deliverable,
  EngineResult,
  Finding,
  FindingStatus,
  ProjectBaseline,
  Severity,
  ThresholdConfig,
} from '../types';

const STATUS_RANK: Record<FindingStatus, number> = { pass: 0, warn: 1, fail: 2 };

function worse(a: FindingStatus | undefined, b: FindingStatus): FindingStatus {
  if (a === undefined) return b;
  return STATUS_RANK[b] > STATUS_RANK[a] ? b : a;
}

export function computeEngine(
  deliverables: Deliverable[],
  thresholds: ThresholdConfig,
  baseline: ProjectBaseline,
): EngineResult {
  const findings: Finding[] = runChecks(deliverables, thresholds, baseline);
  const byId = new Map(deliverables.map((d) => [d.id, d]));

  // --- Alerts (solo findings non-pass) ------------------------------------
  const alerts: Alert[] = [];
  for (const finding of findings) {
    if (finding.status === 'pass') continue;
    const cls = classify(finding);
    const deliverable = byId.get(finding.deliverableId);
    if (!deliverable) continue;
    const { notifiedRoles, recommendedAction } = routeAlert(finding, cls, deliverable);
    alerts.push({
      id: `a-${finding.id}`,
      finding,
      severity: cls.severity,
      importance: cls.importance,
      blocksGate: cls.blocksGate,
      notifiedRoles,
      recommendedAction,
    });
  }

  // ordina per severità (Critical → High → Medium → Info)
  const SEV_RANK: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Info: 3 };
  alerts.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);

  // --- Conteggi per severità ----------------------------------------------
  const counts: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Info: 0 };
  for (const a of alerts) counts[a.severity] += 1;

  // --- Gate Readiness ------------------------------------------------------
  const score = gateReadiness(counts);
  const band = bandOf(score);

  // --- Matrice (deliverable → checkType → stato peggiore) ------------------
  const matrix: Record<string, Partial<Record<CheckType, FindingStatus>>> = {};
  for (const f of findings) {
    matrix[f.deliverableId] ??= {};
    matrix[f.deliverableId][f.type] = worse(matrix[f.deliverableId][f.type], f.status);
  }

  // --- Riconciliazione (grafo cross-deliverable) ---------------------------
  const reconciliation = buildReconciliationLinks(deliverables, thresholds);

  return { findings, alerts, reconciliation, gateReadiness: score, band, counts, matrix };
}

export function useEngine(
  deliverables: Deliverable[],
  thresholds: ThresholdConfig,
  baseline: ProjectBaseline,
): EngineResult {
  return useMemo(
    () => computeEngine(deliverables, thresholds, baseline),
    [deliverables, thresholds, baseline],
  );
}
