// ============================================================================
// Gate Co-Pilot — ROUTING RACI delle notifiche
//
// Per il deliverable a cui il finding si riferisce, guarda la matrice RACI e
// instrada l'avviso secondo severità:
//
//   Critical / High → Accountable (direct, ACK bloccante) + Responsible (direct,
//                     action) + Consulted (dashboard) + Informed (digest)
//   Medium          → Responsible (dashboard, action) + Accountable (dashboard,
//                     non bloccante) + Consulted (dashboard)
//   Info            → solo digest (Accountable)
//
// Template testo per ruolo (riformulabili via AI se presente la chiave):
//   Accountable: «[Severità] su {deliverable}: {problema}. Come Accountable devi
//                 validare prima del gate. Azione: {azione}.»
//   Responsible: «Devi correggere {deliverable}: {problema}. Criterio: "{criterio}".
//                 Azione: {azione}.»
//   Consulted:   «Richiesto il tuo parere su {deliverable} riguardo: {problema}.»
//   Informed:    «FYI: {deliverable} ha un'anomalia {severità}; in gestione da {owner}.»
// ============================================================================

import {
  RACI_LABEL,
  RACI_ORDER,
  SEVERITY_LABEL,
} from '../types';
import type {
  Deliverable,
  Finding,
  NotificationChannel,
  RaciLetter,
  RaciRole,
  RoleNotification,
  Severity,
} from '../types';
import type { Classification } from './severity';

// Trova i ruoli che hanno una certa lettera sul deliverable.
function rolesWithLetter(d: Deliverable, letter: RaciLetter): RaciRole[] {
  return RACI_ORDER.filter((r) => d.raci[r] === letter);
}

function ownerLabel(d: Deliverable): string {
  const r = rolesWithLetter(d, 'R')[0] ?? rolesWithLetter(d, 'A')[0];
  return r ? RACI_LABEL[r] : 'Project Manager';
}

// --- Template testo per ruolo ----------------------------------------------
function messageFor(
  letter: RaciLetter,
  d: Deliverable,
  finding: Finding,
  severity: Severity,
  action: string,
): string {
  const deliv = `${d.name} (${d.id})`;
  const sev = SEVERITY_LABEL[severity];
  switch (letter) {
    case 'A':
      return `[${sev}] su ${deliv}: ${finding.message} Come Accountable devi validare prima del gate. Azione: ${action}`;
    case 'R':
      return `Devi correggere ${deliv}: ${finding.message} Criterio: "${finding.criterionRef}". Azione: ${action}`;
    case 'C':
      return `Richiesto il tuo parere su ${deliv} riguardo: ${finding.message}`;
    case 'I':
      return `FYI: ${deliv} ha un'anomalia ${sev}; in gestione da ${ownerLabel(d)}.`;
  }
}

function pushRole(
  out: RoleNotification[],
  d: Deliverable,
  role: RaciRole,
  letter: RaciLetter,
  channel: NotificationChannel,
  blocking: boolean,
  finding: Finding,
  severity: Severity,
  action: string,
) {
  out.push({
    role,
    letter,
    channel,
    blocking,
    message: messageFor(letter, d, finding, severity, action),
  });
}

export interface RoutingResult {
  notifiedRoles: RoleNotification[];
  recommendedAction: string;
}

export function routeAlert(
  finding: Finding,
  classification: Classification,
  deliverable: Deliverable,
): RoutingResult {
  const action =
    finding.recommendedAction ?? 'Rivedere il deliverable e riportarlo a conformità.';
  const sev = classification.severity;
  const out: RoleNotification[] = [];

  const accountables = rolesWithLetter(deliverable, 'A');
  const responsibles = rolesWithLetter(deliverable, 'R');
  const consulted = rolesWithLetter(deliverable, 'C');
  const informed = rolesWithLetter(deliverable, 'I');

  if (sev === 'Critical' || sev === 'High') {
    // Accountable: notifica diretta con acknowledgement bloccante + banner
    for (const r of accountables)
      pushRole(out, deliverable, r, 'A', 'direct', true, finding, sev, action);
    // Responsible: action item diretto
    for (const r of responsibles)
      pushRole(out, deliverable, r, 'R', 'direct', false, finding, sev, action);
    // Consulted: informato in dashboard
    for (const r of consulted)
      pushRole(out, deliverable, r, 'C', 'dashboard', false, finding, sev, action);
    // Informed: incluso nel digest
    for (const r of informed)
      pushRole(out, deliverable, r, 'I', 'digest', false, finding, sev, action);
  } else if (sev === 'Medium') {
    // Responsible: action in dashboard
    for (const r of responsibles)
      pushRole(out, deliverable, r, 'R', 'dashboard', false, finding, sev, action);
    // Accountable: dashboard, non bloccante
    for (const r of accountables)
      pushRole(out, deliverable, r, 'A', 'dashboard', false, finding, sev, action);
    // Consulted se pertinente
    for (const r of consulted)
      pushRole(out, deliverable, r, 'C', 'dashboard', false, finding, sev, action);
  } else {
    // Info: solo digest all'Accountable
    for (const r of accountables)
      pushRole(out, deliverable, r, 'A', 'digest', false, finding, sev, action);
  }

  return { notifiedRoles: out, recommendedAction: action };
}
