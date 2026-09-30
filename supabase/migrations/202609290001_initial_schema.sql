-- DSU Sales Agent: persistent, auditable MVP schema.
create extension if not exists pgcrypto;

create type public.prospect_status as enum (
  'DA ANALIZZARE','QUALIFICATO','DA CONTATTARE','MESSAGGIO DA APPROVARE',
  'CONTATTATO','HA RISPOSTO','INTERESSATO','LEAD CALDO','CALL','VENDITA',
  'NON INTERESSATO','NON CONTATTARE'
);
create type public.draft_status as enum ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED');
create type public.prospect_type as enum ('Insegnante','Scuola','Altro');

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  display_name text not null,
  school_name text not null default '',
  city text not null default '',
  business_email text,
  website_url text,
  instagram_handle text,
  instagram_url text,
  prospect_type public.prospect_type not null default 'Altro',
  status public.prospect_status not null default 'DA ANALIZZARE',
  disciplines text[] not null default '{}',
  teacher_count integer check (teacher_count is null or teacher_count >= 0),
  recent_activity boolean,
  qualification_score integer check (qualification_score between 0 and 100),
  qualification_confidence numeric(4,3) check (qualification_confidence between 0 and 1),
  qualification_summary text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index prospects_owner_email_unique on public.prospects(owner_id, lower(business_email)) where business_email is not null;
create unique index prospects_owner_website_unique on public.prospects(owner_id, lower(website_url)) where website_url is not null;
create unique index prospects_owner_instagram_unique on public.prospects(owner_id, lower(instagram_handle)) where instagram_handle is not null;
create index prospects_owner_status_idx on public.prospects(owner_id, status);

create table public.prospect_sources (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  source_url text not null check (source_url ~ '^https?://'),
  source_type text not null default 'website',
  page_title text,
  evidence_text text,
  extracted_facts jsonb not null default '{}',
  content_hash text,
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(prospect_id, source_url)
);

create table public.qualification_runs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  recommended_status public.prospect_status not null,
  deterministic_signals jsonb not null default '[]',
  ai_reasons jsonb not null default '[]',
  missing_information jsonb not null default '[]',
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);

create table public.email_drafts (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  subject text not null,
  body text not null,
  status public.draft_status not null default 'PENDING_APPROVAL',
  source_ids uuid[] not null default '{}',
  model text not null,
  prompt_version text not null,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.prospects(id) on delete cascade,
  actor_id uuid default auth.uid() references auth.users(id),
  activity_type text not null,
  description text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.suppression_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prospect_id uuid references public.prospects(id) on delete set null,
  email_normalized text,
  domain_normalized text,
  instagram_handle_normalized text,
  reason text not null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(email_normalized, domain_normalized, instagram_handle_normalized, prospect_id) > 0)
);
create unique index suppression_owner_email_unique on public.suppression_entries(owner_id, email_normalized) where email_normalized is not null;

create table public.product_knowledge (
  id uuid primary key default gen_random_uuid(),
  section_key text not null,
  title text not null,
  content text not null,
  version integer not null default 1,
  is_active boolean not null default true,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  unique(section_key, version)
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger prospects_updated before update on public.prospects for each row execute function public.set_updated_at();
create trigger drafts_updated before update on public.email_drafts for each row execute function public.set_updated_at();

-- Ownership is inherited through prospect_id for child records.
create or replace function public.owns_prospect(target uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.prospects where id = target and owner_id = auth.uid()) $$;

alter table public.prospects enable row level security;
alter table public.prospect_sources enable row level security;
alter table public.qualification_runs enable row level security;
alter table public.email_drafts enable row level security;
alter table public.activities enable row level security;
alter table public.suppression_entries enable row level security;
alter table public.product_knowledge enable row level security;

create policy "owners manage prospects" on public.prospects for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners manage sources" on public.prospect_sources for all using (public.owns_prospect(prospect_id)) with check (public.owns_prospect(prospect_id));
create policy "owners read qualification" on public.qualification_runs for select using (public.owns_prospect(prospect_id));
create policy "owners manage drafts" on public.email_drafts for all using (public.owns_prospect(prospect_id)) with check (public.owns_prospect(prospect_id));
create policy "owners manage activities" on public.activities for all using (prospect_id is null or public.owns_prospect(prospect_id)) with check (prospect_id is null or public.owns_prospect(prospect_id));
create policy "owners manage suppression" on public.suppression_entries for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "authenticated read knowledge" on public.product_knowledge for select to authenticated using (is_active);

insert into public.product_knowledge(section_key,title,content) values
('identity','Nome del programma','DSU Dance Teacher Program / DSU Certified Dance Teacher Program'),
('duration','Durata','6 mesi'),
('price','Prezzo','699 €'),
('target','Target','Insegnanti di danza, insegnanti Hip Hop/street dance, dancer che vogliono diventare insegnanti e professionisti che vogliono strutturare meglio il proprio insegnamento.'),
('value','Valore','Il percorso serve a formare insegnanti più preparati e strutturati, capaci di dare maggiore valore ai propri allievi, gestire meglio il proprio lavoro e comunicare meglio il proprio valore professionale.'),
('topics','Contenuti','Tecnica, metodologia, musicalità, Hip Hop, gestione della classe, leadership, rapporto con genitori e scuole, freestyle/creatività, anatomia, marketing e comunicazione professionale.'),
('format','Formato','Video lezioni, materiali PDF, esercizi, test, community e incontri live.'),
('diploma','Diploma','Include diploma CSEN secondo i requisiti previsti dal programma.'),
('guardrails','Affermazioni vietate','Non promettere risultati garantiti. Non presentare il diploma come certificazione statale, titolo legalmente abilitante o qualifica universalmente riconosciuta. Non inventare caratteristiche assenti dalla knowledge base.');

-- Keep opt-out protection even if the prospect record is later edited.
create or replace function public.capture_non_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'NON CONTATTARE' and old.status is distinct from new.status then
    insert into public.suppression_entries(owner_id, prospect_id, email_normalized, instagram_handle_normalized, reason)
    values (new.owner_id, new.id, nullif(lower(trim(new.business_email)), ''), nullif(lower(trim(leading '@' from new.instagram_handle)), ''), 'Stato NON CONTATTARE')
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger prospects_capture_non_contact after update of status on public.prospects for each row execute function public.capture_non_contact();
