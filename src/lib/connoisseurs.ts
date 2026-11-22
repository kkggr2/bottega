import { supabase } from "./supabase";

/* Founding Connoisseurs: supabase/migrations/20261128000000_connoisseurs.sql. */

export type Connoisseur = { username: string; room_name: string; theme: string; number: number; note: string; covers: string[] };

export async function connoisseurs(): Promise<Connoisseur[]> {
  const { data } = await supabase().rpc("connoisseurs");
  return (data ?? []) as Connoisseur[];
}

export async function connoisseurNumber(username: string): Promise<number | null> {
  const { data } = await supabase().rpc("connoisseur_number", { p_username: username });
  return typeof data === "number" ? data : null;
}
