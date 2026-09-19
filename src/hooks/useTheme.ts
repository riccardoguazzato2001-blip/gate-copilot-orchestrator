// ============================================================================
// useTheme — gestione tema dark/light.
// Dark è il default (più "wow" per la demo). La scelta viene persistita in
// localStorage; lo stato iniziale è già applicato a <html> dallo script no-FOUC
// in index.html, quindi qui ci limitiamo a leggerlo e sincronizzarlo.
// ============================================================================

import { useCallback, useState } from 'react';

export type Theme = 'dark' | 'light';

function currentDomTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentDomTheme);

  const apply = useCallback((next: Theme) => {
    const root = document.documentElement;
    if (next === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem('gc-theme', next);
    } catch {
      /* storage non disponibile: ignora */
    }
    setTheme(next);
  }, []);

  const toggle = useCallback(() => {
    apply(currentDomTheme() === 'dark' ? 'light' : 'dark');
  }, [apply]);

  // Lo stato iniziale è già letto dal DOM nell'initializer di useState (la classe
  // .dark è applicata prima del paint dallo script no-FOUC in index.html).

  return { theme, toggle, setTheme: apply, isDark: theme === 'dark' };
}
