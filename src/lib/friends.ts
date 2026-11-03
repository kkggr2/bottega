import { supabase } from "./supabase";
import type { Friendship } from "./types";

export type Relation = "none" | "outgoing" | "incoming" | "friends";

export function relationOf(row: Friendship | null | undefined, me: string): Relation {
  if (!row) return "none";
  if (row.status === "accepted") return "friends";
  return row.requester === me ? "outgoing" : "incoming";
}

export async function friendshipWith(me: string, other: string): Promise<Friendship | null> {
  const { data } = await supabase()
    .from("friendships")
    .select("*")
    .or(`and(requester.eq.${me},addressee.eq.${other}),and(requester.eq.${other},addressee.eq.${me})`)
    .maybeSingle();
  return (data as Friendship | null) ?? null;
}

/** Send a request, or accept theirs if they already asked. */
export async function befriend(me: string, other: string): Promise<Relation> {
  const existing = await friendshipWith(me, other);
  const rel = relationOf(existing, me);
  if (rel === "incoming") {
    await accept(other, me);
    return "friends";
  }
  if (rel !== "none") return rel;
  const { error } = await supabase().from("friendships").insert({ requester: me, addressee: other });
  if (error) throw error;
  return "outgoing";
}

export async function accept(requester: string, me: string): Promise<void> {
  const { error } = await supabase()
    .from("friendships")
    .update({ status: "accepted" })
    .eq("requester", requester)
    .eq("addressee", me);
  if (error) throw error;
}

/** Decline, cancel or unfriend: all three delete the row. */
export async function unfriend(me: string, other: string): Promise<void> {
  const { error } = await supabase()
    .from("friendships")
    .delete()
    .or(`and(requester.eq.${me},addressee.eq.${other}),and(requester.eq.${other},addressee.eq.${me})`);
  if (error) throw error;
}
