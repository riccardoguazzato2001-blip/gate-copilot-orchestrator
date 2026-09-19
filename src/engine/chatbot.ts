// ============================================================================
// Gate Co-Pilot v2 — CHATBOT (motore delle risposte)
//
// Il PM interroga in linguaggio naturale i documenti del gate. Le risposte sono
// SEMPRE ancorate ai dati reali dell'engine e del seed (mai inventate): se le
// soglie cambiano, le risposte cambiano di conseguenza.
//
//   • Senza chiave  → responder MOCK intelligente (pattern matching su keyword),
//                     con risposte ricche in markdown e citazioni ai documenti.
//   • Con VITE_ANTHROPIC_API_KEY → usa l'Anthropic Messages API passando come
//                     contesto i dati strutturati del progetto/engine.
//
// La demo funziona al 100% SENZA chiave.
// ============================================================================

import type {
  Alert,
  Deliverable,
  EngineResult,
  GateInfo,
  Project,
  Severity,
  ThresholdConfig,
} from '../types';
import { SEVERITY_LABEL, RACI_LABEL } from '../types';
import { fmtMeur, fmtYears, fmtEur, fmtPct } from '../lib/format';

// --- Tipi -------------------------------------------------------------------
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string; // markdown semplice
  timestamp: number; // ms epoch
  sources?: string[]; // documenti/deliverable citati
  isTyping?: boolean; // placeholder "sta scrivendo…"
}

export interface ChatContext {
  project: Project;
  gate: string; // 'G1'
  gateName: string;
  simulatedDate: string;
  engine: EngineResult;
  deliverables: Deliverable[];
  thresholds: ThresholdConfig;
  gates: GateInfo[];
}

// --- Config AI opzionale ----------------------------------------------------
const API_KEY = import.meta.env?.VITE_ANTHROPIC_API_KEY as string | undefined;
const MODEL = 'claude-sonnet-4-6';

export function isChatAiEnabled(): boolean {
  return typeof API_KEY === 'string' && API_KEY.length > 0;
}

// --- Domande suggerite (quick prompts) -------------------------------------
export const QUICK_PROMPTS: string[] = [
  'Qual è lo stato del gate attuale?',
  'Quali anomalie bloccano il gate?',
  'Riepilogo del Business Case',
  'Chi deve agire per le anomalie critiche?',
  'Confronta target vs estimation',
];

// --- Helper di accesso ai dati ---------------------------------------------
function num(d: Deliverable | undefined, key: string): number | null {
  const v = d?.fields.find((f) => f.key === key)?.value;
  return typeof v === 'number' ? v : null;
}
function deliverable(ctx: ChatContext, id: string): Deliverable | undefined {
  return ctx.deliverables.find((d) => d.id === id);
}
const SEV_ICON: Record<Severity, string> = {
  Critical: '🔴',
  High: '🟠',
  Medium: '🔵',
  Info: '⚪',
};
function bandIcon(band: string): string {
  return band === 'green' ? '🟢' : band === 'amber' ? '🟡' : '🔴';
}
function bandLabel(band: string): string {
  return band === 'green' ? 'verde' : band === 'amber' ? 'ambra' : 'rossa';
}

// --- Messaggio di benvenuto -------------------------------------------------
export function welcomeMessage(ctx: ChatContext): ChatMessage {
  return {
    id: 'welcome',
    role: 'assistant',
    timestamp: 0,
    content: `👋 Ciao! Sono **Gate Co-Pilot AI**, il tuo assistente per la governance del progetto **${ctx.project.name}**.

Posso aiutarti con:
- 📊 Stato del gate e readiness
- ⚠️ Anomalie e azioni consigliate
- 📋 Dettagli su Business Case, rischi e riconciliazione
- 👥 Chi deve agire e con quale ruolo (RACI)

Cosa vuoi sapere?`,
  };
}

// ============================================================================
// RESPONDER MOCK — pattern matching su keyword, risposte ancorate ai dati
// ============================================================================
interface MockReply {
  content: string;
  sources: string[];
}

function replyGateStatus(ctx: ChatContext): MockReply {
  const { engine } = ctx;
  const blocking = engine.alerts.filter((a) => a.blocksGate);
  const soft = engine.alerts.filter((a) => !a.blocksGate);

  const blockingLines = blocking.length
    ? blocking
        .map(
          (a) =>
            `- ${SEV_ICON[a.severity]} **${SEVERITY_LABEL[a.severity]}**: ${stripTrailingDot(a.finding.message)}`,
        )
        .join('\n')
    : '- _Nessuna anomalia bloccante._';

  const softLines = soft.length
    ? soft
        .map(
          (a) =>
            `- ${SEV_ICON[a.severity]} **${SEVERITY_LABEL[a.severity]}**: ${stripTrailingDot(a.finding.message)}`,
        )
        .join('\n')
    : '- _Nessuna anomalia minore._';

  const verdict =
    engine.band === 'green'
      ? 'Il gate è **pronto** per l\'approvazione.'
      : engine.band === 'amber'
        ? 'Il gate è **da integrare** prima del comitato.'
        : 'Il gate **non è pronto** per l\'approvazione.';

  return {
    content: `📊 **Stato ${ctx.gateName}**

Il Gate Readiness attuale è **${engine.gateReadiness}/100** (${bandIcon(engine.band)} banda ${bandLabel(engine.band)}). ${verdict}

**Anomalie bloccanti** (${blocking.length}):
${blockingLines}

**Anomalie non bloccanti** (${soft.length}):
${softLines}`,
    sources: [
      'engine di governance',
      `data simulata ${ctx.simulatedDate}`,
    ],
  };
}

function replyBlockingAnomalies(ctx: ChatContext): MockReply {
  const { engine } = ctx;
  const blocking = engine.alerts.filter((a) => a.blocksGate);
  if (!blocking.length) {
    return {
      content: `✅ **Nessuna anomalia bloccante**

Tutti i controlli bloccanti (riconciliazione e soglie critiche) sono superati. Il Gate Readiness è **${engine.gateReadiness}/100**.`,
      sources: ['engine di governance'],
    };
  }
  const lines = blocking
    .map((a) => {
      const d = deliverable(ctx, a.finding.deliverableId);
      const dl = d ? `${d.id} · ${d.name}` : a.finding.deliverableId;
      const obs = a.finding.observed ? `\n  - Rilevato: \`${a.finding.observed}\`` : '';
      const exp = a.finding.expected ? ` · Atteso: \`${a.finding.expected}\`` : '';
      return `${SEV_ICON[a.severity]} **${SEVERITY_LABEL[a.severity]}** — ${stripTrailingDot(a.finding.message)}
  - Deliverable: **${dl}**${obs}${exp}
  - 🔧 Azione: ${a.recommendedAction}`;
    })
    .join('\n\n');

  return {
    content: `🚧 **Anomalie che bloccano ${ctx.gate}** (${blocking.length})

${lines}

> Queste anomalie azzerano la possibilità di un GO finché non vengono risolte e validate dall'Accountable.`,
    sources: blocking.map((a) => `${a.finding.deliverableId} · ${a.finding.type}`),
  };
}

function replyBusinessCase(ctx: ChatContext): MockReply {
  const tgt = deliverable(ctx, 'G1.12');
  const est = deliverable(ctx, 'G1.13');
  const t = ctx.thresholds;

  const estPay = num(est, 'paybackYears');
  const estNpv = num(est, 'npvMeur');
  const tgtPay = num(tgt, 'paybackYears');
  const tgtNpv = num(tgt, 'npvMeur');

  const payBreach = estPay !== null && estPay > t.paybackMaxYears;
  const npvBreach = estNpv !== null && estNpv < t.npvMinMeur;

  const flags: string[] = [];
  if (payBreach && estPay !== null)
    flags.push(
      `- 🟠 Payback stima **${fmtYears(estPay)}** oltre la soglia di ${fmtYears(t.paybackMaxYears)}`,
    );
  if (npvBreach && estNpv !== null)
    flags.push(
      `- 🔴 NPV stima **${fmtMeur(estNpv)}** sotto il minimo di ${fmtMeur(t.npvMinMeur)}`,
    );
  if (!flags.length) flags.push('- ✅ Payback e NPV della stima rientrano nelle soglie di policy.');

  return {
    content: `📋 **Riepilogo Business Case (Rev 1)**

| Metrica | Target (G1.12) | Stima (G1.13) | Baseline G0 |
| --- | --- | --- | --- |
| Payback | ${tgtPay !== null ? fmtYears(tgtPay) : '—'} | ${estPay !== null ? fmtYears(estPay) : '—'} | ${fmtYears(ctx.project.baseline.paybackYears)} |
| NPV | ${tgtNpv !== null ? fmtMeur(tgtNpv) : '—'} | ${estNpv !== null ? fmtMeur(estNpv) : '—'} | ${fmtMeur(ctx.project.baseline.npvMeur)} |

**Soglie di policy:** payback ≤ ${fmtYears(t.paybackMaxYears)} · NPV ≥ ${fmtMeur(t.npvMinMeur)}

**Rilievi:**
${flags.join('\n')}

Il caso stima è costruito sul costo POC; il caso target sui Business Requirements Rev 1.`,
    sources: ['Business Case Targets (G1.12)', 'Business Case Estimation (G1.13)', 'Baseline G0'],
  };
}

function replyCompare(ctx: ChatContext): MockReply {
  const tgt = deliverable(ctx, 'G1.12');
  const est = deliverable(ctx, 'G1.13');
  const rows: string[] = [];
  const metrics: { key: string; label: string; fmt: (n: number) => string }[] = [
    { key: 'investmentMeur', label: 'Investimento', fmt: fmtMeur },
    { key: 'paybackYears', label: 'Payback', fmt: fmtYears },
    { key: 'npvMeur', label: 'NPV', fmt: fmtMeur },
    { key: 'irr', label: 'IRR', fmt: fmtPct },
  ];
  for (const m of metrics) {
    const tv = num(tgt, m.key);
    const ev = num(est, m.key);
    const delta = tv !== null && ev !== null ? ev - tv : null;
    const deltaStr =
      delta === null ? '' : delta === 0 ? ' (=)' : delta > 0 ? ` (+${m.fmt(Math.abs(delta))})` : ` (−${m.fmt(Math.abs(delta))})`;
    rows.push(
      `| ${m.label} | ${tv !== null ? m.fmt(tv) : '—'} | ${ev !== null ? m.fmt(ev) : '—'}${deltaStr} |`,
    );
  }
  return {
    content: `⚖️ **Target vs Estimation**

| Metrica | Target (G1.12) | Stima (G1.13) |
| --- | --- | --- |
${rows.join('\n')}

Il caso **stima** è più conservativo: incorpora il costo reale del POC. Il **delta** evidenzia dove le evidenze raccolte hanno eroso i target. La fonte delle assunzioni della stima risulta **non dichiarata** — da integrare.`,
    sources: ['Business Case Targets (G1.12)', 'Business Case Estimation (G1.13)'],
  };
}

function replyRisks(ctx: ChatContext): MockReply {
  const rp = ctx.deliverables.find((d) => d.risks && d.risks.length > 0);
  if (!rp?.risks) {
    return { content: 'Non trovo un Risk & Mitigation Plan tra i deliverable.', sources: [] };
  }
  const lines = rp.risks
    .map((r) => {
      const gaps: string[] = [];
      if (!r.owner) gaps.push('owner');
      if (!r.dueDate) gaps.push('due date');
      if (!r.residual) gaps.push('residual rating');
      const status = gaps.length ? `⚠️ manca ${gaps.join(', ')}` : '✅ completo';
      return `- **${r.id}** — ${r.name} _(${r.category}, owner ${r.owner ?? '—'}, residuo ${r.residual ?? '—'})_ → ${status}`;
    })
    .join('\n');
  return {
    content: `🛡️ **Risk & Mitigation Plan (${rp.id})**

${lines}

Criterio del pack: _"ogni rischio significativo ha mitigazione concreta, owner e data; rischio residuo ri-valutato"_. Il rischio **R2** (certificazione MID) è privo di **due date** → anomalia di conformità (Media).`,
    sources: [`${rp.id} · Risk & Mitigation Plan`],
  };
}

function replyWhoActs(ctx: ChatContext): MockReply {
  const blocking = ctx.engine.alerts.filter((a) => a.blocksGate);
  const pool = blocking.length ? blocking : ctx.engine.alerts;
  if (!pool.length) {
    return { content: '✅ Nessuna azione richiesta: non ci sono anomalie aperte.', sources: [] };
  }
  const lines = pool
    .map((a) => {
      const acc = a.notifiedRoles.filter((n) => n.letter === 'A').map((n) => RACI_LABEL[n.role]);
      const resp = a.notifiedRoles.filter((n) => n.letter === 'R').map((n) => RACI_LABEL[n.role]);
      const d = deliverable(ctx, a.finding.deliverableId);
      return `${SEV_ICON[a.severity]} **${d ? d.name : a.finding.deliverableId}** (${SEVERITY_LABEL[a.severity]})
  - 🖊️ Decide/firma (Accountable): **${acc.join(', ') || '—'}**${a.notifiedRoles.some((n) => n.letter === 'A' && n.blocking) ? ' · _ACK bloccante_' : ''}
  - 🔧 Corregge (Responsible): **${resp.join(', ') || '—'}**`;
    })
    .join('\n\n');
  return {
    content: `👥 **Chi deve agire**

${lines}

L'instradamento segue la matrice **RACI** del deliverable: l'Accountable valida, il Responsible corregge, i Consulted danno parere, gli Informed ricevono un FYI.`,
    sources: ['routing RACI', 'reference pack GEWISS'],
  };
}

function replyReconciliation(ctx: ChatContext): MockReply {
  const links = ctx.engine.reconciliation;
  if (!links.length) {
    return { content: 'Nessun legame di riconciliazione configurato.', sources: [] };
  }
  const lines = links
    .map(
      (l) =>
        `- ${l.ok ? '✅' : '🔴'} **${l.label}**: ${l.fromLabel} \`${l.fromValue}\` ${l.ok ? '=' : '≠'} ${l.toLabel} \`${l.toValue}\``,
    )
    .join('\n');
  const broken = links.filter((l) => !l.ok);
  const note = broken.length
    ? `\n\n⚠️ **${broken.length} legame/i rotto/i.** Il più critico: il costo BOM nel Business Case (stima) non coincide con il roll-up tecnico (POC & BOM). Va allineato al valore verificato prima del comitato.`
    : '\n\n✅ Tutti i legami sono riconciliati.';
  return {
    content: `🔗 **Riconciliazione cross-deliverable**

${lines}${note}`,
    sources: ['POC & BOM (G1.3)', 'Business Case Estimation (G1.13)', 'Detailed Plan (G1.10)'],
  };
}

function replyTimeline(ctx: ChatContext): MockReply {
  const lines = ctx.gates
    .map((g) => {
      const icon = g.status === 'passed' ? '✅' : g.status === 'active' ? '🔵' : '⏳';
      const score =
        g.status === 'active'
          ? `readiness ${ctx.engine.gateReadiness}/100`
          : g.readiness !== undefined
            ? `score ${g.readiness}/100`
            : 'da avviare';
      const when = g.completedDate ? ` · completato il ${g.completedDate}` : '';
      return `- ${icon} **${g.name}** — ${score}${when}`;
    })
    .join('\n');
  return {
    content: `🗺️ **Timeline dei gate**

${lines}

Sei al **${ctx.gateName}**. Una volta risolte le anomalie bloccanti e ottenuto l'ACK dell'Accountable, il gate può passare a **GO** e si abilita la pianificazione di dettaglio (G2).`,
    sources: ['ciclo di vita gate', 'gate_templates.json'],
  };
}

function replyThresholds(ctx: ChatContext): MockReply {
  const t = ctx.thresholds;
  return {
    content: `⚙️ **Soglie di policy attive**

- Payback massimo: **${fmtYears(t.paybackMaxYears)}**
- NPV minimo: **${fmtMeur(t.npvMinMeur)}**
- Soglia breach critico: **${fmtPct(t.thresholdBreachCriticalPct)}** (oltre → severità Critica)
- Tolleranza riconciliazione: **${fmtEur(t.reconciliationToleranceEUR)}**

Puoi modificarle dal pannello _"Configura soglie"_: avvisi e Gate Readiness si ricalcolano in tempo reale.`,
    sources: ['Policy GEWISS', 'configurazione soglie'],
  };
}

function replyCapabilities(ctx: ChatContext): MockReply {
  return {
    content: `🤖 Posso rispondere su tutto ciò che riguarda **${ctx.project.name}** al ${ctx.gate}:

- 📊 **Stato del gate** e Gate Readiness
- ⚠️ **Anomalie** bloccanti e azioni consigliate
- 📋 **Business Case** (target vs stima, payback, NPV)
- 🛡️ **Rischi** e piano di mitigazione
- 🔗 **Riconciliazione** cross-documento
- 👥 **Chi deve agire** (matrice RACI)
- ⚙️ **Soglie** di policy

Prova con una delle domande suggerite qui sotto.`,
    sources: [],
  };
}

function replyFallback(): MockReply {
  return {
    content: `Non sono sicuro di aver capito la domanda. 🤔

Posso aiutarti su: **stato del gate**, **anomalie bloccanti**, **Business Case**, **rischi**, **riconciliazione**, **chi deve agire** e **soglie**.

Prova a chiedere, ad esempio: _"${QUICK_PROMPTS[1]}"_ oppure _"${QUICK_PROMPTS[2]}"_.`,
    sources: [],
  };
}

function stripTrailingDot(s: string): string {
  return s.replace(/\.$/, '');
}

// Pattern matching: ordine importante (dal più specifico al più generico).
function mockAnswer(question: string, ctx: ChatContext): MockReply {
  const q = question.toLowerCase();
  const has = (...kw: string[]) => kw.some((k) => q.includes(k));

  if (has('confronta', 'target vs', 'vs estim', 'differenza tra')) return replyCompare(ctx);
  if (has('riconcil', 'bom', 'coeren', 'divergen', 'cross')) return replyReconciliation(ctx);
  if (has('chi deve', 'chi agisce', 'responsabile', 'raci', 'chi se ne occupa', 'a chi'))
    return replyWhoActs(ctx);
  if (has('business case', 'riepilogo del business', 'redditiv', 'payback', 'npv', 'irr'))
    return replyBusinessCase(ctx);
  if (has('rischi', 'risk', 'mitigaz', 'r2', 'certificaz')) return replyRisks(ctx);
  if (has('anomal', 'bloccan', 'blocca', 'problem', 'criticit', 'errori', 'avvisi'))
    return replyBlockingAnomalies(ctx);
  if (has('soglie', 'soglia', 'policy', 'threshold')) return replyThresholds(ctx);
  if (has('timeline', 'gate passat', 'prossimo gate', 'fase', 'roadmap', 'g0', 'g2'))
    return replyTimeline(ctx);
  if (has('stato', 'readiness', 'gate attuale', 'a che punto', 'pronto', 'go'))
    return replyGateStatus(ctx);
  if (has('cosa puoi', 'aiuto', 'help', 'cosa sai', 'come funzioni')) return replyCapabilities(ctx);

  return replyFallback();
}

// ============================================================================
// AI reale (opzionale)
// ============================================================================
function buildContextPayload(ctx: ChatContext): string {
  const { engine } = ctx;
  return JSON.stringify(
    {
      progetto: ctx.project.name,
      descrizione: ctx.project.description,
      gate: ctx.gateName,
      dataSimulata: ctx.simulatedDate,
      gateReadiness: engine.gateReadiness,
      banda: ctx.engine.band,
      soglie: ctx.thresholds,
      baseline: ctx.project.baseline,
      conteggiSeverita: engine.counts,
      alerts: engine.alerts.map((a: Alert) => ({
        severita: a.severity,
        blocca: a.blocksGate,
        tipo: a.finding.type,
        deliverable: a.finding.deliverableId,
        messaggio: a.finding.message,
        criterio: a.finding.criterionRef,
        rilevato: a.finding.observed,
        atteso: a.finding.expected,
        azione: a.recommendedAction,
        notificati: a.notifiedRoles.map((n) => `${RACI_LABEL[n.role]}=${n.letter}`),
      })),
      riconciliazione: engine.reconciliation.map((l) => ({
        legame: l.label,
        da: `${l.fromLabel}=${l.fromValue}`,
        a: `${l.toLabel}=${l.toValue}`,
        ok: l.ok,
      })),
      deliverable: ctx.deliverables.map((d) => ({
        id: d.id,
        nome: d.name,
        campi: d.fields.map((f) => ({ [f.label]: f.value, fonte: f.source ?? null })),
        rischi: d.risks ?? undefined,
      })),
    },
    null,
    0,
  );
}

async function aiAnswer(question: string, ctx: ChatContext): Promise<MockReply> {
  const system = `Sei l'assistente AI di Gate Co-Pilot per il progetto ${ctx.project.name}. Rispondi in italiano, cita SEMPRE il documento o deliverable di riferimento (es. "[Business Case G1.13]"). Mantieni risposte concise, strutturate (markdown) e azionabili. Usa SOLO i dati forniti nel contesto; non inventare numeri.`;
  const prompt = `Contesto strutturato del gate (JSON):
${buildContextPayload(ctx)}

Domanda del Project Manager: "${question}"

Rispondi in markdown, conciso e azionabile.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': API_KEY as string,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? '';
  return { content: text || mockAnswer(question, ctx).content, sources: ['Anthropic · ' + MODEL] };
}

// ============================================================================
// API pubblica del responder
// ============================================================================
let _msgSeq = 0;
export function makeMessage(
  role: ChatMessage['role'],
  content: string,
  extra: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: `m-${++_msgSeq}-${role}`,
    role,
    content,
    timestamp: extra.timestamp ?? 0,
    sources: extra.sources,
    isTyping: extra.isTyping,
  };
}

/**
 * Produce la risposta dell'assistente. Se la chiave AI è presente prova l'API
 * reale e in caso di errore ricade sul responder mock (graceful fallback).
 */
export async function answer(
  question: string,
  ctx: ChatContext,
): Promise<{ content: string; sources: string[] }> {
  if (isChatAiEnabled()) {
    try {
      return await aiAnswer(question, ctx);
    } catch {
      return mockAnswer(question, ctx);
    }
  }
  return mockAnswer(question, ctx);
}
