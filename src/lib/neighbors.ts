"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

/**
 * The rooms on either side of this one, in the same order as your library shelf
 * (yours first, then friends by username), so you can swipe from room to room.
 */
export function useNeighbors(meId: string | null, meName: string | null, ownerId: string | null) {
  const [order, setOrder] = useState<string[]>([]);

  useEffect(() => {
    if (!meId || !meName) return;
    let live = true;
    (async () => {
      const sb = supabase();
      const { data: rows } = await sb.from("friendships").select("requester, addressee").eq("status", "accepted");
      const ids = (rows ?? []).map((f) => (f.requester === meId ? f.addressee : f.requester) as string);
      const { data: people } = ids.length ? await sb.from("profiles").select("username").in("id", ids) : { data: [] };
      const names = ((people ?? []) as { username: string }[]).map((p) => p.username).sort((a, b) => a.localeCompare(b));
      if (live) setOrder([meName, ...names]);
    })();
    return () => { live = false; };
  }, [meId, meName, ownerId]);

  return order;
}

export function around(order: string[], username: string): { prev: string | null; next: string | null } {
  const i = order.indexOf(username);
  if (i < 0 || order.length < 2) return { prev: null, next: null };
  return { prev: order[(i - 1 + order.length) % order.length], next: order[(i + 1) % order.length] };
}
