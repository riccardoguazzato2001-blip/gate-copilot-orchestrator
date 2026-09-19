# Gate Co-Pilot — Pitch (5 min) · CREO 2026 × GEWISS

Caso demo: **New Energy Metering** — contatore di energia connesso su guida DIN (MID + lettura remota), al **Gate G1 (Feasibility)**.
Stato di partenza dell'engine: **Gate Readiness 45/100 · banda ROSSA "Non pronto"** — 1 Critical, 1 High, 2 Medium.

---

## 1. Regia della demo — cosa mostrare e l'effetto "wow"

Tutto parte dal pain: **decisioni di gate prese su documenti incoerenti, dopo ore di revisione manuale.** Ogni schermata della demo risponde a un pezzo di quel pain.

| # | Cosa mostri sullo schermo | Effetto WOW | Pain che risolve |
|---|---|---|---|
| 1 | Schermata iniziale vuota → click **"Scansiona cartella di rete"** → scan animato (messaggi dinamici + skeleton) → la dashboard si popola con entrata in sequenza | Ore di lettura documenti → **pochi secondi** davanti agli occhi della giuria | Revisione manuale lenta |
| 2 | **Hero header + Gate Timeline**: G0 superato (92) · G1 attivo **45/100 ROSSO** · G2 futuro | Un solo numero dice subito la verità: **NON pronto** | Comitato senza un quadro chiaro |
| 3 | **Riconciliazione cross-documento** (mini-grafo): arco ROSSO tra POC&BOM e Business Case → costo BOM **34,50 € ≠ 36,80 €** | "Nessuno, leggendo 5 documenti separati, l'avrebbe trovato": la stima sottostima il costo → NPV e payback **sembrano migliori del vero** | **Errori invisibili tra documenti** (il pain killer) |
| 4 | **Anteprima notifiche (RACI)**: click sull'alert Critico → messaggio esatto per ogni ruolo; l'Accountable ha **ACK bloccante** | Non "c'è un problema", ma **chi** lo corregge, con quale testo, e il gate è bloccato finché non firma | Responsabilità confuse |
| 5 | **Configura soglie**: muovi payback max / NPV min → tutta la dashboard si ricalcola in tempo reale (onda visiva) | La governance è **viva e configurabile**: l'engine è reale, non una slide | Policy rigida / non adattabile |
| 6 | **Chatbot AI**: "Quali anomalie bloccano il gate?" / "Chi deve agire?" → risposta immediata che cita i documenti | Il PM **parla** con il gate in linguaggio naturale | Conoscenza sepolta nei file |

**Regola d'oro:** apri e chiudi sul pain #3 (la riconciliazione). È il momento che la giuria ricorderà.

---

## 2. Script ITALIANO (~5 min)

**[0:00 — Il problema]**
In GEWISS ogni nuovo prodotto attraversa una serie di *gate* decisionali. A ogni gate un comitato decide se il progetto va avanti: GO o NO-GO. Ma quella decisione vale quanto i documenti su cui si basa. Oggi, prima di ogni gate, un Project Manager deve leggere a mano decine di documenti — business case, distinta base, piano dei rischi, piano economico — e verificare che siano completi, coerenti e dentro le soglie. Sono **ore** di lavoro. E il problema più grave non è la lentezza: è che **gli errori nascosti tra un documento e l'altro non si vedono**. Un costo che non torna tra due file può far approvare un investimento sbagliato.

**[0:45 — Chi colpisce]**
Questo colpisce tre attori: il **Project Manager**, che perde ore; il **comitato di gate**, che decide su numeri che potrebbero non quadrare; e i **team funzionali** — R&D, Finance, Qualità, Laboratorio — che non sanno con precisione cosa correggere. Per loro abbiamo costruito **Gate Co-Pilot**.

**[1:00 — La soluzione]**
Gate Co-Pilot è il **copilota di governance** del Project Manager. Ingerisce i documenti del gate e in pochi secondi fa quattro controlli: **completezza**, **conformità ai criteri**, **soglie di policy** e — il più importante — **riconciliazione dei numeri tra documenti diversi**. Restituisce un unico punteggio di **Gate Readiness**, gli avvisi in ordine di gravità, e dice a **ogni ruolo esattamente cosa fare**. Le ore di revisione diventano minuti, e gli errori invisibili diventano visibili. Ve lo mostro su un caso reale.

**[1:30 — Demo]**
*(Beat 1)* Il PM ha appena ricevuto i documenti del Gate G1 di "New Energy Metering" in una cartella di rete. Oggi passerebbe ore a leggerli. Io clicco un bottone — *"Scansiona cartella di rete"*. L'agente accede ai file, analizza il business case, controlla la coerenza, instrada gli avvisi… ed ecco la dashboard.

*(Beat 2)* Verdetto immediato: **Gate Readiness 45 su 100, rosso. Non pronto.** La timeline mostra che il Gate 0 era a 92 — qui qualcosa è andato storto.

*(Beat 3 — il cuore)* Guardate qui: la riconciliazione tra documenti. Questo arco rosso dice che il **costo della distinta base nel business case è 34,50 €, ma il dato tecnico reale è 36,80 €.** Due euro e trenta su ogni pezzo. Nessuno, leggendo cinque documenti separati, l'avrebbe notato. Ma quella stima **sottostima il costo**, quindi NPV e payback sembrano migliori di quanto siano davvero. Il comitato stava per approvare un progetto su numeri sbagliati. **Questo** è ciò che Gate Co-Pilot trova.

*(Beat 4)* E non si ferma al problema: clicco l'avviso e vedo **chi deve agire**. L'Accountable riceve una notifica con *acknowledgement bloccante*: il gate non passa finché non valida. Il Responsible riceve l'azione esatta da fare. Ognuno il suo ruolo, secondo la matrice RACI.

*(Beat 5)* La governance è configurabile: se cambio le soglie di policy — payback massimo, NPV minimo — **tutto si ricalcola in tempo reale.** L'engine è vero.

*(Beat 6)* E il PM può semplicemente **chiedere**: "Quali anomalie bloccano il gate?" — risposta immediata, che cita i documenti reali.

**[4:15 — Valore + chiusura]**
Cosa porta a GEWISS: **da circa cinque ore di revisione a pochi minuti**; decisioni di gate **coerenti e ripetibili**, sempre con gli stessi criteri; gli **errori costosi tra documenti** intercettati prima del comitato; e **responsabilità chiare**, perché ogni avviso ha un nome e una firma. Un gate alla volta, su tutto il portafoglio progetti. Gate Co-Pilot non decide al posto del comitato: gli dà finalmente **un quadro di cui fidarsi**. Grazie.

---

## 3. English script (B1 level, ~5 min)

**[0:00 — The problem]**
At GEWISS, every new product passes through decision "gates". At each gate, a committee decides if the project can go on: GO or NO-GO. But that decision is only as good as the documents behind it. Today, before each gate, a Project Manager must read many documents by hand — business case, bill of materials, risk plan, cost plan — and check that they are complete, consistent, and inside the limits. This takes **hours**. And the worst problem is not the time. The worst problem is that **mistakes hidden between two documents are invisible**. A cost that does not match across two files can lead to a wrong investment.

**[0:45 — Who it hurts]**
This hurts three people: the **Project Manager**, who loses hours; the **gate committee**, who decides on numbers that may not add up; and the **functional teams** — R&D, Finance, Quality, Lab — who do not know exactly what to fix. For them, we built **Gate Co-Pilot**.

**[1:00 — The solution]**
Gate Co-Pilot is the Project Manager's **governance co-pilot**. It reads the gate documents and, in a few seconds, runs four checks: **completeness**, **rule conformance**, **policy thresholds**, and — the most important — **reconciliation of numbers across different documents**. It gives one **Gate Readiness** score, the alerts ordered by severity, and it tells **each role exactly what to do**. Hours of review become minutes, and invisible mistakes become visible. Let me show you on a real case.

**[1:30 — Demo]**
*(Beat 1)* The PM just received the Gate G1 documents of "New Energy Metering" in a shared folder. Today, they would spend hours reading them. I click one button — *"Scan network folder"*. The agent opens the files, analyses the business case, checks consistency, routes the alerts… and here is the dashboard.

*(Beat 2)* Clear verdict: **Gate Readiness 45 out of 100, red. Not ready.** The timeline shows Gate 0 was at 92 — so something went wrong here.

*(Beat 3 — the heart)* Look here: the reconciliation between documents. This red line says the **bill-of-materials cost in the business case is €34.50, but the real technical cost is €36.80.** That is €2.30 on every unit. No one reading five separate documents would catch this. But that estimate **lowers the cost**, so the NPV and the payback look better than they really are. The committee was about to approve a project on wrong numbers. **This** is what Gate Co-Pilot finds.

*(Beat 4)* And it does not stop at the problem: I click the alert and I see **who must act**. The Accountable gets a notification with a **blocking acknowledgement**: the gate cannot pass until they validate it. The Responsible gets the exact action to do. Each person their own role, by the RACI matrix.

*(Beat 5)* Governance is configurable: if I change the policy limits — maximum payback, minimum NPV — **everything recalculates in real time.** The engine is real.

*(Beat 6)* And the PM can simply **ask**: "Which problems block the gate?" — an instant answer that cites the real documents.

**[4:15 — Value + close]**
What this brings to GEWISS: **from about five hours of review to a few minutes**; gate decisions that are **consistent and repeatable**, always with the same rules; the **costly mistakes between documents** caught before the committee; and **clear responsibility**, because every alert has a name and a sign-off. One gate at a time, across the whole project portfolio. Gate Co-Pilot does not decide for the committee: it finally gives them **a picture they can trust**. Thank you.

---

## 4. Numeri chiave da citare
- **Gate Readiness 45/100** (ROSSO) sul caso demo — 1 Critical, 1 High, 2 Medium.
- **Difetto principale:** costo BOM 34,50 € (business case) vs 36,80 € (dato tecnico) → riconciliazione Critica.
- **Da ~5 ore a pochi minuti** per revisione di gate (stima del team).
- **4 livelli di controllo:** Presence · Conformance · Threshold · Reconciliation.
- **Routing RACI:** Accountable con ACK bloccante, Responsible con azione, Consulted/Informed informati.
