// Verifica manuale del motore (Fase 3): conferma che i 5 scenari §3.2 scattino.
// Eseguire con:  npx -y tsx scripts/verify-engine.ts
import { computeEngine } from '../src/hooks/useEngine';
import { DELIVERABLES, DEFAULT_THRESHOLDS, PROJECT } from '../src/data/seed';

const r = computeEngine(DELIVERABLES, DEFAULT_THRESHOLDS, PROJECT.baseline);

console.log('\n=== GATE READINESS ===');
console.log(`score=${r.gateReadiness} band=${r.band} counts=`, r.counts);

console.log('\n=== ALERTS ===');
for (const a of r.alerts) {
  console.log(
    `[${a.severity}/imp${a.importance}] ${a.finding.type} · ${a.finding.deliverableId} · ${a.finding.message}`,
  );
  console.log(
    '   notifiche:',
    a.notifiedRoles.map((n) => `${n.role}=${n.letter}/${n.channel}${n.blocking ? '*' : ''}`).join(', '),
  );
}

console.log('\n=== RECONCILIATION LINKS ===');
for (const l of r.reconciliation) {
  console.log(`${l.fromId}(${l.fromValue}) → ${l.toId}(${l.toValue}) : ${l.ok ? 'OK' : 'BROKEN'}`);
}

// --- asserzioni scenari §3.2 ------------------------------------------------
const fails: string[] = [];
const has = (pred: (a: (typeof r.alerts)[number]) => boolean, label: string) => {
  if (!r.alerts.some(pred)) fails.push(label);
};

// 1. Payback 2.7>2.5 → Threshold fail → High su G1.13, a Finance(R)+Product(A)
has(
  (a) =>
    a.finding.type === 'Threshold' &&
    a.finding.deliverableId === 'G1.13' &&
    a.severity === 'High' &&
    a.notifiedRoles.some((n) => n.role === 'Finance' && n.letter === 'R') &&
    a.notifiedRoles.some((n) => n.role === 'Product' && n.letter === 'A'),
  'Scenario 1 (payback High → Finance R + Product A)',
);
// 2. BOM 34.50≠36.80 → Reconciliation fail → Critical
has(
  (a) => a.finding.type === 'Reconciliation' && a.severity === 'Critical' && a.finding.message.includes('BOM'),
  'Scenario 2 (BOM Critical)',
);
// 3. Estimation senza fonte assunzioni → Medium
has(
  (a) => a.finding.type === 'Presence' && a.severity === 'Medium' && a.finding.message.includes('assunzioni'),
  'Scenario 3 (assunzioni Medium)',
);
// 4. Investment 1.9==1.9 → Reconciliation pass (link verde presente)
if (!r.reconciliation.some((l) => l.id === 'lnk-inv' && l.ok)) fails.push('Scenario 4 (investimento riconcilia)');
// 5. Rischio R2 senza due date → Conformance warn → Medium
has(
  (a) => a.finding.type === 'Conformance' && a.severity === 'Medium' && a.finding.message.includes('R2'),
  'Scenario 5 (R2 senza due date Medium)',
);

// gate readiness atteso: 100 -30(1C) -15(1H) -5(2M) = 45
if (r.gateReadiness !== 45) fails.push(`Gate Readiness atteso 45, ottenuto ${r.gateReadiness}`);

// --- comportamento dinamico delle soglie (checklist 5 & 8) ------------------
const relaxed = computeEngine(DELIVERABLES, { ...DEFAULT_THRESHOLDS, paybackMaxYears: 3.0 }, PROJECT.baseline);
const stillHasPayback = relaxed.alerts.some(
  (a) => a.finding.type === 'Threshold' && a.finding.deliverableId === 'G1.13' && a.severity === 'High',
);
console.log(`\n=== SOGLIA paybackMax=3.0 ===\nscore=${relaxed.gateReadiness} (era 45) · alert payback presente=${stillHasPayback}`);
if (stillHasPayback) fails.push('Soglia dinamica: alzando paybackMax a 3.0 l\'alert payback dovrebbe sparire');
if (relaxed.gateReadiness <= r.gateReadiness) fails.push('Soglia dinamica: il Gate Readiness dovrebbe salire alzando la soglia');

console.log('\n=== ESITO ===');
if (fails.length === 0) {
  console.log('✅ Tutti gli scenari §3.2 scattano correttamente.');
} else {
  console.log('❌ Problemi:\n - ' + fails.join('\n - '));
  process.exit(1);
}
