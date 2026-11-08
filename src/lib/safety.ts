import { supabase } from "./supabase";

/* Reporting, blocking and deleting an account. */

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase().auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

export async function reportRoom(ownerId: string, reason: string): Promise<string | null> {
  const res = await fetch("/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ ownerId, reason }),
  });
  if (res.ok) return null;
  return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't send the report. Try again.";
}

export async function blockPerson(meId: string, otherId: string): Promise<string | null> {
  const { error } = await supabase().from("blocks").insert({ blocker: meId, blocked: otherId });
  if (error && !/duplicate/i.test(error.message)) {
    return /blocks/.test(error.message)
      ? "The database needs its latest update. Run the newest file in supabase/migrations."
      : "Couldn't block. Try again.";
  }
  return null;
}

export async function deleteAccount(): Promise<string | null> {
  const res = await fetch("/api/account/delete", { method: "POST", headers: await authHeader() });
  if (res.ok) return null;
  return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't delete the account. Try again.";
}
