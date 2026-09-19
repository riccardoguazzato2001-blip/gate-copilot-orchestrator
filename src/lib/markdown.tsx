// ============================================================================
// Mini-renderer Markdown → React (zero dipendenze).
// Supporta ciò che produce il chatbot: titoli (#/##/###), grassetto **x**,
// codice inline `x`, liste puntate (con un livello di annidamento a 2 spazi),
// tabelle GitHub (| a | b |), citazioni (>) e paragrafi.
// Volutamente minimale e robusto: niente HTML arbitrario, niente eval.
// ============================================================================

import type { ReactNode } from 'react';

// --- inline: **bold** e `code` ---------------------------------------------
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // split tenendo i delimitatori **...** e `...`
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(regex);
  parts.forEach((part, i) => {
    if (!part) return;
    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>,
      );
    } else if (part.startsWith('`') && part.endsWith('`')) {
      nodes.push(
        <code
          key={`${keyPrefix}-c-${i}`}
          className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[0.85em] text-blue-700 dark:bg-white/10 dark:text-blue-300"
        >
          {part.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(part);
    }
  });
  return nodes;
}

interface TableBlock {
  header: string[];
  rows: string[][];
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());
}

export function renderMarkdown(md: string): ReactNode {
  const lines = md.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // riga vuota
    if (line.trim() === '') {
      i++;
      continue;
    }

    // tabella: una riga con | seguita da una riga separatrice ---
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\s*\|?[\s:-]+\|/.test(lines[i + 1])) {
      const header = splitRow(line);
      const tbl: TableBlock = { header, rows: [] };
      i += 2; // salta header + separatore
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tbl.rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="my-2 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                {tbl.header.map((h, hi) => (
                  <th
                    key={hi}
                    className="border-b border-slate-300 px-2 py-1.5 text-left font-semibold text-slate-600 dark:border-white/15 dark:text-slate-300"
                  >
                    {renderInline(h, `th-${key}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tbl.rows.map((r, ri) => (
                <tr key={ri} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                  {r.map((c, ci) => (
                    <td
                      key={ci}
                      className="px-2 py-1.5 align-top tabular-nums text-slate-700 dark:text-slate-200"
                    >
                      {renderInline(c, `td-${key}-${ri}-${ci}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // titoli
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls =
        level === 1
          ? 'text-base font-bold'
          : level === 2
            ? 'text-sm font-bold'
            : 'text-sm font-semibold';
      blocks.push(
        <p key={key++} className={`${cls} mt-1 text-slate-900 dark:text-white`}>
          {renderInline(h[2], `h-${key}`)}
        </p>,
      );
      i++;
      continue;
    }

    // citazione
    if (line.trim().startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-1 border-l-2 border-blue-400/60 pl-3 text-xs italic text-slate-500 dark:text-slate-400"
        >
          {renderInline(quote.join(' '), `q-${key}`)}
        </blockquote>,
      );
      continue;
    }

    // liste puntate (con un livello di annidamento)
    if (/^\s*-\s+/.test(line)) {
      const items: { text: string; nested: boolean }[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        const nested = /^\s{2,}-\s+/.test(lines[i]);
        items.push({ text: lines[i].replace(/^\s*-\s+/, ''), nested });
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-1 flex flex-col gap-1 text-sm">
          {items.map((it, ii) => (
            <li
              key={ii}
              className={`flex gap-1.5 ${it.nested ? 'ml-4 text-[0.92em] text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}
            >
              <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-blue-400" />
              <span>{renderInline(it.text, `li-${key}-${ii}`)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // paragrafo
    blocks.push(
      <p key={key++} className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">
        {renderInline(line, `p-${key}`)}
      </p>,
    );
    i++;
  }

  return <div className="flex flex-col gap-1.5">{blocks}</div>;
}
