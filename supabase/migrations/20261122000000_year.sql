-- Your Year in the Room: one call that adds up the signed-in person's year.
-- The pieces themselves are read by the app (it already can); this adds what only the server sees:
-- visits to your room, notes and recommendations left for you, friends, quizzes, clubs.
-- Run this in the Supabase SQL editor. It is safe to run again.

create or replace function public.my_year(p_year int)
returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
       span as (select make_date(p_year, 1, 1)::timestamptz as s, make_date(p_year + 1, 1, 1)::timestamptz as e),
       quiz as (
         select a.quiz_id, a.score, a.correct
         from public.quiz_attempts a, me
         where a.user_id = me.id and a.finished_at is not null
           and a.day >= make_date(p_year, 1, 1) and a.day < make_date(p_year + 1, 1, 1)
       )
  select case when (select id from me) is null then null else jsonb_build_object(
    'visits', (select count(*) from public.events ev, me, span
                where ev.name = 'room_view' and ev.room_owner = me.id
                  and (ev.user_id is null or ev.user_id <> me.id) and ev.at >= span.s and ev.at < span.e),
    'visitors', (select count(distinct coalesce(ev.user_id::text, ev.visitor::text)) from public.events ev, me, span
                where ev.name = 'room_view' and ev.room_owner = me.id
                  and (ev.user_id is null or ev.user_id <> me.id) and ev.at >= span.s and ev.at < span.e),
    'notes', (select count(*) from public.notes n, me, span
                where n.room_owner = me.id and n.author <> me.id and n.created_at >= span.s and n.created_at < span.e),
    'recs', (select count(*) from public.recommendations r, me, span
                where r.to_user = me.id and r.created_at >= span.s and r.created_at < span.e),
    'friends', (select count(*) from public.friendships f, me
                where f.status = 'accepted' and (f.requester = me.id or f.addressee = me.id)),
    'new_friends', (select count(*) from public.friendships f, me, span
                where f.status = 'accepted' and (f.requester = me.id or f.addressee = me.id)
                  and f.created_at >= span.s and f.created_at < span.e),
    'now_sets', (select count(*) from public.events ev, me, span
                where ev.name = 'now_set' and ev.user_id = me.id and ev.at >= span.s and ev.at < span.e),
    'quizzes', (select count(*) from quiz),
    'quiz_correct', (select coalesce(sum(correct), 0) from quiz),
    'quiz_best', (select coalesce(max(score), 0) from quiz),
    'quiz_best_id', (select quiz_id from quiz order by score desc limit 1),
    'club_quizzes', (select count(*) from public.club_quiz_attempts a, me, span
                where a.user_id = me.id and a.finished_at >= span.s and a.finished_at < span.e),
    'clubs', (select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'emoji', c.emoji) order by m.joined_at), '[]'::jsonb)
                from public.club_members m join public.clubs c on c.id = m.club_id, me
                where m.user_id = me.id)
  ) end;
$$;
revoke execute on function public.my_year(int) from public, anon;
grant execute on function public.my_year(int) to authenticated;
