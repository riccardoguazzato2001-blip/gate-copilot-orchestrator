// Formattazioni numeriche localizzate (it-IT) riusabili in tutta l'app.

export const fmtMeur = (n: number) =>
  `${n.toLocaleString('it-IT', { maximumFractionDigits: 2 })} M€`;

export const fmtYears = (n: number) =>
  `${n.toLocaleString('it-IT', { maximumFractionDigits: 2 })} anni`;

export const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

export const fmtEur = (n: number) =>
  `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export const fmtInt = (n: number) => n.toLocaleString('it-IT');

// delta con segno esplicito, es. "+0,3" / "−0,2"
export const fmtDelta = (n: number, digits = 2) => {
  const v = n.toLocaleString('it-IT', { maximumFractionDigits: digits });
  return n > 0 ? `+${v}` : n < 0 ? v.replace('-', '−') : v;
};
