# Configurazione Supabase — guida passo per passo

Questa procedura non richiede di condividere password o API key in chat. Conserva i valori nel pannello del relativo servizio.

## 1. Creare il progetto

1. Apri Supabase e crea un account.
2. Crea un nuovo progetto chiamato `dsu-sales-agent` in una regione europea.
3. Genera una password database robusta e conservala in un password manager.
4. Attendi che il progetto sia pronto.

## 2. Creare il database

Metodo semplice, senza CLI:

1. Nel progetto Supabase apri **SQL Editor**.
2. Apri nel repository `supabase/migrations/202609290001_initial_schema.sql`.
3. Copia l'intero contenuto nell'editor SQL e seleziona **Run** una sola volta.
4. Controlla in **Table Editor** che siano presenti `prospects`, `prospect_sources`, `email_drafts`, `activities`, `suppression_entries` e `product_knowledge`.
5. In `product_knowledge` puoi correggere o aggiornare i contenuti ufficiali DSU. Non aggiungere claim non verificati.

## 3. Creare il primo utente

1. Apri **Authentication → Users**.
2. Seleziona **Add user**.
3. Inserisci la tua email di accesso e una password nuova, diversa da quella Aruba.
4. Non usare la password della casella `info@doublestruggleuniversity.com`.

La registrazione pubblica non è esposta dall'app: gli utenti vengono creati dall'amministratore.

## 4. Configurare OpenAI nei secret Supabase

1. Crea un progetto separato nella OpenAI Platform.
2. Imposta budget e avvisi di spesa.
3. Crea una project API key.
4. Nel terminale, dopo aver installato e autenticato Supabase CLI, esegui localmente:

```bash
supabase secrets set OPENAI_API_KEY="valore-inserito-solo-nel-tuo-terminale"
supabase secrets set OPENAI_MODEL="gpt-5-mini"
supabase secrets set EMAIL_SENDING_ENABLED="false"
```

Non mettere la chiave in `config.js`, `.env.example`, GitHub o chat.

## 5. Pubblicare le Edge Functions

Dalla cartella del progetto:

```bash
supabase login
supabase link --project-ref IL_TUO_PROJECT_REF
supabase functions deploy ingest-source
supabase functions deploy qualify-prospect
supabase functions deploy generate-draft
```

Le funzioni richiedono una sessione utente valida. OpenAI viene chiamata soltanto dalle Edge Functions.

## 6. Collegare il frontend

Nel pannello Supabase apri **Project Settings → API** e recupera:

- Project URL;
- anon/publishable key, non la `service_role` key.

Per GitHub Pages:

1. Apri il repository GitHub.
2. Vai in **Settings → Secrets and variables → Actions → Variables**.
3. Crea `PUBLIC_SUPABASE_URL` con il Project URL.
4. Crea `PUBLIC_SUPABASE_ANON_KEY` con la anon/publishable key.
5. Non creare mai una variabile frontend con la service-role key.
6. Avvia nuovamente il workflow Pages oppure esegui un push su `main`.

## 7. Verifica finale

1. Apri l'app pubblicata.
2. Verifica che compaia la schermata di login invece dei dati demo.
3. Accedi con l'utente creato in Supabase.
4. Crea un prospect fittizio.
5. Apri la stessa app da un altro dispositivo e verifica che il prospect sia presente.
6. Aggiungi un URL professionale pubblico di test.
7. Qualifica il prospect e genera una bozza.
8. Approva la bozza e verifica che sia indicata come **non inviata**.
9. Imposta il prospect su `NON CONTATTARE` e verifica la voce in `suppression_entries`.

## Servizi non configurati in questa fase

- Aruba IMAP/SMTP;
- invio email;
- Tavily e ricerca automatica;
- Meta/Instagram API.

Non inserire ancora credenziali Aruba. Il contratto provider esiste soltanto come predisposizione tecnica e l'invio resta disabilitato.
