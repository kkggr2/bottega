import { joinClub } from "./clubs";
import { friendlyError, supabase } from "./supabase";
import { USERNAME } from "./themes";
import { befriend } from "./friends";
import { cameFrom, currentVia, forgetCameFrom, track } from "./track";

/*
 * Guests: join a club from its link with just a name. Supabase makes an "anonymous" account
 * (supabase/migrations/20261120000000_guests.sql says what guests can and can't do). Adding an email
 * later keeps everything: the room, the clubs, the quiz scores.
 */

/** Returns an error to show, or null once the guest is in the club. */
export async function joinAsGuest(slug: string, username: string): Promise<string | null> {
  if (!USERNAME.test(username)) return "Pick 3–20 lowercase letters, numbers or underscores.";
  const sb = supabase();
  // Check the name first, so a taken name doesn't leave an empty guest account behind.
  const { data: taken } = await sb.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return "That name is taken. Try another.";

  const { data: existing } = await sb.auth.getSession();
  if (!existing.session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) {
      return /anonymous.*disabled|not enabled/i.test(error.message)
        ? "Joining as a guest isn't switched on yet. Make a room instead."
        : friendlyError(error, "Couldn't let you in. Try again.");
    }
  }
  const { error: nameError } = await sb.rpc("claim_username", { p_username: username, p_room_name: "", p_theme: "oak" });
  if (nameError && !/already have a username/i.test(nameError.message)) {
    return friendlyError(nameError, "Couldn't save your name. Try again.");
  }
  const via = currentVia();
  track("room_claimed", { detail: via ? `via:${via}` : `guest:${slug}` });
  const joinError = await joinClub(slug, "guest");
  if (joinError) return joinError;
  track("club_join", { detail: `guest:${slug}` });
  return null;
}

/**
 * Start a room with just a name, no email: look around, fill it, then add an email to keep it
 * (the "Keep your room" card in the room). Returns an error to show, or null once the room exists.
 */
export async function startAsGuest(username: string): Promise<string | null> {
  if (!USERNAME.test(username)) return "Pick 3–20 lowercase letters, numbers or underscores.";
  const sb = supabase();
  const { data: taken } = await sb.from("profiles").select("id").eq("username", username).maybeSingle();
  if (taken) return "That name is taken. Try another.";
  const { data: existing } = await sb.auth.getSession();
  if (!existing.session) {
    const { error } = await sb.auth.signInAnonymously();
    if (error) {
      return /anonymous.*disabled|not enabled/i.test(error.message)
        ? "Starting without an email isn't switched on. Sign up with your email below."
        : /rate limit|too many/i.test(error.message)
          ? "Lots of people are arriving right now. Wait a minute and try again, or sign up with your email below."
          : friendlyError(error, "Couldn't open your room. Try again.");
    }
  }
  const { error: nameError } = await sb.rpc("claim_username", { p_username: username, p_room_name: "", p_theme: "oak" });
  if (nameError && !/already have a username/i.test(nameError.message)) {
    return friendlyError(nameError, "Couldn't save your name. Try again.");
  }
  const via = currentVia();
  track("room_claimed", { detail: via ? `via:${via}` : "guest:room" });
  return null;
}

/** After a guest keeps their account: the friend request to the person whose room brought them. */
export async function befriendWhoBroughtMe(meId: string): Promise<void> {
  const from = cameFrom();
  if (!from) return;
  try {
    let id = from.id;
    if (!id) {
      const { data } = await supabase().from("profiles").select("id").eq("username", from.username).maybeSingle();
      id = (data?.id as string) ?? "";
    }
    if (id && id !== meId) {
      await befriend(meId, id);
      track("friend_request", { room: id, detail: "after_save" });
    }
  } catch {
    // They can still add each other from the room.
  }
  forgetCameFrom();
}

/** Step 1 of keeping a guest account: send a code to this email. */
export async function sendSaveCode(email: string): Promise<string | null> {
  const { error } = await supabase().auth.updateUser({ email });
  if (!error) return null;
  if (/already|registered|exists/i.test(error.message)) return "There's already an account with this email. Log in with it instead.";
  return friendlyError(error, "Couldn't send the email. Try again.");
}

/** Step 2: the code from the email, and a password for next time. */
export async function confirmSave(email: string, code: string, password: string): Promise<string | null> {
  const sb = supabase();
  const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: "email_change" });
  if (error) return "That code didn't work. Check it, or ask for a new email.";
  const { error: pwError } = await sb.auth.updateUser({ password });
  if (pwError) return friendlyError(pwError, "Your email is saved, but the password didn't save. Use “Forgot password” to set one.");
  await sb.auth.refreshSession();
  track("account_created", { detail: "guest" });
  return null;
}
