// ============================================================
// Spartacus — submit-lead Edge Function
// ------------------------------------------------------------
// The anti-spam gateway in front of the leads table.
//
// Flow:  browser  ->  this function  ->  leads table (service_role)
//
// It enforces, in order:
//   1. Origin allow-list + CORS
//   2. Honeypot field (bots fill hidden inputs)
//   3. Cloudflare Turnstile token (if TURNSTILE_SECRET is set)
//   4. Input validation + length caps + normalisation
//   5. Per-IP rate limit (hashed IP, never stored raw)
//   6. Insert using the service_role key (never exposed to the browser)
//
// Deploy:
//   supabase functions deploy submit-lead --no-verify-jwt
// Secrets:
//   supabase secrets set TURNSTILE_SECRET=xxxxx
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically)
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://spartacusmartialarts.com",
  "https://www.spartacusmartialarts.com",
];

const MAX_PER_IP = 5;        // submissions allowed...
const WINDOW_MINUTES = 10;   // ...per this many minutes

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const json = (body: unknown, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s.length ? s : null;
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  // 1. Origin allow-list -----------------------------------------------------
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return json({ error: "forbidden_origin" }, 403, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_json" }, 400, origin);
  }

  // 2. Honeypot — a real user never fills this hidden field -------------------
  if (clean(body.company, 100)) {
    // Pretend success so the bot doesn't learn it was caught.
    return json({ ok: true }, 200, origin);
  }

  // 3. Cloudflare Turnstile ---------------------------------------------------
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET");
  if (turnstileSecret) {
    const token = clean(body.turnstile_token, 2048);
    if (!token) return json({ error: "captcha_missing" }, 400, origin);

    const form = new FormData();
    form.append("secret", turnstileSecret);
    form.append("response", token);
    const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip) form.append("remoteip", ip);

    try {
      const verify = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", body: form },
      ).then((r) => r.json());
      if (!verify.success) return json({ error: "captcha_failed" }, 403, origin);
    } catch {
      return json({ error: "captcha_unavailable" }, 503, origin);
    }
  }

  // 4. Validation -------------------------------------------------------------
  const full_name = clean(body.name ?? body.full_name, 80);
  if (!full_name || full_name.length < 2) return json({ error: "invalid_name" }, 400, origin);

  const rawPhone = clean(body.phone, 20) ?? "";
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return json({ error: "invalid_phone" }, 400, origin);

  const email = clean(body.email, 120);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return json({ error: "invalid_email" }, 400, origin);
  }

  const ageRaw = clean(body.age, 3);
  if (ageRaw && !/^\d{1,2}$/.test(ageRaw)) return json({ error: "invalid_age" }, 400, origin);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // 5. Per-IP rate limit (IP is hashed, never stored in the clear) -------------
  const rawIp =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const ipHash = await sha256(rawIp + "|spartacus-lead");
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { count } = await supabase
    .from("lead_submissions")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_PER_IP) {
    return json({ error: "rate_limited" }, 429, origin);
  }

  // 6. Insert -----------------------------------------------------------------
  const { error } = await supabase.from("leads").insert({
    full_name,
    phone: rawPhone,
    email,
    age: ageRaw,
    city: clean(body.location ?? body.city, 80),
    program_interest: clean(body.program ?? body.program_interest, 80),
    goal: clean(body.goal, 80),
    role: clean(body.role, 80),
    preferred_time: clean(body.time ?? body.preferred_time, 40),
    message: clean(body.message, 1000),
    source: "website",
    website_source: "spartacus",
    utm: (body.utm && typeof body.utm === "object") ? body.utm : null,
  });

  if (error) {
    console.error("insert failed:", error.message);
    return json({ error: "insert_failed" }, 500, origin);
  }

  await supabase.from("lead_submissions").insert({ ip_hash: ipHash });

  return json({ ok: true }, 200, origin);
});
