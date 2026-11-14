-- Bottega: let the server (the secret key, service_role) read and write the tables it uses.
-- This project doesn't hand new tables to service_role automatically, so saving a report failed
-- ("Couldn't send the report"). service_role is only ever used on the server, never in the app.
-- Run this in the Supabase SQL editor. It is safe to run again.

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Tables added later get the same.
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
