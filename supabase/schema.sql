-- Growvia accounts: run once in Supabase → SQL Editor → New query → Run.
-- Each person only sees and changes their own rows (row level security).

-- Farms: the full farm register (the same JSON the app keeps on the device)
create table if not exists public.farms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '',
  data jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists farms_user_idx on public.farms (user_id);
alter table public.farms enable row level security;
drop policy if exists "own farms" on public.farms;
create policy "own farms" on public.farms for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sessions saved with Growwy (analysis + plan)
create table if not exists public.saved_sessions (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.saved_sessions enable row level security;
drop policy if exists "own sessions" on public.saved_sessions;
create policy "own sessions" on public.saved_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- "Delete my account": removes the person and, by cascade, all their farms and sessions
create or replace function public.delete_my_account() returns void
language sql security definer set search_path = public as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
