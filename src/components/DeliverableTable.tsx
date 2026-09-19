// ============================================================================
// DeliverableTable — schermata C: tabella premium dei deliverable del gate.
// Ogni riga mostra anagrafica (nome · id · revisione), i 6 chip RACI (lettera
// sempre leggibile, mai solo colore) e i 4 mini-indicatori di check (P/C/T/R).
// La riga è cliccabile e navigabile da tastiera → onSelect(d.id). Quando la riga
// è selezionata si espande INLINE (accordion) un pannello di dettaglio con i
// campi del deliverable, la RACI completa e l'esito dei 4 check. Desktop-first,
// con scroll orizzontale su schermi piccoli.
// ============================================================================

import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight, ListChecks, Users, ClipboardCheck } from 'lucide-react';
import { RaciChip, RaciLegend } from './RaciChip';
import { CheckIndicator, CheckIndicatorRow } from './CheckIndicator';
import {
  RACI_ORDER,
  RACI_LABEL,
  RACI_LETTER_LABEL,
  CHECK_ORDER,
  CHECK_LABEL,
} from '../types';
import type {
  CheckType,
  Deliverable,
  DeliverableField,
  EngineResult,
  FindingStatus,
  RaciRole,
} from '../types';

interface DeliverableTableProps {
  deliverables: Deliverable[];
  matrix: EngineResult['matrix'];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

// Iniziali compatte dei ruoli per l'intestazione, allineate ai chip.
const RACI_SHORT: Record<RaciRole, string> = {
  PM: 'PM',
  Product: 'Prod',
  RnD: 'R&D',
  Finance: 'Fin',
  Lab: 'Lab',
  Quality: 'Qual',
};

// Etichetta leggibile dell'esito del singolo check, per il pannello di dettaglio.
const CHECK_STATUS_LABEL: Record<FindingStatus | 'na', string> = {
  pass: 'Superato',
  warn: 'Da verificare',
  fail: 'Non superato',
  na: 'Non applicabile',
};

const CHECK_STATUS_TONE: Record<FindingStatus | 'na', string> = {
  pass: 'text-emerald-700 dark:text-emerald-300',
  warn: 'text-amber-700 dark:text-amber-300',
  fail: 'text-rose-700 dark:text-rose-300',
  na: 'text-slate-500 dark:text-slate-400',
};

// Valore di un campo, con font-mono sui numeri e fallback per i mancanti.
function FieldValue({ field }: { field: DeliverableField }) {
  const isNumeric = typeof field.value === 'number';
  if (field.value === null || field.value === '') {
    return (
      <span className="text-sm font-medium italic text-slate-400 dark:text-slate-500">
        non fornito
      </span>
    );
  }
  return (
    <span
      className={`text-sm font-semibold text-slate-900 dark:text-slate-100 ${
        isNumeric ? 'font-mono tabular-nums' : ''
      }`}
    >
      {isNumeric
        ? (field.value as number).toLocaleString('it-IT', {
            maximumFractionDigits: 2,
          })
        : field.value}
      {field.unit && (
        <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
          {field.unit}
        </span>
      )}
    </span>
  );
}

// Titolo di sezione interno al pannello di dettaglio.
function DetailSectionTitle({
  icon: Icon,
  children,
}: {
  icon: typeof Users;
  children: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-200/70 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-400/20">
        <Icon size={13} strokeWidth={2.4} aria-hidden />
      </span>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {children}
      </h3>
    </div>
  );
}

// Pannello di dettaglio rivelato sotto la riga selezionata.
function DeliverableDetail({
  deliverable,
  statuses,
}: {
  deliverable: Deliverable;
  statuses: Partial<Record<CheckType, FindingStatus>>;
}) {
  return (
    <div className="gc-fade-up grid grid-cols-1 gap-4 p-4 pt-1 md:p-5 md:pt-2 lg:grid-cols-3">
      {/* Campi del deliverable */}
      <div className="gc-inset rounded-xl p-4 lg:col-span-1">
        <DetailSectionTitle icon={ListChecks}>Campi del dato</DetailSectionTitle>
        {deliverable.fields.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nessun campo strutturato.
          </p>
        ) : (
          <dl className="space-y-2.5">
            {deliverable.fields.map((f) => (
              <div
                key={f.key}
                className="flex flex-col gap-0.5 border-b border-slate-200/70 pb-2.5 last:border-b-0 last:pb-0 dark:border-white/5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {f.label}
                  </dt>
                  <dd className="text-right">
                    <FieldValue field={f} />
                  </dd>
                </div>
                {f.source !== undefined && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Fonte:{' '}
                    <span className="text-slate-500 dark:text-slate-400">
                      {f.source ?? 'non dichiarata'}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* RACI completa con etichette ruolo */}
      <div className="gc-inset rounded-xl p-4 lg:col-span-1">
        <DetailSectionTitle icon={Users}>Matrice RACI</DetailSectionTitle>
        <ul className="space-y-2">
          {RACI_ORDER.map((role) => {
            const letter = deliverable.raci[role];
            return (
              <li
                key={role}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2.5">
                  <RaciChip letter={letter} role={role} size="md" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {RACI_LABEL[role]}
                  </span>
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {RACI_LETTER_LABEL[letter]}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Dettaglio dei 4 check */}
      <div className="gc-inset rounded-xl p-4 lg:col-span-1">
        <DetailSectionTitle icon={ClipboardCheck}>
          Verifiche
        </DetailSectionTitle>
        <ul className="space-y-2">
          {CHECK_ORDER.map((t) => {
            const status = statuses[t];
            const key = (status ?? 'na') as FindingStatus | 'na';
            return (
              <li
                key={t}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2.5">
                  <CheckIndicator type={t} status={status} size="md" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {CHECK_LABEL[t]}
                  </span>
                </span>
                <span
                  className={`text-xs font-semibold ${CHECK_STATUS_TONE[key]}`}
                >
                  {CHECK_STATUS_LABEL[key]}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function DeliverableTable({
  deliverables,
  matrix,
  selectedId,
  onSelect,
}: DeliverableTableProps) {
  return (
    <section className="gc-surface overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Deliverable del gate
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {deliverables.length} deliverable · stato verifiche e responsabilità
            RACI
          </p>
        </div>
        <RaciLegend className="shrink-0" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-y border-slate-200/80 bg-slate-50/70 dark:border-white/10 dark:bg-white/5">
              <th
                scope="col"
                className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                Deliverable
              </th>
              <th scope="col" className="px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  {RACI_ORDER.map((role) => (
                    <span
                      key={role}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-[10px] font-medium text-slate-400 dark:text-slate-500"
                      title={RACI_LABEL[role]}
                    >
                      {RACI_SHORT[role]}
                    </span>
                  ))}
                </div>
              </th>
              <th scope="col" className="px-5 py-2.5">
                <div className="flex items-center gap-1.5">
                  {CHECK_ORDER.map((t) => (
                    <span
                      key={t}
                      className="inline-flex h-6 w-6 items-center justify-center text-[10px] font-medium text-slate-400 dark:text-slate-500"
                      title={CHECK_LABEL[t]}
                    >
                      {CHECK_LABEL[t].charAt(0)}
                    </span>
                  ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {deliverables.map((d, i) => {
              const selected = d.id === selectedId;
              const statuses = matrix[d.id] ?? {};
              const detailId = `deliverable-detail-${d.id}`;
              return (
                <Fragment key={d.id}>
                  <tr
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-expanded={selected}
                    aria-controls={detailId}
                    aria-label={`${
                      selected ? 'Chiudi' : 'Apri'
                    } dettaglio deliverable ${d.id} ${d.name}`}
                    onClick={() => onSelect(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(d.id);
                      }
                    }}
                    style={{ animationDelay: `${i * 45}ms` }}
                    className={`gc-fade-up group relative cursor-pointer border-b border-slate-100 outline-none transition-colors duration-200 dark:border-white/5 ${
                      selected
                        ? 'bg-blue-50/60 ring-1 ring-inset ring-blue-500/30 dark:bg-blue-500/[0.07] dark:ring-blue-400/20'
                        : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.04]'
                    } focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/60`}
                  >
                    <td className="px-5 py-3.5 align-middle">
                      <div className="flex items-start gap-2.5">
                        {/* Barra accent sinistra */}
                        <span
                          aria-hidden
                          className={`mt-0.5 h-9 w-1 shrink-0 origin-center rounded-full transition-all duration-300 ${
                            selected
                              ? 'scale-y-100 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]'
                              : 'scale-y-50 bg-transparent group-hover:scale-y-100 group-hover:bg-slate-300 dark:group-hover:bg-white/20'
                          }`}
                        />
                        {/* Chevron di apertura */}
                        <span
                          aria-hidden
                          className={`mt-1 shrink-0 text-slate-300 transition-transform duration-300 dark:text-slate-500 ${
                            selected
                              ? 'rotate-90 text-blue-500 dark:text-blue-400'
                              : 'group-hover:translate-x-0.5 group-hover:text-slate-400'
                          }`}
                        >
                          <ChevronRight size={16} strokeWidth={2.4} />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900 dark:text-slate-100">
                            {d.name}
                          </div>
                          <div className="mt-0.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                            {d.id} · {d.revision}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-3.5 align-middle">
                      <div className="flex items-center gap-1.5">
                        {RACI_ORDER.map((role) => (
                          <RaciChip
                            key={role}
                            letter={d.raci[role]}
                            role={role}
                            size="md"
                          />
                        ))}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 align-middle">
                      <CheckIndicatorRow statuses={statuses} size="md" />
                    </td>
                  </tr>

                  {/* Riga accordion: pannello di dettaglio inline */}
                  <tr
                    className={`border-b border-slate-100 dark:border-white/5 ${
                      selected
                        ? 'bg-blue-50/30 dark:bg-blue-500/[0.04]'
                        : 'border-b-0'
                    }`}
                  >
                    <td colSpan={3} className="p-0">
                      <div
                        id={detailId}
                        role="region"
                        aria-label={`Dettaglio deliverable ${d.name}`}
                        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
                        style={{
                          maxHeight: selected ? 720 : 0,
                          opacity: selected ? 1 : 0,
                        }}
                      >
                        {selected && (
                          <DeliverableDetail
                            deliverable={d}
                            statuses={statuses}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {deliverables.length === 0 && (
        <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Nessun deliverable da mostrare per questo gate.
        </div>
      )}
    </section>
  );
}
