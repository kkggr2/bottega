# Curated rooms

Rooms by bookshops, cinemas, clubs, critics and artists that anyone can step into, even with no friends on Bottega yet.
They show up as **"Rooms to visit"** in the Library and on the welcome page, and get a small label under their name
("@moroccobound · Bookshop · London").

## Who to ask

People with an audience and good taste, who'd enjoy showing it:
- **Bookshops:** Pages of Hackney, Morocco Bound, Penguen Kitabevi, The Munich Readery
- **Cinemas and film clubs:** tu film, ukino, Sinematek, Lost in Frenchlation, FilmKoop
- **Clubs** that said yes (their club's room)
- Critics, booktubers, small musicians, writers

## The message

> Hi [name],
>
> I'm Çağla, I make Bottega, an app where everyone gets one room for the films, books and records they love.
>
> Would [shop/cinema] like a room of its own? A wall of your staff picks, what's in the window this month, the
> film you'd put on tonight. It's shown to everyone new on Bottega as a "Room to visit", with your name and a
> link to you. It takes about ten minutes to fill, and I'm happy to set it up with you.
>
> Free, no ads. Here's an example of a room: bottegarooms.com/r/cagla
>
> Warmly, Çağla

## How to add a curated room

1. They make an account and fill their room (at least 6 pieces with covers looks best).
2. In their room: **⋯ → Customize room → Who can come in → Anyone with the link** (the room must be public).
3. In Supabase → **SQL Editor**, run (change the username, label and line):

```sql
insert into public.featured_rooms (owner_id, label, blurb, position)
select id, 'Bookshop · London', 'Staff picks from an indie shop in Bermondsey.', 10
from public.profiles where username = 'moroccobound'
on conflict (owner_id) do update set label = excluded.label, blurb = excluded.blurb, position = excluded.position;
```

- **label:** up to 40 characters, shown under their name ("Cinema · Munich", "Book club · Istanbul").
- **blurb:** one line, up to 140 characters.
- **position:** lower numbers come first.

To take one down:

```sql
delete from public.featured_rooms where owner_id = (select id from public.profiles where username = 'moroccobound');
```

Until at least one room is featured, the "Rooms to visit" row simply doesn't appear.
