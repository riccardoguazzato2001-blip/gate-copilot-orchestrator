// ============================================================================
// Gate Co-Pilot — AI testuale OPZIONALE (dietro flag)
//
// Se è presente VITE_ANTHROPIC_API_KEY nel .env, le notifiche per ruolo RACI
// vengono riformulate con l'Anthropic Messages API (modello claude-sonnet-4-6),
// mantenendo lo stesso significato. Se la chiave manca → testo da template.
//
// La demo funziona al 100% SENZA chiave: questo modulo è additivo.
// ============================================================================

import type { Alert, RoleNotification } from '../types';
import { RACI_LABEL, RACI_LETTER_LABEL } from '../types';

// `import.meta.env` esiste in Vite; il guard evita crash in contesti non-Vite (es. test SSR).
const API_KEY = import.meta.env?.VITE_ANTHROPIC_API_KEY as string | undefined;
const MODEL = 'claude-sonnet-4-6';

export function isAiEnabled(): boolean {
  return typeof API_KEY === 'string' && API_KEY.length > 0;
}

/**
 * Riformula i messaggi delle notifiche di un alert con l'AI.
 * Ritorna le stesse RoleNotification con `message` riscritto. In caso di errore
 * o chiave assente, ritorna i template invariati (graceful fallback).
 */
export async function enhanceNotifications(alert: Alert): Promise<RoleNotification[]> {
  if (!isAiEnabled()) return alert.notifiedRoles;

  const f = alert.finding;
  const roleList = alert.notifiedRoles
    .map(
      (n) =>
        `- ${RACI_LABEL[n.role]} (${RACI_LETTER_LABEL[n.letter]}, canale ${n.channel}): bozza = "${n.message}"`,
    )
    .join('\n');

  const prompt = `Sei un assistente di governance dei decision gate in un'azienda manifatturiera (GEWISS).
Riformula in italiano professionale e conciso le seguenti notifiche, una per ruolo RACI, MANTENENDO lo stesso significato, la stessa severità e le stesse azioni. Tono adatto al ruolo (Accountable: decisione/firma; Responsible: correzione; Consulted: parere; Informed: FYI).

Contesto anomalia:
- Severità: ${alert.severity}
- Deliverable: ${f.deliverableId}
- Problema: ${f.message}
- Criterio violato: ${f.criterionRef}
- Azione consigliata: ${alert.recommendedAction}

Notifiche da riformulare:
${roleList}

Rispondi SOLO con un array JSON di stringhe, una per notifica nell'ordine dato, senza altro testo.`;

  try {
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
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text: string = data?.content?.[0]?.text ?? '';
    const match = text.match(/\[[\s\S]*\]/);
    const arr: string[] = match ? JSON.parse(match[0]) : [];
    if (!Array.isArray(arr) || arr.length !== alert.notifiedRoles.length) {
      return alert.notifiedRoles;
    }
    return alert.notifiedRoles.map((n, i) => ({ ...n, message: arr[i] ?? n.message }));
  } catch {
    // graceful fallback ai template
    return alert.notifiedRoles;
  }
}
