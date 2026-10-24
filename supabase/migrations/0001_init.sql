-- SubTrack cloud sync: one JSON document per user, readable and writable only by that user.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "own row: select" on public.user_data for select using (auth.uid() = user_id);
create policy "own row: insert" on public.user_data for insert with check (auth.uid() = user_id);
create policy "own row: update" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row: delete" on public.user_data for delete using (auth.uid() = user_id);

-- Smart-add usage, for a monthly cap per user. Written only by the edge function (service role).
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  used_at timestamptz not null default now()
);
create index if not exists ai_usage_user_time on public.ai_usage (user_id, used_at desc);
alter table public.ai_usage enable row level security;
-- No policies: clients can't read or write it.
