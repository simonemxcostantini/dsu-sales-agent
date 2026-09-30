# Architettura MVP operativo

## Confini di sicurezza

- Il browser contiene soltanto Supabase URL e anon/publishable key.
- PostgreSQL applica Row Level Security: ogni operatore vede i propri prospect.
- Le Edge Functions verificano il JWT e controllano la proprietà del prospect.
- `SUPABASE_SERVICE_ROLE_KEY` e `OPENAI_API_KEY` esistono soltanto nell'ambiente Supabase.
- `EMAIL_SENDING_ENABLED=false` è verificato durante la generazione delle bozze.
- Non esiste alcun codice SMTP/IMAP attivo.

## Flusso dati

1. L'operatore crea il prospect autenticato.
2. `ingest-source` accetta soltanto URL HTTP(S), blocca indirizzi locali evidenti, limita dimensioni e timeout e chiede a OpenAI un'estrazione strutturata senza inferenze.
3. La fonte e le evidenze sono salvate prima della qualificazione.
4. `qualify-prospect` calcola segnali deterministici e usa OpenAI soltanto per motivazione, confidenza e dati mancanti.
5. `generate-draft` richiede score almeno 65, fonti e knowledge base attiva.
6. L'operatore modifica, approva o rifiuta. L'approvazione produce un audit log, non un invio.

## Provider futuri

- `SearchProvider` rende sostituibile la ricerca; l'adapter Tavily è predisposto ma non esposto.
- `EmailProvider` definisce il confine per una futura integrazione Aruba IMAP/SMTP; l'unica implementazione attuale genera sempre un errore di invio disabilitato.
- `instagram_handle` e `instagram_url` sono dati professionali; non esiste automazione Instagram.
