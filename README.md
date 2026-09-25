# DSU Sales Agent

MVP web per supportare il processo commerciale del **DSU Dance Teacher Program** (percorso professionale online di 6 mesi, prezzo 699 €). L'app usa esclusivamente dati demo e non invia comunicazioni reali.

## Requisiti e perimetro della Fase 1

- database locale di prospect con anagrafica, fonte, note, stato e conversazioni;
- dashboard con KPI commerciali e tassi di risposta/conversione;
- scheda prospect con cambio stato, note e storico;
- simulatore di risposte in ingresso con classificazione deterministica;
- generazione di una bozza commerciale sempre soggetta ad approvazione umana;
- opt-out tramite stato `NON CONTATTARE`;
- **nessun invio email**, scraping, raccolta automatica o uso di dati personali reali.

## Stack e architettura

Stack volutamente semplice e senza dipendenze: **HTML, CSS e JavaScript ES Modules**. Non è necessario un backend né un download dal registry npm per questo MVP: il repository contiene un dataset fittizio iniziale e salva le modifiche nel `localStorage` del browser.

L'interfaccia (`src/app.js`) separa dashboard, lista e dettaglio; dati e stati sono centralizzati in `src/data.js`; classificazione e generazione simulata sono funzioni pure in `src/ai.js`, così potranno essere sostituite in futuro da adapter verso API OpenAI. Allo stesso modo, un futuro backend potrà sostituire la persistenza locale e integrare provider email e ricerca prospect mantenendo l'invio sempre esplicito e controllato.

Eventuali credenziali future dovranno essere fornite con variabili d'ambiente lato server (file `.env` esclusi da Git), mai incluse nel client o nel repository.

## Avvio

```bash
npm run dev
```

Aprire `http://localhost:4173` nello stesso computer su cui è stato eseguito il comando. In alternativa, `npm run preview:build` crea `dist/preview.html`, un'anteprima portabile e autosufficiente apribile direttamente in qualsiasi browser. I dati demo sono immediatamente disponibili. Per ripristinarli, cancellare la chiave `dsu-sales-agent-prospects` dal localStorage del browser.

## Verifiche

```bash
npm test
npm run check
```

## Pubblicazione su GitHub Pages

Il workflow `.github/workflows/deploy-pages.yml` genera il sito statico e lo pubblica automaticamente a ogni push sul branch `main`. Nel repository GitHub selezionare **Settings → Pages → Source: GitHub Actions** una sola volta, se Pages non è già abilitato. L'URL risultante segue il formato `https://<account>.github.io/<repository>/` ed è riportato anche nel job `deploy` del workflow.
