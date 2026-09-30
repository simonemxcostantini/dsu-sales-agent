# DSU Sales Agent

MVP commerciale per il **DSU Dance Teacher Program**, focalizzato inizialmente su scuole e professionisti italiani Hip Hop/street dance.

## Stato del progetto

L'app funziona in due modalità:

- **demo locale**, senza configurazione: usa dati fittizi e `localStorage`, come il prototipo originale;
- **modalità operativa**, dopo la configurazione: usa Supabase Auth/PostgreSQL, fonti persistenti ed Edge Functions OpenAI server-side.

L'invio email è intenzionalmente assente. Approvare una bozza registra soltanto l'approvazione e **non invia comunicazioni**.

## Funzionalità

- dashboard responsive e utilizzabile da smartphone;
- autenticazione per operatori;
- prospect persistenti e disponibili su dispositivi diversi;
- stati completi del funnel;
- email business, sito, Instagram, città, discipline e note;
- fonti URL obbligatorie per qualificazione e personalizzazione;
- acquisizione controllata di URL professionali pubblici;
- score deterministico verificabile e analisi OpenAI server-side;
- knowledge base DSU in PostgreSQL;
- generazione di bozze con modifica, approvazione o rifiuto umano;
- audit delle attività;
- deduplicazione tramite vincoli database;
- suppression list alimentata dallo stato `NON CONTATTARE`;
- adapter Tavily predisposto ma non ancora attivato;
- contratto email Aruba predisposto, senza connessione IMAP/SMTP;
- nessuna automazione Instagram.

## Architettura

Il frontend rimane HTML, CSS e JavaScript ES Modules. In modalità operativa comunica con Supabase usando esclusivamente la anon/publishable key. Database, Auth, Row Level Security ed Edge Functions sono in `supabase/`; OpenAI viene chiamata soltanto dalle funzioni server-side.

Approfondimenti:

- [Architettura e confini di sicurezza](docs/ARCHITECTURE.md)
- [Configurazione Supabase passo per passo](docs/SETUP_SUPABASE.md)

## Avvio in demo

```bash
npm run dev
```

Aprire `http://localhost:4173`. Senza valori in `config.js` l'app mantiene automaticamente la modalità demo funzionante.

## Build

```bash
npm run build
```

La build in `dist/` usa le variabili pubbliche `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY`, se presenti; altrimenti produce la demo. `npm run preview:build` genera inoltre un singolo HTML portabile della demo.

## Configurazione e segreti

Copiare `.env.example` soltanto come riferimento. Non committare `.env` o credenziali.

Segreti server-side:

- `OPENAI_API_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`, fornita automaticamente alle Edge Functions Supabase;
- in futuro `TAVILY_API_KEY`;
- in futuro parametri Aruba IMAP/SMTP.

Valori pubblici frontend:

- `PUBLIC_SUPABASE_URL`;
- `PUBLIC_SUPABASE_ANON_KEY`.

Non inserire mai nel frontend service-role key, OpenAI key o password Aruba.

## Verifiche

```bash
npm test
npm run check
npm run build
npm run preview:build
```

## GitHub Pages

Il workflow `.github/workflows/deploy-pages.yml` esegue la build a ogni push su `main`. Per attivare la modalità Supabase, configurare le repository variables `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_ANON_KEY` seguendo la guida. Se le variabili non esistono, la pubblicazione continua a mostrare la demo senza interrompere la versione funzionante.
