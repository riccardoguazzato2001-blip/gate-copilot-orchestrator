# Gate Co-Pilot — Demo Runbook (la parte "show", ~2:45–3:00)

Sincronizzazione **parola ↔ schermo**: per ogni beat trovi *cosa fai col mouse*, *cosa appare*, *cosa dici* (IT + EN B1) e il *punto chiave*.
Caso: **New Energy Metering**, Gate **G1**. Stato iniziale engine: **45/100 · ROSSO "Non pronto"** — 1 Critica, 1 Alta, 2 Medie.

---

## 0. Setup prima di salire sul palco (30 sec)
- [ ] App avviata (`npm run dev`), browser a **tutto schermo** (F11), zoom 100–110%.
- [ ] **Tema scuro** attivo (default).
- [ ] Sei sulla **schermata iniziale** col bottone *"Scansiona cartella di rete"* (se hai già provato, premi **F5** per tornare allo stato vuoto).
- [ ] Soglie ai **valori default** (se hai toccato il drawer → *"Ripristina default"*).
- [ ] Chat **chiusa** (bolla blu in basso a destra).
- [ ] Funziona **100% offline**: non serve rete.

## Mappa dello schermo (dove puntare)
Dopo lo scan, dall'alto in basso:
- **Header** (in alto): badge *Gate Co-Pilot* · *Gate G1 · Feasibility* · titolo progetto · a destra l'**anello Gate Readiness** + etichetta banda + bottoni *tema* e *"Configura soglie"*.
- **Gate Timeline**: G0 (92) → **G1 attivo (45)** → G2.
- **Riga KPI** (5 card): Deliverable · Avvisi per severità · Riconciliazione · Payback · NPV.
- **Colonna sinistra**: Tabella deliverable → Business Case (target vs stima) → **Riconciliazione (grafo)**.
- **Colonna destra**: **Feed avvisi** → **Anteprima notifiche (RACI)**.
- **Bolla AI** fissa in basso a destra.

---

## BEAT 1 — Lo scan (≈25 sec)
**🖱 Azione:** clicca **"Scansiona cartella di rete"**.
**👁 Cosa appare:** barra di avanzamento con 4 messaggi (*Accesso alla cartella… → Analisi del Business Case… → Controllo della riconciliazione… → Instradamento RACI…*) + skeleton, poi la dashboard entra in sequenza (~2 sec).
**🎙 IT:** «Il Project Manager ha appena ricevuto i documenti del Gate G1 in una cartella di rete. Oggi passerebbe ore a leggerli. Io clicco un bottone.»
**🇬🇧 EN:** "The PM just received the Gate G1 documents in a shared folder. Today they would spend hours reading them. I click one button."
**✨ Punto chiave:** ore di lettura → **pochi secondi**, davanti agli occhi della giuria.

## BEAT 2 — Il verdetto (≈25 sec)
**🖱 Azione:** indica col cursore l'**anello readiness** (sale fino a **45**, rosso), poi la **timeline** e la **riga KPI**.
**👁 Cosa appare:** anello **45/100** rosso, banda **"Non pronto"**; timeline G0 **92** → G1 **45** → G2; KPI: **Critica ×1, Alta ×1, Media ×2**, *Riconciliazione 1 su 2 rotte*, Payback **2,70 anni (+0,30)** rosso, NPV **1,60 M€ (−0,50)** rosso.
**🎙 IT:** «Verdetto immediato: Gate Readiness 45 su 100, rosso, non pronto. Al Gate 0 eravamo a 92 — qui qualcosa è andato storto. E payback e NPV sono peggiorati rispetto alla baseline.»
**🇬🇧 EN:** "Clear verdict: 45 out of 100, red, not ready. At Gate 0 we were at 92 — so something went wrong here. And payback and NPV got worse than the baseline."
**✨ Punto chiave:** un solo numero dice la verità al comitato in 2 secondi.

## BEAT 3 — Il colpo di scena: la riconciliazione (≈45 sec) ⭐ *il cuore*
**🖱 Azione:** scorri alla **colonna sinistra, terza card "Riconciliazione"** (il grafo a nodi). Indica l'**arco ROSSO** tra *POC & BOM* e *Business Case (stima)* e il badge con i due valori.
**👁 Cosa appare:** mini-grafo: nodo **POC & BOM = 36,80 €** —[arco rosso animato]→ nodo **Business Case stima = 34,50 €**; il secondo arco (Investimento) è verde.
**🎙 IT:** «Ed ecco il punto. Questo arco rosso dice che il costo della distinta base nel business case è **34,50 €**, ma il dato tecnico reale è **36,80 €**. Due euro e trenta su ogni pezzo. Nessuno, leggendo cinque documenti separati, l'avrebbe notato. Ma quella stima **sottostima il costo**, quindi NPV e payback sembrano migliori del vero. Il comitato stava per approvare su numeri sbagliati. **Questo** è ciò che Gate Co-Pilot trova.»
**🇬🇧 EN:** "And here is the point. This red line says the bill-of-materials cost in the business case is **€34.50**, but the real technical cost is **€36.80**. That is €2.30 on every unit. No one reading five separate documents would catch this. That estimate **lowers the cost**, so NPV and payback look better than they are. The committee was about to approve on wrong numbers. **This** is what Gate Co-Pilot finds."
**✨ Punto chiave:** l'errore **invisibile tra documenti** — il pain killer. Rallenta qui: è il momento che ricorderanno.

## BEAT 4 — Da problema a responsabilità: il routing RACI (≈35 sec)
**🖱 Azione:** nella **colonna destra**, clicca il **primo avviso del feed** (banda *Critica*). Sotto, in **Anteprima notifiche**, scorri le tab **A → R → C → I** (1-2 click).
**👁 Cosa appare:** effetto "sta scrivendo" → il messaggio esatto per ruolo. Tab **Accountable = Product Manager** con badge **🔒 ACK bloccante** (canale *Diretto*); **Responsible = Finance** con l'azione; poi *Consulted* (Project Manager) e *Informed* (R&D, Laboratory, Quality, *Digest*).
**🎙 IT:** «E non si ferma al problema: clicco l'avviso e vedo **chi deve agire**. L'Accountable — il Product Manager — riceve una notifica con acknowledgement **bloccante**: il gate non passa finché non valida. Il Responsible — Finance — riceve l'azione esatta. Ognuno il suo ruolo, secondo la matrice RACI.»
**🇬🇧 EN:** "And it does not stop at the problem: I click the alert and I see **who must act**. The Accountable — the Product Manager — gets a **blocking** acknowledgement: the gate cannot pass until they validate it. The Responsible — Finance — gets the exact action. Each person their role, by the RACI matrix."
**✨ Punto chiave:** non "c'è un problema", ma **chi** lo firma e **chi** lo corregge — accountability automatica.

## BEAT 5 — La governance è viva: le soglie (≈30 sec)
**🖱 Azione:** clicca **"Configura soglie"** (header). Trascina **"Payback massimo"** da **2,5 → 2,8**. Guarda il riquadro **"Anteprima in tempo reale"** in cima al pannello. Poi **"Ripristina default"** (torna a 45).
**👁 Cosa appare:** nell'anteprima, *Avvisi* scende e *Gate Readiness* sale **45 → 60**, la banda passa da **rossa "Non pronto"** ad **ambra "Da integrare"** — ma **non** verde.
**🎙 IT:** «La governance è configurabile e ricalcola in tempo reale. Ma guardate: anche se **allento** la regola sul payback, la readiness arriva solo a 60, ambra. Non diventa mai verde. Perché? L'errore critico sul costo è ancora lì — **un numero sbagliato non si sistema spostando una soglia**.»
**🇬🇧 EN:** "Governance is configurable and recalculates in real time. But look: even if I **relax** the payback rule, readiness only reaches 60, amber. It never turns green. Why? The critical cost error is still there — **a wrong number is not fixed by moving a slider**."
**✨ Punto chiave:** l'engine è **reale**, e dimostra che la riconciliazione critica è il vero blocco. (Piano B se vai corto: trascina e basta, "i numeri si ricalcolano live".)

## BEAT 6 — Il co-pilota AI (≈25 sec)
**🖱 Azione:** clicca la **bolla AI** (basso a destra). Clicca la domanda rapida **"Quali anomalie bloccano il gate?"** (o *"Chi deve agire per le anomalie critiche?"*).
**👁 Cosa appare:** effetto "sta pensando" → risposta in markdown che elenca la Critica (BOM) e l'Alta (payback) con *rilevato/atteso* e azione, e in fondo i **chip "da: documento"** (fonti citate).
**🎙 IT:** «E il PM può semplicemente chiedere, in linguaggio naturale: "Quali anomalie bloccano il gate?". Risposta immediata, **che cita i documenti reali** — non inventa nulla.»
**🇬🇧 EN:** "And the PM can simply ask, in plain language: 'Which problems block the gate?'. An instant answer that **cites the real documents** — it invents nothing."
**✨ Punto chiave:** il sapere sepolto nei file diventa una **conversazione**, sempre ancorata ai dati.

---

## Timing
| Beat | Contenuto | Durata |
|---|---|---|
| 1 | Scan | 0:25 |
| 2 | Verdetto 45/ROSSO | 0:25 |
| 3 | **Riconciliazione 34,50 ≠ 36,80** ⭐ | 0:45 |
| 4 | Routing RACI + ACK bloccante | 0:35 |
| 5 | Soglie live (45→60, non verde) | 0:30 |
| 6 | Chat AI con fonti | 0:25 |
| | **Totale demo** | **~2:45** |

## Se sei corto di tempo
- Taglia il **Beat 5** (soglie): è il più sacrificabile.
- **Beat 3 (riconciliazione) non si tocca mai**: è il valore differenziante.
- Beat 6: se manca tempo, basta una domanda rapida, non scrivere a mano.

## Piano B (se qualcosa si blocca)
- App non risponde → **F5**: lo stato riparte pulito (i dati sono in memoria, deterministici).
- Hai cliccato troppo nel drawer → **"Ripristina default"** riporta a 45.
- Niente dipende dalla rete: la chat funziona in **modalità demo** (badge "demo") anche offline.
