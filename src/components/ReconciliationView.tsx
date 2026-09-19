// ============================================================================
// ReconciliationView — schermata E: legami cross-deliverable (v2).
// REDESIGN: i legami non sono più una lista di catene ma un MINI-GRAFO a nodi
// e archi (SVG inline). Ogni nodo è un deliverable (etichetta + valore in
// font-mono); ogni arco è un legame valore→valore. Arco verde (#10b981) se i
// valori coincidono, rosso (#f43f5e) se divergono. Lungo l'arco scorre un
// flusso animato (stroke-dasharray + stroke-dashoffset, loop GPU-friendly).
// Sull'arco rotto un badge mostra i due valori in conflitto.
// Mai solo colore: sotto il grafo resta una sintesi testuale accessibile per
// ogni legame (icone Link2/Unlink + Check/X + testo "riconciliato"/"rotto").
// Flusso monte→valle: BOM (G1.3) → Estimation (G1.13) → Capex/Opex (G1.10).
// ============================================================================

import { ArrowRight, Check, GitMerge, Link2, Unlink, X } from 'lucide-react';
import type { ReconciliationLink } from '../types';

export interface ReconciliationViewProps {
  links: ReconciliationLink[];
}

// Priorità di ordinamento per suggerire il flusso BOM → Estimation → Capex/Opex.
// Si basa sull'id sorgente del deliverable; numeri più bassi = più "a monte".
const FLOW_RANK: Record<string, number> = {
  'G1.3': 0, // BOM
  'G1.13': 1, // Estimation
  'G1.10': 2, // Capex/Opex
};

function rankOf(id: string): number {
  return FLOW_RANK[id] ?? 50;
}

// --- Modello del grafo ------------------------------------------------------
// Un nodo del flusso: un deliverable con il/i valore/i che espone su un legame.
interface GraphNode {
  id: string;
  docLabel: string;
  value: string; // valore mostrato sul nodo (per quel punto del flusso)
  conflict: boolean; // valore in conflitto su un legame entrante rotto
}

interface GraphEdge {
  link: ReconciliationLink;
  fromIndex: number;
  toIndex: number;
}

// Deriva una sequenza di nodi a partire dai legami ordinati monte→valle.
// I legami condividono i nodi (toId di uno = fromId del successivo): li
// deduplichiamo così il grafo resta una catena lineare leggibile.
function buildGraph(ordered: ReconciliationLink[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const indexById = new Map<string, number>();

  const ensureNode = (
    id: string,
    docLabel: string,
    value: string,
  ): number => {
    const existing = indexById.get(id);
    if (existing !== undefined) {
      // Aggiorna il valore se non ancora impostato (preserva la prima fonte).
      return existing;
    }
    const idx = nodes.length;
    indexById.set(id, idx);
    nodes.push({ id, docLabel, value, conflict: false });
    return idx;
  };

  for (const link of ordered) {
    const conflict = !link.ok && link.fromValue !== link.toValue;
    const fromIndex = ensureNode(link.fromId, link.fromLabel, link.fromValue);
    const toIndex = ensureNode(link.toId, link.toLabel, link.toValue);
    // Il nodo a valle eredita lo stato di conflitto del legame entrante.
    if (conflict) nodes[toIndex].conflict = true;
    edges.push({ link, fromIndex, toIndex });
  }

  return { nodes, edges };
}

// --- Geometria SVG ----------------------------------------------------------
const NODE_W = 168;
const NODE_H = 76;
const GAP_X = 96; // spazio orizzontale tra i nodi (ospita l'arco + badge)
const PAD = 16; // padding interno al viewBox
const FLOW_TOP = PAD;

/** Sintesi testuale accessibile di un singolo legame (mai solo-colore). */
function LinkSummaryRow({ link }: { link: ReconciliationLink }) {
  const StateIcon = link.ok ? Link2 : Unlink;
  const BadgeIcon = link.ok ? Check : X;
  return (
    <li
      className={`flex flex-col gap-1.5 rounded-xl border px-3.5 py-3 transition-colors duration-200 sm:flex-row sm:items-center sm:justify-between ${
        link.ok
          ? 'border-emerald-200/70 bg-emerald-50/50 hover:border-emerald-300 dark:border-emerald-400/20 dark:bg-emerald-400/5 dark:hover:border-emerald-400/40'
          : 'border-rose-200/70 bg-rose-50/50 hover:border-rose-300 dark:border-rose-400/25 dark:bg-rose-400/5 dark:hover:border-rose-400/45'
      }`}
      aria-label={`${link.label}: ${link.fromLabel} ${link.fromValue} verso ${link.toLabel} ${link.toValue} — ${
        link.ok ? 'riconciliato' : 'valori divergenti'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
            link.ok
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300'
          }`}
        >
          <StateIcon size={15} strokeWidth={2.2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
            {link.label}
          </p>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
            {link.fromLabel}{' '}
            <ArrowRight
              size={11}
              strokeWidth={2.4}
              className="inline align-[-1px] text-slate-400 dark:text-slate-500"
              aria-hidden
            />{' '}
            {link.toLabel}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 pl-9 sm:pl-0">
        {!link.ok && (
          <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-rose-700 dark:text-rose-300">
            <span className="line-through decoration-rose-400 decoration-2">
              {link.toValue}
            </span>
            <span aria-hidden>≠</span>
            <span>{link.fromValue}</span>
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
            link.ok
              ? 'bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/30'
              : 'bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-400/15 dark:text-rose-300 dark:ring-rose-400/35'
          }`}
        >
          <BadgeIcon size={11} strokeWidth={2.8} aria-hidden />
          {link.ok ? 'riconciliato' : 'rotto'}
        </span>
      </div>
    </li>
  );
}

export function ReconciliationView({ links }: ReconciliationViewProps) {
  const ordered = [...links].sort(
    (a, b) =>
      rankOf(a.fromId) - rankOf(b.fromId) ||
      rankOf(a.toId) - rankOf(b.toId) ||
      a.label.localeCompare(b.label, 'it'),
  );

  const total = ordered.length;
  const okCount = ordered.filter((l) => l.ok).length;
  const brokenCount = total - okCount;

  const { nodes, edges } = buildGraph(ordered);

  // Dimensioni del viewBox in funzione del numero di nodi.
  const svgW = PAD * 2 + nodes.length * NODE_W + Math.max(0, nodes.length - 1) * GAP_X;
  const svgH = FLOW_TOP + NODE_H + 56; // spazio sotto per i badge dei conflitti
  const nodeY = FLOW_TOP;
  const edgeY = nodeY + NODE_H / 2;

  const xOfNode = (i: number) => PAD + i * (NODE_W + GAP_X);

  return (
    <section className="gc-surface gc-fade-up rounded-2xl p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-violet-500/15 text-blue-600 ring-1 ring-blue-500/20 dark:text-blue-300 dark:ring-blue-400/20"
            aria-hidden
          >
            <GitMerge size={20} strokeWidth={2.2} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Riconciliazione cross-deliverable
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              I numeri devono coincidere lungo il flusso tra documenti
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-2 text-xs font-medium"
          aria-label={`${total} legami, ${okCount} riconciliati, ${brokenCount} rotti`}
        >
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-white/5 dark:text-slate-300">
            <span className="font-mono tabular-nums">{total}</span> legami
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25">
            <Check size={12} strokeWidth={2.8} aria-hidden />
            <span className="font-mono tabular-nums">{okCount}</span> riconciliati
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ring-1 ${
              brokenCount > 0
                ? 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/30'
                : 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10'
            }`}
          >
            <X size={12} strokeWidth={2.8} aria-hidden />
            <span className="font-mono tabular-nums">{brokenCount}</span> rotti
          </span>
        </div>
      </header>

      {ordered.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-400">
          Nessun legame da riconciliare.
        </p>
      ) : (
        <>
          {/* ─── Mini-grafo a nodi e archi (SVG inline) ───
              Decorativo/visivo: la versione testuale accessibile è sotto.
              Su mobile lo scroll orizzontale evita la compressione dei nodi. */}
          <div
            className="gc-inset mt-5 overflow-x-auto rounded-xl p-4"
            role="img"
            aria-label={`Grafo di riconciliazione: ${nodes
              .map((n) => `${n.docLabel} ${n.value}`)
              .join(' collegato a ')}. ${
              brokenCount > 0
                ? `${brokenCount} legami rotti su ${total}.`
                : 'Tutti i legami sono riconciliati.'
            }`}
          >
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              width={svgW}
              height={svgH}
              className="block max-w-none"
              aria-hidden
            >
              <defs>
                {/* Marker freccia per ogni tono */}
                <marker
                  id="recoArrowOk"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill="#10b981" />
                </marker>
                <marker
                  id="recoArrowBroken"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="7"
                  markerHeight="7"
                  orient="auto-start-reverse"
                >
                  <path d="M0,0 L10,5 L0,10 z" fill="#f43f5e" />
                </marker>
              </defs>

              {/* Archi (sotto i nodi) */}
              {edges.map((edge) => {
                const x1 = xOfNode(edge.fromIndex) + NODE_W;
                const x2 = xOfNode(edge.toIndex);
                const ok = edge.link.ok;
                const color = ok ? '#10b981' : '#f43f5e';
                const midX = (x1 + x2) / 2;
                return (
                  <g key={edge.link.id}>
                    {/* Traccia di base (tenue) */}
                    <line
                      x1={x1}
                      y1={edgeY}
                      x2={x2 - 9}
                      y2={edgeY}
                      stroke={color}
                      strokeOpacity={0.28}
                      strokeWidth={6}
                      strokeLinecap="round"
                    />
                    {/* Flusso animato: dash che scorre lungo l'arco (loop) */}
                    <line
                      x1={x1}
                      y1={edgeY}
                      x2={x2 - 9}
                      y2={edgeY}
                      stroke={color}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray="10 14"
                      markerEnd={`url(#${ok ? 'recoArrowOk' : 'recoArrowBroken'})`}
                      style={{
                        filter: `drop-shadow(0 0 4px ${color}66)`,
                        animation: `${ok ? 'recoFlowOk' : 'recoFlowBroken'} 1.1s linear infinite`,
                      }}
                    />
                    {/* Badge di conflitto sull'arco rotto: due valori divergenti */}
                    {!ok && edge.link.fromValue !== edge.link.toValue && (
                      <g transform={`translate(${midX}, ${edgeY + NODE_H / 2 + 8})`}>
                        <rect
                          x={-58}
                          y={0}
                          width={116}
                          height={34}
                          rx={9}
                          className="fill-rose-50 stroke-rose-300 dark:fill-rose-950/80 dark:stroke-rose-400/50"
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={14}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={700}
                          fontFamily="JetBrains Mono, monospace"
                          className="fill-rose-700 dark:fill-rose-300"
                          style={{ textDecoration: 'line-through' }}
                        >
                          {edge.link.toValue}
                        </text>
                        <text
                          x={0}
                          y={28}
                          textAnchor="middle"
                          fontSize={11}
                          fontWeight={700}
                          fontFamily="JetBrains Mono, monospace"
                          className="fill-rose-600 dark:fill-rose-200"
                        >
                          ≠ {edge.link.fromValue}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Nodi (deliverable) */}
              {nodes.map((node, i) => {
                const x = xOfNode(i);
                const broken = node.conflict;
                const stroke = broken ? '#f43f5e' : '#10b981';
                const rectClass = broken
                  ? 'fill-rose-50 stroke-rose-400 dark:fill-rose-500/10 dark:stroke-rose-400/60'
                  : 'fill-emerald-50 stroke-emerald-400 dark:fill-emerald-500/10 dark:stroke-emerald-400/60';
                const idClass = broken
                  ? 'fill-rose-600 dark:fill-rose-300'
                  : 'fill-emerald-600 dark:fill-emerald-300';
                const valueClass = broken
                  ? 'fill-rose-700 dark:fill-rose-200'
                  : 'fill-emerald-700 dark:fill-emerald-200';
                return (
                  <g key={node.id} transform={`translate(${x}, ${nodeY})`}>
                    <rect
                      x={0}
                      y={0}
                      width={NODE_W}
                      height={NODE_H}
                      rx={14}
                      strokeWidth={1.5}
                      className={rectClass}
                      style={{
                        filter: `drop-shadow(0 4px 10px ${stroke}33)`,
                      }}
                    />
                    {/* Pallino di stato (in alto a sinistra) */}
                    <circle cx={16} cy={16} r={4} fill={stroke} />
                    {/* Id deliverable */}
                    <text
                      x={28}
                      y={20}
                      fontSize={11}
                      fontWeight={700}
                      fontFamily="JetBrains Mono, monospace"
                      className={idClass}
                    >
                      {node.id}
                    </text>
                    {/* Etichetta documento */}
                    <text
                      x={14}
                      y={42}
                      fontSize={11}
                      className="fill-slate-600 dark:fill-slate-300"
                    >
                      {node.docLabel.length > 22
                        ? `${node.docLabel.slice(0, 21)}…`
                        : node.docLabel}
                    </text>
                    {/* Valore in mono */}
                    <text
                      x={14}
                      y={62}
                      fontSize={14}
                      fontWeight={700}
                      fontFamily="JetBrains Mono, monospace"
                      className={valueClass}
                    >
                      {node.value}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* ─── Sintesi testuale accessibile (non solo-colore) ─── */}
          <ul className="mt-4 space-y-2.5" aria-label="Sintesi dei legami di riconciliazione">
            {ordered.map((link) => (
              <LinkSummaryRow key={link.id} link={link} />
            ))}
          </ul>
        </>
      )}

      {/* Keyframes locali per il flusso lungo gli archi (solo transform-free:
          anima stroke-dashoffset, eccezione ammessa su SVG). */}
      <style>{`
        @keyframes recoFlowOk { to { stroke-dashoffset: -24; } }
        @keyframes recoFlowBroken { to { stroke-dashoffset: 24; } }
        @media (prefers-reduced-motion: reduce) {
          [style*="recoFlowOk"], [style*="recoFlowBroken"] { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
