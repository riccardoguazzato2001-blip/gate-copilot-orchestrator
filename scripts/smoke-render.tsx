// Smoke test di render: monta ogni componente con output reale del motore.
// Eseguire con:  npx -y tsx scripts/smoke-render.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';

import { computeEngine } from '../src/hooks/useEngine';
import { DELIVERABLES, DEFAULT_THRESHOLDS, PROJECT, SIMULATED_DATE } from '../src/data/seed';

import { Header } from '../src/components/Header';
import { KpiRow } from '../src/components/KpiRow';
import { DeliverableTable } from '../src/components/DeliverableTable';
import { AlertFeed } from '../src/components/AlertFeed';
import { ReconciliationView } from '../src/components/ReconciliationView';
import { BusinessCaseDeepDive } from '../src/components/BusinessCaseDeepDive';
import { NotificationPreview } from '../src/components/NotificationPreview';
import { ThresholdDrawer } from '../src/components/ThresholdDrawer';

const engine = computeEngine(DELIVERABLES, DEFAULT_THRESHOLDS, PROJECT.baseline);
const target = DELIVERABLES.find((d) => d.id === 'G1.12')!;
const estimation = DELIVERABLES.find((d) => d.id === 'G1.13')!;
const noop = () => {};

const cases: [string, () => unknown][] = [
  ['Header', () =>
    h(Header, {
      projectName: PROJECT.name, description: PROJECT.description, gate: PROJECT.currentGate,
      gateName: 'Feasibility', simulatedDate: SIMULATED_DATE, readiness: engine.gateReadiness,
      band: engine.band, onOpenThresholds: noop,
    })],
  ['KpiRow', () =>
    h(KpiRow, {
      deliverableCount: DELIVERABLES.length, counts: engine.counts, reconciliation: engine.reconciliation,
      baseline: PROJECT.baseline, currentPayback: 2.7, currentNpv: 1.6,
    })],
  ['DeliverableTable', () =>
    h(DeliverableTable, { deliverables: DELIVERABLES, matrix: engine.matrix, selectedId: 'G1.13', onSelect: noop })],
  ['AlertFeed', () =>
    h(AlertFeed, { alerts: engine.alerts, deliverables: DELIVERABLES, selectedAlertId: engine.alerts[0]?.id ?? null, onSelectAlert: noop })],
  ['AlertFeed(empty)', () =>
    h(AlertFeed, { alerts: [], deliverables: DELIVERABLES, selectedAlertId: null, onSelectAlert: noop })],
  ['ReconciliationView', () => h(ReconciliationView, { links: engine.reconciliation })],
  ['BusinessCaseDeepDive', () =>
    h(BusinessCaseDeepDive, { target, estimation, baseline: PROJECT.baseline, thresholds: DEFAULT_THRESHOLDS, alerts: engine.alerts })],
  ['NotificationPreview', () => h(NotificationPreview, { alert: engine.alerts[0] ?? null, deliverables: DELIVERABLES })],
  ['NotificationPreview(null)', () => h(NotificationPreview, { alert: null, deliverables: DELIVERABLES })],
  ['ThresholdDrawer', () => h(ThresholdDrawer, { open: true, thresholds: DEFAULT_THRESHOLDS, onChange: noop, onClose: noop })],
];

let failed = 0;
for (const [name, factory] of cases) {
  try {
    const html = renderToStaticMarkup(factory() as never);
    void html;
    console.log(`✅ ${name} (${html.length} char)`);
  } catch (e) {
    failed++;
    console.log(`❌ ${name}: ${(e as Error).message}`);
  }
}

console.log(failed === 0 ? '\n✅ Tutti i componenti renderizzano senza errori.' : `\n❌ ${failed} componenti in errore.`);
process.exit(failed === 0 ? 0 : 1);
