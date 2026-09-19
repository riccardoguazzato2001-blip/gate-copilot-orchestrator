// ============================================================================
// useCountUp — anima un numero da 0 (o da un valore iniziale) fino al target.
// GPU-friendly: aggiorna solo testo, usa requestAnimationFrame con easing.
// Rispetta prefers-reduced-motion (salta direttamente al valore finale).
//
//   const value = useCountUp(45, { duration: 1100, decimals: 0 });
//   <span>{value}</span>
// ============================================================================

import { useEffect, useRef, useState } from 'react';

export interface CountUpOptions {
  duration?: number; // ms
  decimals?: number; // cifre decimali
  start?: number; // valore di partenza
  /** ritardo prima di avviare (per sincronizzarsi con lo stagger d'ingresso) */
  delay?: number;
  /** se false, mostra subito il target senza animare */
  enabled?: boolean;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function useCountUp(target: number, options: CountUpOptions = {}): number {
  const { duration = 1000, decimals = 0, start = 0, delay = 0, enabled = true } = options;
  const [value, setValue] = useState(enabled ? start : target);
  const frame = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      // Sincronizzazione legittima col valore finale (nessuna animazione).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(target);
      return;
    }

    const from = start;
    const to = target;
    let startTs: number | null = null;

    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const elapsed = ts - startTs;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);
      const next = from + (to - from) * eased;
      setValue(next);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setValue(to);
      }
    };

    timer.current = setTimeout(() => {
      frame.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [target, duration, start, delay, enabled]);

  return Number(value.toFixed(decimals));
}

/** Variante che ritorna una stringa già formattata in it-IT. */
export function useCountUpFormatted(
  target: number,
  options: CountUpOptions & { format?: (n: number) => string } = {},
): string {
  const { format, decimals = 0, ...rest } = options;
  const value = useCountUp(target, { ...rest, decimals });
  if (format) return format(value);
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
