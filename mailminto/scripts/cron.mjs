// Local 24/7 background cron — runs every INTERVAL_MS, hits /api/cron/process-all.
// Usage: npm run cron  (in a separate terminal alongside `npm run dev`)
import { setTimeout as sleep } from "node:timers/promises";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // .env.local missing — secret must be in process.env already
  }
}
loadEnv();

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const SECRET = process.env.CRON_SECRET;
const INTERVAL_MS = Number(process.env.CRON_INTERVAL_MS ?? 5 * 60 * 1000);

if (!SECRET) {
  console.error("CRON_SECRET missing in .env.local");
  process.exit(1);
}

const url = `${APP_URL}/api/cron/process-all`;

console.log(`[cron] starting — every ${Math.round(INTERVAL_MS / 1000)}s → ${url}`);

let running = false;

async function tick() {
  if (running) {
    console.log(`[cron] previous tick still running, skipping`);
    return;
  }
  running = true;
  const startedAt = new Date();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${SECRET}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[cron] ${startedAt.toISOString()} failed ${res.status}`, body);
    } else {
      const summary = body.results
        ?.map((r) => {
          if (!r.ok) return `${r.user_id.slice(0, 8)}=err:${r.error}`;
          const total = r.summary?.reduce((s, a) => s + (a.processed ?? 0), 0) ?? 0;
          return `${r.user_id.slice(0, 8)}=${total}`;
        })
        .join(" ");
      console.log(
        `[cron] ${startedAt.toISOString()} ok — ${body.users_processed ?? 0} users — ${summary ?? ""}`,
      );
    }
  } catch (err) {
    console.error(`[cron] ${startedAt.toISOString()} error:`, err.message ?? err);
  } finally {
    running = false;
  }
}

await tick();
while (true) {
  await sleep(INTERVAL_MS);
  await tick();
}
