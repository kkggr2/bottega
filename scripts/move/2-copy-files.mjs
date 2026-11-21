// Step 2 of the Frankfurt move (docs/FRANKFURT_MOVE.md): copy every uploaded picture and sound clip
// (bucket "media") from the Singapore project to the Frankfurt one. Safe to run again: files already
// copied are simply replaced. Run from the project folder:  node scripts/move/2-copy-files.mjs
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => { if (s.includes(question)) process.stdout.write(s); };
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write("\n"); resolve(answer.trim()); });
  });
}

console.log("You'll need each project's URL and secret key (Settings → API Keys → Secret keys).");
const oldUrl = await ask("Singapore (old) project URL, e.g. https://xxxx.supabase.co: ");
const oldKey = await ask("Singapore (old) secret key (hidden): ", true);
const newUrl = await ask("Frankfurt (new) project URL: ");
const newKey = await ask("Frankfurt (new) secret key (hidden): ", true);
if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(oldUrl) || !/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(newUrl) || oldUrl === newUrl) {
  console.log("Those URLs don't look right (https://<something>.supabase.co, and two different ones).");
  process.exit(1);
}

const BUCKET = "media";
const from = createClient(oldUrl, oldKey, { auth: { persistSession: false } }).storage.from(BUCKET);
const to = createClient(newUrl, newKey, { auth: { persistSession: false } }).storage.from(BUCKET);

/** Every file path in the bucket (files sit in folders named after their owner). */
async function listAll(bucket, prefix = "") {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await bucket.list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`Couldn't list "${prefix || "/"}": ${error.message}`);
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) out.push(...(await listAll(bucket, path)));
      else out.push(path);
    }
    if (data.length < 1000) return out;
  }
}

const paths = await listAll(from);
console.log(`Found ${paths.length} files in Singapore. Copying…`);
let done = 0;
const failed = [];
async function copy(path) {
  const { data: blob, error } = await from.download(path);
  if (error || !blob) return failed.push(`${path}: ${error?.message ?? "no data"}`);
  const { error: upError } = await to.upload(path, await blob.arrayBuffer(), { contentType: blob.type || undefined, upsert: true });
  if (upError) failed.push(`${path}: ${upError.message}`);
  done += 1;
  if (done % 20 === 0 || done === paths.length) process.stdout.write(`\r  ${done} of ${paths.length}`);
}
for (let i = 0; i < paths.length; i += 4) await Promise.all(paths.slice(i, i + 4).map(copy));
process.stdout.write("\n");

const copied = await listAll(to);
const missing = paths.filter((p) => !copied.includes(p));
if (failed.length || missing.length) {
  console.log(`✗ ${failed.length} failed, ${missing.length} missing in Frankfurt. Run this again; it picks up where it left off.`);
  for (const f of failed.slice(0, 20)) console.log("  ", f);
  process.exit(1);
}
console.log(`✓ All ${paths.length} files are in Frankfurt. Next: bash scripts/move/3-compare.sh`);
