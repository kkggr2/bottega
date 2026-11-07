import type { NextRequest } from "next/server";
import { validUnsubscribe } from "@/lib/digest-email";
import { supabaseAdmin } from "@/lib/supabase-admin";

/*
 * Stop the daily email.
 * GET shows a page with one button (so link checkers in mail apps can't unsubscribe anyone by visiting).
 * POST does it: from that button, or from the mail app's own one-click unsubscribe.
 */

const page = (title: string, body: string) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · Bottega</title>
<style>body{margin:0;background:#F2E8D3;color:#2F2822;font:16px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif}
main{max-width:460px;margin:12vh auto;padding:0 16px}h1{font:400 34px/1.1 Georgia,serif;margin:0 0 12px}
button,a.btn{display:inline-block;margin-top:16px;padding:10px 18px;border:0;border-radius:999px;background:#2F2822;color:#F2E8D3;font:inherit;text-decoration:none;cursor:pointer}
p{color:#6B5F52}</style></head><body><main>${body}</main></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });

function params(request: NextRequest) {
  return { u: request.nextUrl.searchParams.get("u") ?? "", t: request.nextUrl.searchParams.get("t") ?? "" };
}

export async function GET(request: NextRequest) {
  const { u, t } = params(request);
  if (!validUnsubscribe(u, t)) return page("Link not valid", `<h1>That link doesn't work.</h1><p>You can turn the emails off in your library instead.</p><a class="btn" href="/">Open Bottega</a>`);
  return page("Stop emails", `<h1>Stop the daily email?</h1>
<p>You won't hear when friends put something on. You can turn it back on in your library.</p>
<form method="post"><button type="submit">Stop these emails</button></form>`);
}

export async function POST(request: NextRequest) {
  const { u, t } = params(request);
  if (!validUnsubscribe(u, t)) return new Response("Link not valid", { status: 400 });
  const db = supabaseAdmin();
  if (!db) return new Response("Not set up", { status: 500 });
  const { error } = await db.rpc("stop_digest", { p_user: u });
  if (error) return new Response("Couldn't update. Try again.", { status: 500 });
  return page("Emails stopped", `<h1>Done. No more daily emails.</h1><p>You can turn them back on in your library whenever you like.</p><a class="btn" href="/">Open Bottega</a>`);
}
