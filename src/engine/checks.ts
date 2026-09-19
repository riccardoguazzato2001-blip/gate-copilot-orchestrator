// ============================================================================
// Gate Co-Pilot — MOTORE DI CONTROLLO (4 livelli, deterministico)
//
// Quattro funzioni pure che, dato l'insieme dei deliverable + le soglie + la
// baseline di progetto, producono `Finding[]`. Ogni finding cita il criterio
// "accept only if…" violato (parafrasato dal reference pack GEWISS) e l'azione
// consigliata. È il cuore concettuale dell'app: tenuto volutamente leggibile.
//
// I quattro livelli:
//   1. Presence       — il campo obbligatorio è presente?
//   2. Conformance    — il contenuto rispetta i bullet "accept only if…"?
//   3. Threshold      — il valore è dentro la policy (e vs baseline G0)?
//   4. Reconciliation — i numeri coincidono tra documenti/revisioni?
// ============================================================================

import type {
  Deliverable,
  DeliverableField,
  Finding,
  ProjectBaseline,
  ReconciliationLink,
  ThresholdConfig,
} from '../types';

// --- accessori ai dati -----------------------------------------------------
function byId(deliverables: Deliverable[], id: string): Deliverable | undefined {
  return deliverables.find((d) => d.id === id);
}

function field(d: Deliverable | undefined, key: string): DeliverableField | undefined {
  return d?.fields.find((f) => f.key === key);
}

function numOf(d: Deliverable | undefined, key: string): number | null {
  const v = field(d, key)?.value;
  return typeof v === 'number' ? v : null;
}

function strOf(d: Deliverable | undefined, key: string): string | null {
  const v = field(d, key)?.value;
  return typeof v === 'string' ? v : null;
}

// formattazioni per i messaggi
const yrs = (n: number) => `${n.toLocaleString('it-IT')} anni`;
const eur = (n: number) => `${n.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €`;
const meur = (n: number) => `${n.toLocaleString('it-IT')} M€`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

let _seq = 0;
const fid = (type: string) => `f-${type}-${++_seq}`;

// I campi finanziari "core" che un Business Case deve sempre riportare.
const BC_CORE_FIELDS: { key: string; label: string }[] = [
  { key: 'investmentMeur', label: 'investimento' },
  { key: 'paybackYears', label: 'payback' },
  { key: 'npvMeur', label: 'NPV' },
  { key: 'irr', label: 'IRR' },
];

const businessCases = (ds: Deliverable[]) =>
  ds.filter((d) => strOf(d, 'label') === 'target' || strOf(d, 'label') === 'estimation');

// ============================================================================
// LIVELLO 1 — PRESENCE
// Il campo obbligatorio è presente? Per il Business Case servono investimento,
// payback, NPV, IRR E tasso di sconto + orizzonte (criterio del pack: "states
// the discount rate and the time horizon" → senza, l'NPV è non verificabile).
// Per l'Estimation, la fonte delle assunzioni deve essere presente.
// ============================================================================
export function presenceChecks(deliverables: Deliverable[]): Finding[] {
  const out: Finding[] = [];

  for (const d of businessCases(deliverables)) {
    // indicatori core + tasso/orizzonte
    const missingCore = BC_CORE_FIELDS.filter((f) => numOf(d, f.key) === null);
    const hasRate = numOf(d, 'discountRate') !== null;
    const hasHorizon = numOf(d, 'horizonYears') !== null;

    if (missingCore.length > 0 || !hasRate || !hasHorizon) {
      const missingLabels = [
        ...missingCore.map((f) => f.label),
        ...(!hasRate ? ['tasso di sconto'] : []),
        ...(!hasHorizon ? ['orizzonte temporale'] : []),
      ];
      out.push({
        id: fid('pres'),
        deliverableId: d.id,
        type: 'Presence',
        status: 'fail',
        message: `Mancano campi obbligatori (${missingLabels.join(', ')}): senza tasso/orizzonte l'NPV non è verificabile.`,
        criterionRef:
          'Business Case: indicatori standard (investimento, payback, NPV, IRR) + tasso di sconto e orizzonte temporale dichiarati.',
        expected: 'Tutti gli indicatori + tasso/orizzonte presenti',
        observed: `Mancanti: ${missingLabels.join(', ')}`,
        recommendedAction: 'Integrare i campi mancanti prima del comitato.',
      });
    } else {
      out.push({
        id: fid('pres'),
        deliverableId: d.id,
        type: 'Presence',
        status: 'pass',
        message: 'Tutti gli indicatori finanziari, il tasso di sconto e l\'orizzonte sono presenti.',
        criterionRef:
          'Business Case: indicatori standard + tasso di sconto e orizzonte temporale dichiarati.',
      });
    }

    // Estimation: la fonte delle assunzioni deve essere dichiarata
    if (strOf(d, 'label') === 'estimation') {
      const src = field(d, 'assumptionsSource');
      const hasSource = !!src && src.value != null && src.value !== '';
      if (!hasSource) {
        out.push({
          id: fid('pres'),
          deliverableId: d.id,
          type: 'Presence',
          status: 'warn',
          message: 'Il caso su stima non dichiara la fonte delle assunzioni (costo POC, feedback vendite).',
          criterionRef:
            'Business Case (Estimation): "assunzioni e fonti dichiarate" — input di stima senza fonte non è tracciabile.',
          expected: 'Fonte assunzioni dichiarata',
          observed: 'Fonte assente',
          recommendedAction: 'Indicare la fonte di ogni assunzione (es. costo POC, feedback commerciale).',
        });
      }
    }
  }

  return out;
}

// ============================================================================
// LIVELLO 2 — CONFORMANCE
// Il contenuto rispetta i bullet "accept only if…"? Target ed Estimation devono
// essere etichettati e comparabili (stesso orizzonte/tasso). Nel Risk Plan ogni
// mitigazione deve avere owner + due date + residual rating.
// ============================================================================
export function conformanceChecks(deliverables: Deliverable[]): Finding[] {
  const out: Finding[] = [];

  const target = deliverables.find((d) => strOf(d, 'label') === 'target');
  const estimation = deliverables.find((d) => strOf(d, 'label') === 'estimation');

  // Comparabilità target ↔ estimation (etichettati + stesso tasso/orizzonte)
  if (target && estimation) {
    const sameRate = numOf(target, 'discountRate') === numOf(estimation, 'discountRate');
    const sameHorizon = numOf(target, 'horizonYears') === numOf(estimation, 'horizonYears');
    out.push({
      id: fid('conf'),
      deliverableId: estimation.id,
      type: 'Conformance',
      status: sameRate && sameHorizon ? 'pass' : 'warn',
      message:
        sameRate && sameHorizon
          ? 'Caso target e caso stima sono etichettati e comparabili (stesso tasso e orizzonte).'
          : 'Caso target e caso stima non sono comparabili: tasso o orizzonte differenti.',
      criterionRef:
        'Business Case (Estimation): "stesso set indicatori, stesso tasso/orizzonte del caso target" — i due scenari devono essere confrontabili.',
      ...(sameRate && sameHorizon
        ? {}
        : {
            expected: 'Stesso tasso e orizzonte del caso target',
            observed: `Tasso ${pct(numOf(estimation, 'discountRate') ?? 0)} / orizzonte ${numOf(estimation, 'horizonYears')} anni`,
            recommendedAction: 'Allineare tasso e orizzonte tra i due scenari.',
          }),
    });
  }

  // Risk Plan: ogni mitigazione deve avere owner + due date + residual rating
  const riskPlan = deliverables.find((d) => d.risks && d.risks.length > 0);
  if (riskPlan?.risks) {
    const incomplete = riskPlan.risks.filter((r) => !r.owner || !r.dueDate || !r.residual);
    if (incomplete.length > 0) {
      const missingBits = incomplete.map((r) => {
        const bits: string[] = [];
        if (!r.owner) bits.push('owner');
        if (!r.dueDate) bits.push('due date');
        if (!r.residual) bits.push('residual rating');
        return `${r.id} (${bits.join(', ')})`;
      });
      out.push({
        id: fid('conf'),
        deliverableId: riskPlan.id,
        type: 'Conformance',
        status: 'warn',
        message: `Mitigazioni incomplete: ${missingBits.join('; ')}.`,
        criterionRef:
          'Risk & Mitigation Plan: "ogni rischio significativo ha mitigazione concreta, owner e data" e rischio residuo ri-valutato.',
        expected: 'Ogni rischio con owner + due date + residual rating',
        observed: missingBits.join('; '),
        recommendedAction: 'Assegnare owner, data e rating residuo a ogni mitigazione mancante.',
      });
    } else {
      out.push({
        id: fid('conf'),
        deliverableId: riskPlan.id,
        type: 'Conformance',
        status: 'pass',
        message: 'Ogni mitigazione ha owner, due date e rating residuo.',
        criterionRef:
          'Risk & Mitigation Plan: ogni rischio con mitigazione concreta, owner e data.',
      });
    }
  }

  return out;
}

// ============================================================================
// LIVELLO 3 — THRESHOLD
// Il valore è dentro la policy? payback ≤ paybackMaxYears, NPV ≥ npvMinMeur.
// Confronto anche con la baseline di progetto (G0 Rev 0).
// ============================================================================
export function thresholdChecks(
  deliverables: Deliverable[],
  thresholds: ThresholdConfig,
  baseline: ProjectBaseline,
): Finding[] {
  const out: Finding[] = [];

  for (const d of businessCases(deliverables)) {
    // -- Payback ≤ max --------------------------------------------------------
    const payback = numOf(d, 'paybackYears');
    if (payback !== null) {
      const breach = payback > thresholds.paybackMaxYears;
      const deltaVsBaseline = payback - baseline.paybackYears;
      out.push({
        id: fid('thr'),
        deliverableId: d.id,
        type: 'Threshold',
        status: breach ? 'fail' : 'pass',
        message: breach
          ? `Payback ${yrs(payback)} oltre la soglia di ${yrs(thresholds.paybackMaxYears)} (${deltaVsBaseline >= 0 ? '+' : ''}${deltaVsBaseline.toLocaleString('it-IT')} anni vs baseline G0 di ${yrs(baseline.paybackYears)}).`
          : `Payback ${yrs(payback)} entro la soglia di ${yrs(thresholds.paybackMaxYears)}.`,
        criterionRef: `Policy GEWISS: payback ≤ ${yrs(thresholds.paybackMaxYears)}; allineato alla baseline G0.`,
        observed: yrs(payback),
        expected: `≤ ${yrs(thresholds.paybackMaxYears)}`,
        breachPct: breach ? (payback - thresholds.paybackMaxYears) / thresholds.paybackMaxYears : 0,
        ...(breach
          ? { recommendedAction: 'Rivedere costi/ricavi o rinegoziare la fornitura per rientrare nella soglia di payback.' }
          : {}),
      });
    }

    // -- NPV ≥ min ------------------------------------------------------------
    const npv = numOf(d, 'npvMeur');
    if (npv !== null) {
      const breach = npv < thresholds.npvMinMeur;
      out.push({
        id: fid('thr'),
        deliverableId: d.id,
        type: 'Threshold',
        status: breach ? 'fail' : 'pass',
        message: breach
          ? `NPV ${meur(npv)} sotto il minimo di ${meur(thresholds.npvMinMeur)}.`
          : `NPV ${meur(npv)} sopra il minimo di ${meur(thresholds.npvMinMeur)}.`,
        criterionRef: `Policy GEWISS: NPV ≥ ${meur(thresholds.npvMinMeur)}.`,
        observed: meur(npv),
        expected: `≥ ${meur(thresholds.npvMinMeur)}`,
        breachPct: breach ? (thresholds.npvMinMeur - npv) / thresholds.npvMinMeur : 0,
        ...(breach ? { recommendedAction: 'Recuperare valore (prezzo, volumi, costo) per riportare l\'NPV sopra il minimo.' } : {}),
      });
    }
  }

  return out;
}

// ============================================================================
// LIVELLO 4 — RECONCILIATION
// I numeri coincidono tra documenti/revisioni (tolleranza in EUR)?
//   • G1.13.bomUnitCostUsed deve uguagliare G1.3.bomUnitCost  (DIFETTO seminato)
//   • G1.13.investmentMeur  deve uguagliare G1.10.totalInvestmentMeur
//   • Target ed Estimation devono usare lo stesso tasso/orizzonte
// ============================================================================
export function reconciliationChecks(
  deliverables: Deliverable[],
  thresholds: ThresholdConfig,
): Finding[] {
  const out: Finding[] = [];
  const tol = thresholds.reconciliationToleranceEUR;

  const est = byId(deliverables, 'G1.13');
  const poc = byId(deliverables, 'G1.3');
  const plan = byId(deliverables, 'G1.10');
  const tgt = byId(deliverables, 'G1.12');

  // 1) Costo BOM: stima (G1.13) vs verità tecnica (G1.3)
  const bomUsed = numOf(est, 'bomUnitCostUsed');
  const bomTruth = numOf(poc, 'bomUnitCost');
  if (bomUsed !== null && bomTruth !== null) {
    const ok = Math.abs(bomUsed - bomTruth) <= tol;
    out.push({
      id: fid('rec'),
      deliverableId: 'G1.13',
      type: 'Reconciliation',
      status: ok ? 'pass' : 'fail',
      message: ok
        ? `Costo BOM allineato tra Business Case (stima) e dato tecnico: ${eur(bomUsed)}.`
        : `Costo BOM divergente: il Business Case (stima) usa ${eur(bomUsed)} ma la verità tecnica (POC & BOM) è ${eur(bomTruth)}.`,
      criterionRef:
        'Coerenza cross-documento: il costo BOM usato nel Business Case deve coincidere con il roll-up tecnico (POC & BOM).',
      observed: `Stima ${eur(bomUsed)} ≠ Tecnico ${eur(bomTruth)}`,
      expected: `Differenza ≤ ${eur(tol)}`,
      ...(ok ? {} : { recommendedAction: `Aggiornare il Business Case al costo BOM verificato di ${eur(bomTruth)} e ricalcolare margine e NPV.` }),
    });
  }

  // 2) Investimento: stima (G1.13) vs piano Capex/Opex (G1.10)
  const invEst = numOf(est, 'investmentMeur');
  const invPlan = numOf(plan, 'totalInvestmentMeur');
  if (invEst !== null && invPlan !== null) {
    // tolleranza espressa in EUR → confronto in EUR (M€ * 1e6)
    const ok = Math.abs(invEst - invPlan) * 1_000_000 <= tol;
    out.push({
      id: fid('rec'),
      deliverableId: 'G1.13',
      type: 'Reconciliation',
      status: ok ? 'pass' : 'fail',
      message: ok
        ? `Investimento riconciliato tra Business Case e Detailed Plan: ${meur(invEst)}.`
        : `Investimento divergente: Business Case ${meur(invEst)} vs Detailed Plan ${meur(invPlan)}.`,
      criterionRef:
        'Coerenza cross-documento: l\'investimento del Business Case deve riconciliare con il Detailed Plan (Capex/Opex).',
      observed: ok ? `${meur(invEst)} = ${meur(invPlan)}` : `${meur(invEst)} ≠ ${meur(invPlan)}`,
      expected: 'Stesso investimento nei due documenti',
      ...(ok ? {} : { recommendedAction: 'Allineare l\'investimento tra Business Case e Detailed Plan.' }),
    });
  }

  // 3) Tasso/orizzonte: target (G1.12) vs estimation (G1.13)
  if (tgt && est) {
    const sameRate = numOf(tgt, 'discountRate') === numOf(est, 'discountRate');
    const sameHorizon = numOf(tgt, 'horizonYears') === numOf(est, 'horizonYears');
    const ok = sameRate && sameHorizon;
    out.push({
      id: fid('rec'),
      deliverableId: 'G1.13',
      type: 'Reconciliation',
      status: ok ? 'pass' : 'fail',
      message: ok
        ? 'Tasso di sconto e orizzonte coincidono tra caso target e caso stima.'
        : 'Tasso di sconto o orizzonte divergenti tra caso target e caso stima.',
      criterionRef:
        'Business Case: i due scenari devono usare lo stesso tasso di sconto e lo stesso orizzonte per essere confrontabili.',
      observed: `Tasso ${pct(numOf(est, 'discountRate') ?? 0)}, orizzonte ${numOf(est, 'horizonYears')} anni`,
      expected: 'Identici al caso target',
      ...(ok ? {} : { recommendedAction: 'Uniformare tasso e orizzonte tra i due scenari.' }),
    });
  }

  return out;
}

// ============================================================================
// Esecuzione dell'intero motore
// ============================================================================
export function runChecks(
  deliverables: Deliverable[],
  thresholds: ThresholdConfig,
  baseline: ProjectBaseline,
): Finding[] {
  _seq = 0; // reset id deterministici a ogni run
  return [
    ...presenceChecks(deliverables),
    ...conformanceChecks(deliverables),
    ...thresholdChecks(deliverables, thresholds, baseline),
    ...reconciliationChecks(deliverables, thresholds),
  ];
}

// ============================================================================
// Legami di riconciliazione (per la vista grafica cross-deliverable)
//   G1.3 BOM → G1.13 Estimation → G1.10 Capex/Opex  +  G1.12 ↔ G1.13 (tasso)
// ============================================================================
export function buildReconciliationLinks(
  deliverables: Deliverable[],
  thresholds: ThresholdConfig,
): ReconciliationLink[] {
  const tol = thresholds.reconciliationToleranceEUR;
  const est = byId(deliverables, 'G1.13');
  const poc = byId(deliverables, 'G1.3');
  const plan = byId(deliverables, 'G1.10');

  const links: ReconciliationLink[] = [];

  const bomUsed = numOf(est, 'bomUnitCostUsed');
  const bomTruth = numOf(poc, 'bomUnitCost');
  if (bomUsed !== null && bomTruth !== null) {
    links.push({
      id: 'lnk-bom',
      label: 'Costo unitario BOM',
      fromId: 'G1.3',
      fromLabel: 'POC & BOM',
      toId: 'G1.13',
      toLabel: 'Business Case (stima)',
      fromValue: eur(bomTruth),
      toValue: eur(bomUsed),
      ok: Math.abs(bomUsed - bomTruth) <= tol,
    });
  }

  const invEst = numOf(est, 'investmentMeur');
  const invPlan = numOf(plan, 'totalInvestmentMeur');
  if (invEst !== null && invPlan !== null) {
    links.push({
      id: 'lnk-inv',
      label: 'Investimento totale',
      fromId: 'G1.13',
      fromLabel: 'Business Case (stima)',
      toId: 'G1.10',
      toLabel: 'Detailed Plan (Capex/Opex)',
      fromValue: meur(invEst),
      toValue: meur(invPlan),
      ok: Math.abs(invEst - invPlan) * 1_000_000 <= tol,
    });
  }

  return links;
}
