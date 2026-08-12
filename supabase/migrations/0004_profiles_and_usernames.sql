-- Phase 0 of sharing: user profiles with a unique username + display name.
-- Signup collects username + name (passed as auth metadata); a trigger creates
-- the profile. Existing users get a profile via the in-app ProfileSetup screen.
--
-- Run this against the existing Supabase database (SQL editor or CLI).

create extension if not exists citext;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique not null,
  name text not null,
  email text not null,
  created_at timestamptz default now(),
  constraint username_format check ((username::text) ~ '^[a-z0-9_]{3,20}$')
);

alter table profiles enable row level security;

-- v1: a user reads/writes only their own profile. Broader read (for showing
-- other users' handles) is introduced with the sharing phases.
drop policy if exists "own profile read" on profiles;
create policy "own profile read" on profiles
  for select using (id = auth.uid());

drop policy if exists "own profile write" on profiles;
create policy "own profile write" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Anonymous-safe username availability check for the signup form.
create or replace function username_available(u text)
returns boolean language sql security definer stable as $$
  select not exists (select 1 from profiles where username = lower(u));
$$;
grant execute on function username_available(text) to anon, authenticated;

-- Auto-create a profile when a new auth user is created, from signup metadata
-- (supabase.auth.signUp options.data → raw_user_meta_data).
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (id, username, name, email)
    values (
      new.id,
      lower(new.raw_user_meta_data ->> 'username'),
      coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), new.raw_user_meta_data ->> 'username'),
      new.email
    )
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
