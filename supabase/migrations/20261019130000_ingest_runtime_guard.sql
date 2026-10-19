create table if not exists public.ppg_ingest_runtime (
  key text primary key,
  secret_hash text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.ppg_ingest_runtime enable row level security;
revoke all on table public.ppg_ingest_runtime from anon, authenticated;

comment on table public.ppg_ingest_runtime is 'Server-side guard for the scheduled ingest edge function; stores only a hash.';
