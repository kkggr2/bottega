-- Bottega: phone notifications when a friend puts something on.
-- At most one notification per friend per 6 hours, and nothing from private rooms.
-- Run this in the Supabase SQL editor. It is safe to run again.

create table if not exists public.push_tokens (
  token       text primary key check (char_length(token) between 20 and 300),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  platform    text not null check (platform in ('ios', 'android')),
  updated_at  timestamptz not null default now()
);
create index if not exists push_tokens_user on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;
drop policy if exists "own push tokens" on public.push_tokens;
create policy "own push tokens" on public.push_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.push_tokens from anon, authenticated;
grant select, delete on public.push_tokens to authenticated;
grant insert (token, user_id, platform, updated_at), update (token, user_id, platform, updated_at) on public.push_tokens to authenticated;

-- Who was told about whom, and when: the 6-hour limit.
create table if not exists public.push_log (
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  sent_at       timestamptz not null default now(),
  primary key (owner_id, recipient_id)
);
alter table public.push_log enable row level security;
revoke all on public.push_log from anon, authenticated;

-- The friends of this room's owner who should hear about it now, with their phones.
create or replace function public.push_targets(p_owner uuid)
returns table (recipient_id uuid, token text, platform text)
language sql stable security definer set search_path = public as $$
  select t.user_id, t.token, t.platform
  from public.friendships f
  join public.rooms r on r.owner_id = p_owner and r.visibility <> 'private'
  join public.push_tokens t on t.user_id = case when f.requester = p_owner then f.addressee else f.requester end
  left join public.push_log l on l.owner_id = p_owner and l.recipient_id = t.user_id
  where f.status = 'accepted' and p_owner in (f.requester, f.addressee)
    and (l.sent_at is null or l.sent_at < now() - interval '6 hours');
$$;

create or replace function public.log_push(p_owner uuid, p_recipients uuid[])
returns void
language sql security definer set search_path = public as $$
  insert into public.push_log (owner_id, recipient_id, sent_at)
  select p_owner, unnest(p_recipients), now()
  on conflict (owner_id, recipient_id) do update set sent_at = excluded.sent_at;
$$;

-- A phone that Apple says is gone.
create or replace function public.drop_push_token(p_token text)
returns void
language sql security definer set search_path = public as $$
  delete from public.push_tokens where token = p_token;
$$;

revoke execute on function public.push_targets(uuid), public.log_push(uuid, uuid[]), public.drop_push_token(text)
  from public, anon, authenticated;
grant execute on function public.push_targets(uuid), public.log_push(uuid, uuid[]), public.drop_push_token(text)
  to service_role;
