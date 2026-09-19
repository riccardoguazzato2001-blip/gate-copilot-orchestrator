// ============================================================================
// RaciChip — chip RACI con la LETTERA sempre leggibile (mai solo il colore).
// Colori dal pack: A=red-600, R=amber-500, C=blue-500, I=slate-400.
// È volutamente distinto (quadrato piccolo con lettera) dai badge di severità
// (pillola con icona + testo) per evitare la collisione cromatica RACI↔severità.
// ============================================================================

import { RACI_LABEL, RACI_LETTER_LABEL } from '../types';
import type { RaciLetter, RaciRole } from '../types';

// I quadratini restano pieni e solidi: in dark aggiungiamo un leggero ring
// per staccarli dalle superfici scure e dare profondità, senza cambiare la
// semantica cromatica RACI.
const LETTER_STYLE: Record<RaciLetter, string> = {
  A: 'bg-red-600 text-white ring-1 ring-red-400/40 dark:bg-red-500 dark:ring-red-300/40',
  R: 'bg-amber-500 text-white ring-1 ring-amber-300/40 dark:bg-amber-500 dark:ring-amber-200/40',
  C: 'bg-blue-500 text-white ring-1 ring-blue-300/40 dark:bg-blue-500 dark:ring-blue-200/40',
  I: 'bg-slate-400 text-white ring-1 ring-slate-300/40 dark:bg-slate-500 dark:ring-white/20',
};

interface Props {
  letter: RaciLetter;
  role?: RaciRole;
  showRole?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function RaciChip({ letter, role, showRole = false, size = 'sm', className = '' }: Props) {
  const dim = size === 'sm' ? 'h-5 w-5 text-[11px]' : 'h-6 w-6 text-xs';
  const aria =
    (role ? `${RACI_LABEL[role]}: ` : '') + RACI_LETTER_LABEL[letter];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex ${dim} shrink-0 items-center justify-center rounded font-bold tabular-nums ${LETTER_STYLE[letter]}`}
        title={aria}
        aria-label={aria}
      >
        {letter}
      </span>
      {showRole && role && (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {RACI_LABEL[role]}
        </span>
      )}
    </span>
  );
}

// Legenda RACI riusabile
export function RaciLegend({ className = '' }: { className?: string }) {
  const items: RaciLetter[] = ['A', 'R', 'C', 'I'];
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {items.map((l) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <RaciChip letter={l} />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {RACI_LETTER_LABEL[l]}
          </span>
        </span>
      ))}
    </div>
  );
}
