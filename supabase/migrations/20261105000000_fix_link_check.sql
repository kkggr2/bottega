-- Bottega: fix the link rule on pieces.
-- Postgres caps regex repeat counts at 255, so '{3,500}' made every insert with a link fail.
-- Run this once in the Supabase SQL editor after the earlier migrations.

alter table public.pieces drop constraint if exists pieces_link_check;
alter table public.pieces add constraint pieces_link_check
  check (link is null or (link ~ '^https://\S+$' and char_length(link) between 11 and 500));
