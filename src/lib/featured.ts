import { supabase } from "./supabase";

/* Curated rooms: supabase/migrations/20261124000000_featured_rooms.sql. */

export type FeaturedRoom = { username: string; room_name: string; theme: string; label: string; blurb: string; covers: string[] };

export async function featuredRooms(): Promise<FeaturedRoom[]> {
  const { data } = await supabase().rpc("featured_rooms");
  return (data ?? []) as FeaturedRoom[];
}

export async function featuredLabel(username: string): Promise<string | null> {
  const { data } = await supabase().rpc("featured_label", { p_username: username });
  return (data as string | null) ?? null;
}
