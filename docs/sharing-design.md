# Sharing & Multi-User Access — Design

Status: **Draft for review** (no code/migrations written yet)
Goal: let a user share **either a specific group or their entire account** with another
user, with a **configurable role (viewer / editor)** per person.

This document is the blueprint. Nothing here is implemented until we agree on it,
because it rewrites the Row-Level Security (RLS) that protects financial data.

---

## 1. Principles

- **RLS is the real security boundary**, not the UI. The UI hides buttons for viewers;
  the database is what actually enforces who can read/write what.
- **Email-based shares.** A share names the invitee by email. RLS matches the invitee's
  login email (`auth.jwt() ->> 'email'`). This avoids a service-role Edge Function to
  resolve email→user_id. Consequence: the invited person must sign up / log in with that
  same email to gain access.
- **Sharing is access, not merging.** A member *switches into* your account/group to view
  it. Their own dashboard stays their own data — we never blend two people's finances into
  one total.
- **Least privilege.** Viewer = read only. Editor = read + create/edit/delete within the
  shared scope. Nothing grants management of *other* people's shares except the owner.

---

## 2. Data model

### 2.1 Profiles & usernames

Every user picks a **username** at signup. A `profiles` row links the username to the auth
user and denormalizes the email so we can resolve either identifier to an account. This is
also what lets a share target a **username or an email**.

Signup collects **username, name, email, password**. Email + password go to Supabase Auth;
username + name + (denormalized) email go to `profiles`.

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,  -- = auth user id
  username citext unique not null,           -- case-insensitive unique handle (@prem)
  name text not null,                        -- friendly display name; defaults to username if blank
  email text not null,
  created_at timestamptz default now()
);
-- requires: create extension if not exists citext;

alter table profiles enable row level security;
-- Any signed-in user may read profiles (needed to show usernames on shares/switcher);
-- a user may only write their own.
create policy profiles_read on profiles for select using (auth.role() = 'authenticated');
create policy profiles_write on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
```

> Note: `profiles_read` exposes usernames + emails to any authenticated user. If email
> privacy matters, restrict the readable columns via a view, or resolve identifiers only
> through the `SECURITY DEFINER` function in §3.1 and drop the broad read policy. **Open
> question (5)** below.

### 2.2 Share tables

Two share tables. The share row **is** the invitation — no separate accept step in v1. Each
share identifies the invitee by **`invitee_id`** (resolved from a username or a registered
email at invite time) **and/or `invitee_email`** (kept for inviting an email that hasn't
signed up yet — matched later by the invitee's login email). `owner_username` /
`owner_email` are denormalized so the invitee's switcher shows a friendly label.

```sql
-- Whole-account share: invitee gets access to ALL of owner_id's data.
create table account_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  owner_username citext,
  owner_email text,
  invitee_id uuid references auth.users(id) on delete cascade,  -- set once resolved
  invitee_email text,                                            -- lower-cased fallback
  role text check (role in ('viewer','editor')) not null default 'viewer',
  created_at timestamptz default now(),
  check (invitee_id is not null or invitee_email is not null),
  unique (owner_id, invitee_id),
  unique (owner_id, invitee_email)
);

-- Single-group share: invitee gets access to one group's transactions.
create table group_shares (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  owner_username citext,
  owner_email text,
  invitee_id uuid references auth.users(id) on delete cascade,
  invitee_email text,
  role text check (role in ('viewer','editor')) not null default 'viewer',
  created_at timestamptz default now(),
  check (invitee_id is not null or invitee_email is not null),
  unique (group_id, invitee_id),
  unique (group_id, invitee_email)
);

create index account_shares_invitee_id on account_shares (invitee_id);
create index account_shares_invitee_em on account_shares (invitee_email);
create index group_shares_invitee_id   on group_shares (invitee_id);
create index group_shares_invitee_em   on group_shares (invitee_email);
```

When an email-only invitee later signs up, a trigger on `profiles` backfills `invitee_id`
on any pending shares whose `invitee_email` matches (see §4). Existing owner tables
(`transactions` etc.) are unchanged — ownership stays `user_id`; only their **RLS** changes.

---

## 3. RLS design (the security core)

### 3.1 Helper functions

RLS policies that read other tables can recurse or hit those tables' own RLS. To keep
policies simple and safe, membership checks live in `SECURITY DEFINER` functions (they run
with definer privileges, bypassing RLS on the lookup tables — but they only ever check the
*current* user, so they can't leak).

A share matches the current user when its **`invitee_id` = `auth.uid()`** OR its
**`invitee_email` = the JWT email** (the fallback for an email invited before signup).

```sql
-- Resolve a typed identifier (username OR email) to an account, at invite time.
-- SECURITY DEFINER so the owner can look someone up without a broad read grant.
create or replace function find_user(identifier text)
returns table (id uuid, username citext, name text, email text)
language sql security definer stable as $$
  select id, username, name, email from profiles
  where username = identifier or lower(email) = lower(identifier)
  limit 1;
$$;

-- Read access to an account (its owner_id).
create or replace function can_read_account(p_owner uuid)
returns boolean language sql security definer stable as $$
  select p_owner = auth.uid()
      or exists (select 1 from account_shares
                 where owner_id = p_owner
                   and (invitee_id = auth.uid()
                        or invitee_email = auth.jwt() ->> 'email'));
$$;

-- Write access to an account.
create or replace function can_write_account(p_owner uuid)
returns boolean language sql security definer stable as $$
  select p_owner = auth.uid()
      or exists (select 1 from account_shares
                 where owner_id = p_owner and role = 'editor'
                   and (invitee_id = auth.uid()
                        or invitee_email = auth.jwt() ->> 'email'));
$$;

-- Owner of a group (used to pin inserted rows to the right account).
create or replace function group_owner(p_group uuid)
returns uuid language sql security definer stable as $$
  select user_id from groups where id = p_group;
$$;

-- Read access to a group: owner, account-shared, or group-shared.
create or replace function can_read_group(p_group uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from groups g where g.id = p_group and (
      can_read_account(g.user_id)
      or exists (select 1 from group_shares gs
                 where gs.group_id = g.id
                   and (gs.invitee_id = auth.uid()
                        or gs.invitee_email = auth.jwt() ->> 'email'))
    )
  );
$$;

-- Write access to a group.
create or replace function can_write_group(p_group uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from groups g where g.id = p_group and (
      can_write_account(g.user_id)
      or exists (select 1 from group_shares gs
                 where gs.group_id = g.id and gs.role = 'editor'
                   and (gs.invitee_id = auth.uid()
                        or gs.invitee_email = auth.jwt() ->> 'email'))
    )
  );
$$;
```

### 3.2 `transactions`

Replaces the current single `own transactions` policy with per-action policies.

```sql
-- Read: your account, an account shared with you, or a group shared with you.
create policy tx_select on transactions for select using (
  can_read_account(user_id)
  or (group_id is not null and can_read_group(group_id))
);

-- Insert: the new row must be pinned to an account/group you can write.
-- The user_id must match an owner you're allowed to write for — this stops an
-- editor from attributing rows to an arbitrary account.
create policy tx_insert on transactions for insert with check (
  can_write_account(user_id)
  or (group_id is not null
      and can_write_group(group_id)
      and user_id = group_owner(group_id))
);

create policy tx_update on transactions for update
  using      (can_write_account(user_id) or (group_id is not null and can_write_group(group_id)))
  with check (can_write_account(user_id) or (group_id is not null and can_write_group(group_id)));

create policy tx_delete on transactions for delete using (
  can_write_account(user_id) or (group_id is not null and can_write_group(group_id))
);
```

**Write-ownership rule (app-side):** when an editor creates a transaction, the app sets
`user_id` to the **owner** of the active account (or the shared group's owner), never the
member's own id. RLS enforces that this is the only allowed value.

### 3.3 `groups`

```sql
create policy groups_select on groups for select using (
  can_read_account(user_id)
  or exists (select 1 from group_shares gs
             where gs.group_id = id and gs.invitee_email = auth.jwt() ->> 'email')
);

-- Creating/renaming/deleting groups is an account-level action (a group-only
-- member cannot spawn new groups in someone else's account).
create policy groups_ins on groups for insert with check (can_write_account(user_id));
create policy groups_upd on groups for update using (can_write_account(user_id))
                                       with check (can_write_account(user_id));
create policy groups_del on groups for delete using (can_write_account(user_id));
```

### 3.4 `categories`

Custom-category rows must be readable so shared transactions render with the right
label/emoji (otherwise they fall back to “Other”).

```sql
create policy cat_select on categories for select using (
  can_read_account(user_id)
  -- so group-share members can resolve categories used by the shared group:
  or exists (select 1 from group_shares gs
             join groups g on g.id = gs.group_id
             where g.user_id = categories.user_id
               and gs.invitee_email = auth.jwt() ->> 'email')
);
create policy cat_write on categories for all
  using      (can_write_account(user_id))
  with check (can_write_account(user_id));
```

### 3.5 `statement_imports`

Import history is account-scoped only (not exposed to group-only members).

```sql
create policy imports_select on statement_imports for select using (can_read_account(user_id));
create policy imports_write  on statement_imports for all
  using (can_write_account(user_id)) with check (can_write_account(user_id));
```

### 3.6 Share tables' own RLS

```sql
-- account_shares: owner manages; invitee may read rows addressed to them.
create policy acc_share_owner on account_shares for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy acc_share_invitee_read on account_shares for select
  using (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email');

-- group_shares: the group's owner manages; invitee may read their own rows.
create policy grp_share_owner on group_shares for all
  using (group_owner(group_id) = auth.uid())
  with check (group_owner(group_id) = auth.uid());
create policy grp_share_invitee_read on group_shares for select
  using (invitee_id = auth.uid() or invitee_email = auth.jwt() ->> 'email');
```

---

## 4. Invite flow

1. Owner opens a sharing UI and enters a **username or email + role**.
2. App calls `find_user(identifier)`:
   - **Found** (username, or an email that has signed up) → insert the share with
     `invitee_id` set (and `invitee_email` for reference). Access is live immediately.
   - **Not found** (an email with no account yet) → insert with `invitee_email` only.
     Access begins when that person signs up / logs in with that email.
   - A username that doesn't resolve is rejected (“no user with that username”).
3. **No email is sent in v1** (no mail provider wired). The owner notifies the person
   out-of-band. Real invite emails later need a mail provider + Edge Function — future item.
4. **Backfill trigger:** on `profiles` insert (i.e. someone finishes signup), set
   `invitee_id = new.id` on any `account_shares` / `group_shares` where
   `invitee_id is null and lower(invitee_email) = lower(new.email)`. This upgrades
   email-only invites to id-based once the person exists.

Guards: reject inviting your **own** username/email; store/compare emails lower-cased;
usernames are `citext` unique; the `unique` constraints prevent duplicate shares (update the
role instead).

---

## 5. App-side changes

### 5.1 Active-account context (the pervasive one)

Today every query uses `user.id` as the owner. Introduce an **`AccountContext`**:

- `accounts`: `[{ ownerId, ownerUsername, ownerEmail, role: 'owner'|'editor'|'viewer' }]` —
  the user's own account plus every account shared with them (from `account_shares` where
  `invitee_id = me` or `invitee_email = my email`).
- `activeAccount`: currently selected; defaults to own.
- All owner-scoped hooks/services take `activeAccount.ownerId` instead of `user.id`:
  `getTransactions`, `getGroups`, `getMonthlySummary`, `getGroupSummary`, `getCategories`,
  imports. **`user.id` stops being used as the data owner** — only for “who am I”.
- Writes: allowed only when `activeAccount.role !== 'viewer'`; inserts set
  `user_id = activeAccount.ownerId`.

### 5.2 Account switcher

Top bar (or sidebar): “Viewing: **My account** ▾”, dropdown lists own + shared accounts
(labelled by owner **name + handle**, e.g. “Prem (@prem)”). Selecting one reloads all views
for that owner. A **read-only banner** shows when `role === 'viewer'`.

### 5.3 Group sharing UI

“Share” button on the group view → modal: invite by email + role; list current members with
role dropdown + revoke. Shared-with-me groups appear in the sidebar (marked shared); the
group query for a member includes groups from `group_shares`.

### 5.4 Role enforcement in the UI

Viewer context hides/disables Add, Import, Edit, Delete, group create/delete, category
management. RLS still backstops all of it.

---

## 6. Edge cases & decisions

- **Email change**: shares are keyed to an email; if a member changes their login email the
  share goes dormant. Acceptable in v1; note in UI copy.
- **RLS recursion**: avoided via `SECURITY DEFINER` helper functions.
- **Cascade**: deleting a group/user cascades its shares (FK `on delete cascade`).
- **Editor can't forge ownership**: insert `with check` ties `user_id` to accounts/groups
  the editor may write.
- **Performance**: helper functions are `stable`; indexes on `invitee_email` /
  `group_id` / `owner_id`. Fine for personal-scale data.

Open questions to settle before/again during build:

1. **Explicit accept step?** v1 grants access immediately on email match. Add a
   `status pending|accepted` column if you want an accept click. (Recommend: skip for v1.)
2. **Group-share members reading categories** — granted here for correct display; ok?
   (Alternative: let unknown categories fall back to “Other”.)
3. **Real invite emails** — out of scope for v1 (needs a mail provider + Edge Function).
4. **Viewer visibility** — assumes viewers see everything in scope (amounts + descriptions).
5. **Profile readability** — v1 lets any signed-in user read `profiles` (username + email) so
   the app can show usernames on shares and the switcher. If exposing emails is a concern,
   drop the broad read policy and resolve identifiers only via `find_user` (usernames stay
   discoverable for invites; raw emails don't). Recommend the restricted variant.
6. **Username rules** — proposed: case-insensitive unique, 3–20 chars, `[a-z0-9_]`.
   Immutable in v1 (no rename), to keep denormalized labels simple.

---

## 7. Phased implementation plan

Even though the target is **both** scopes, build in slices so each lands working & secure:

- **Phase 0 — Profiles & usernames.** `profiles` table + `citext`, username field on signup
  (with validation + uniqueness), backfill existing users a profile, `find_user` function.
  **Safe and independent of the RLS rewrite** — can ship on its own before any sharing.
- **Phase 1 — Group sharing.** `group_shares` + helper fns + `transactions`/`groups`/
  `categories` RLS for the group path + “Share group” UI (username or email) + shared groups
  in the sidebar + viewer/editor enforcement. Contained; proves the sharing + RLS pattern.
- **Phase 2 — Account sharing.** `account_shares` + `AccountContext` + account switcher +
  full RLS across all tables + account sharing screen. The invasive one (rewires every
  owner-scoped query).
- **Phase 3 — Management & polish.** Member lists, role changes, revoke, self-share guard,
  backfill trigger; optionally an accept step and real invite emails via Edge Function.

Each phase ships one Supabase migration you apply, plus app changes, verified before the
next phase starts.

---

## 8. Migrations this will introduce (names reserved)

- `0004_profiles_and_usernames.sql` (Phase 0)
- `0005_sharing_helpers_and_group_shares.sql` (Phase 1)
- `0006_account_shares_and_rls.sql` (Phase 2)

Existing tables gain new RLS policies; the old `own transactions` / `own groups` /
`own categories` / `own imports` policies are **dropped and replaced** as part of the
Phase 1/2 migrations. Phase 0 only adds the `profiles` table (no changes to existing RLS),
which is why it's safe to ship first.
