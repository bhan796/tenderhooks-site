import { NextRequest, NextResponse } from "next/server";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type PrefRow = {
  user_id: string;
  regions: string[] | null;
  keywords: string[] | null;
  exclude_keywords: string[] | null;
};

type FeedTender = {
  source: string;
  title: string;
  buyer: string;
  region: string;
  close_date: string | null;
  url: string;
};

function normalizeApifyActorId(actorId: string) {
  return actorId.includes("/") ? actorId.replace("/", "~") : actorId;
}

function okUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function parseMaybeDate(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  const m = v.match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

function dedupe(rows: FeedTender[]) {
  const seen = new Set<string>();
  const out: FeedTender[] = [];
  for (const r of rows) {
    const key = `${r.source}|${r.url}|${r.title}|${r.buyer}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function parseJsonRows(source: string, payload: unknown): FeedTender[] {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? (["items", "results", "data", "notices", "opportunities"]
          .map((k) => (payload as Record<string, unknown>)[k])
          .find((v) => Array.isArray(v)) as unknown[] | undefined) || []
      : [];

  return items
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      source,
      title: String(x.title || x.notice_title || "Untitled opportunity").trim(),
      buyer: String(x.buyer || x.agency || "Unknown buyer").trim(),
      region: String(x.region || x.location || (source === "GETS" ? "New Zealand" : "Australia")).trim(),
      close_date: parseMaybeDate(String(x.close_date || x.deadline || "")),
      url: String(x.url || x.link || "").trim(),
    }))
    .filter((x) => x.title.length >= 4 && okUrl(x.url));
}

async function fetchFromApify(source: "GETS" | "AusTender", actorId?: string): Promise<FeedTender[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token || !actorId) return [];

  const normalizedId = normalizeApifyActorId(actorId);
  const endpoint = `https://api.apify.com/v2/acts/${encodeURIComponent(
    normalizedId,
  )}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&clean=true`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "TenderHooksBot/1.0 (+https://tenderhooks.co.nz)",
    },
    body: JSON.stringify({}),
  });
  if (!res.ok) return [];

  const payload = await res.json().catch(() => null);
  if (!payload) return [];
  return parseJsonRows(source, payload);
}

function parseXmlRows(source: string, text: string): FeedTender[] {
  const entries = text.match(/<(item|entry)\b[\s\S]*?<\/(item|entry)>/gi) || [];
  const pick = (block: string, tag: string) => {
    const rx = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
    const m = block.match(rx);
    return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
  };
  return entries
    .map((b) => {
      const title = pick(b, "title") || "Untitled opportunity";
      let url = pick(b, "link");
      if (!url) {
        const href = b.match(/<link[^>]*href=["']([^"']+)["']/i);
        url = href?.[1] || "";
      }
      const dt = pick(b, "pubDate") || pick(b, "updated") || pick(b, "published");
      return {
        source,
        title,
        buyer: "Unknown buyer",
        region: source === "GETS" ? "New Zealand" : "Australia",
        close_date: parseMaybeDate(dt),
        url,
      };
    })
    .filter((x) => x.title.length >= 4 && okUrl(x.url));
}

function parseCsvRows(source: string, text: string): FeedTender[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((x) => x.trim().toLowerCase());
  const idx = (name: string) => headers.indexOf(name);
  const iTitle = [idx("title"), idx("notice_title")].find((i) => i >= 0) ?? -1;
  const iBuyer = [idx("buyer"), idx("agency")].find((i) => i >= 0) ?? -1;
  const iRegion = [idx("region"), idx("location")].find((i) => i >= 0) ?? -1;
  const iClose = [idx("close_date"), idx("deadline")].find((i) => i >= 0) ?? -1;
  const iUrl = [idx("url"), idx("link")].find((i) => i >= 0) ?? -1;
  return lines
    .slice(1)
    .map((line) => line.split(","))
    .map((cols) => ({
      source,
      title: (iTitle >= 0 ? cols[iTitle] : "Untitled opportunity")?.trim() || "Untitled opportunity",
      buyer: (iBuyer >= 0 ? cols[iBuyer] : "Unknown buyer")?.trim() || "Unknown buyer",
      region: (iRegion >= 0 ? cols[iRegion] : source === "GETS" ? "New Zealand" : "Australia")?.trim() || "Unknown region",
      close_date: parseMaybeDate(iClose >= 0 ? cols[iClose] : ""),
      url: (iUrl >= 0 ? cols[iUrl] : "")?.trim() || "",
    }))
    .filter((x) => x.title.length >= 4 && okUrl(x.url));
}

async function fetchFeed(source: "GETS" | "AusTender", url?: string): Promise<FeedTender[]> {
  if (!url) return [];
  const res = await fetch(url, {
    headers: { "user-agent": "TenderHooksBot/1.0 (+https://tenderhooks.co.nz)" },
  });
  if (!res.ok) return [];

  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  const text = await res.text();

  if (contentType.includes("json")) {
    try {
      return parseJsonRows(source, JSON.parse(text));
    } catch {
      return [];
    }
  }
  if (contentType.includes("xml") || /<(rss|feed)\b/i.test(text)) {
    return parseXmlRows(source, text);
  }
  if (contentType.includes("csv") || text.includes(",")) {
    return parseCsvRows(source, text);
  }

  try {
    return parseJsonRows(source, JSON.parse(text));
  } catch {
    return [];
  }
}

function scoreTender(t: FeedTender, prefs: PrefRow) {
  let score = 0;
  const reasons: string[] = [];
  const text = `${t.title} ${t.buyer} ${t.region}`.toLowerCase();

  for (const kw of prefs.keywords || []) {
    if (kw && text.includes(kw.toLowerCase())) {
      score += 12;
      reasons.push(`keyword:${kw}`);
    }
  }
  for (const rg of prefs.regions || []) {
    if (rg && text.includes(rg.toLowerCase())) {
      score += 8;
      reasons.push(`region:${rg}`);
    }
  }
  for (const ex of prefs.exclude_keywords || []) {
    if (ex && text.includes(ex.toLowerCase())) {
      score -= 15;
      reasons.push(`exclude:${ex}`);
    }
  }
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

export async function POST(req: NextRequest) {
  const runSecret = process.env.DIGEST_RUN_SECRET;
  const headerSecret = req.headers.get("x-digest-secret") || "";
  if (!runSecret || headerSecret !== runSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = requireSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const apifyGetsActorId = process.env.APIFY_GETS_ACTOR_ID;
  const apifyAusActorId = process.env.APIFY_AUSTENDER_ACTOR_ID;
  const getsUrl = process.env.GETS_FEED_URL;
  const austenderUrl = process.env.AUSTENDER_FEED_URL;
  const [apifyGetsRows, apifyAusRows] = await Promise.all([
    fetchFromApify("GETS", apifyGetsActorId),
    fetchFromApify("AusTender", apifyAusActorId),
  ]);
  const [fallbackGetsRows, fallbackAusRows] = await Promise.all([
    apifyGetsRows.length ? Promise.resolve([] as FeedTender[]) : fetchFeed("GETS", getsUrl),
    apifyAusRows.length ? Promise.resolve([] as FeedTender[]) : fetchFeed("AusTender", austenderUrl),
  ]);

  const getsRows = apifyGetsRows.length ? apifyGetsRows : fallbackGetsRows;
  const ausRows = apifyAusRows.length ? apifyAusRows : fallbackAusRows;
  const feedRows = dedupe([...getsRows, ...ausRows]);

  const { data: prefs, error: prefErr } = await supabase
    .from("user_preferences")
    .select("user_id, regions, keywords, exclude_keywords");
  if (prefErr) return NextResponse.json({ error: prefErr.message }, { status: 500 });

  // active subscriber emails
  const { data: billingRows, error: billingErr } = await supabase
    .from("billing_subscriptions")
    .select("customer_email, status")
    .in("status", ["trialing", "active"]);
  if (billingErr) return NextResponse.json({ error: billingErr.message }, { status: 500 });
  const activeEmails = new Set(
    (billingRows || [])
      .map((r: any) => String(r.customer_email || "").toLowerCase())
      .filter(Boolean),
  );

  // map auth users email -> id
  const emailToUserId = new Map<string, string>();
  let page = 1;
  // up to ~5000 users
  while (page <= 50) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const users = data.users || [];
    for (const u of users) {
      const em = (u.email || "").toLowerCase();
      if (em) emailToUserId.set(em, u.id);
    }
    if (users.length < 100) break;
    page += 1;
  }

  const activeUserIds = new Set<string>();
  for (const em of activeEmails) {
    const uid = emailToUserId.get(em);
    if (uid) activeUserIds.add(uid);
  }

  const eligiblePrefs = (prefs as PrefRow[]).filter((p) => activeUserIds.has(p.user_id));

  let usersProcessed = 0;
  let inserted = 0;
  for (const pref of eligiblePrefs) {
    const scored = feedRows
      .map((t) => ({ t, s: scoreTender(t, pref).score }))
      .filter((x) => x.s >= 20)
      .sort((a, b) => b.s - a.s)
      .slice(0, 25);

    await supabase
      .from("tender_recommendations")
      .delete()
      .eq("user_id", pref.user_id)
      .eq("recommended_for_date", today);

    if (scored.length) {
      const rows = scored.map(({ t, s }) => ({
        user_id: pref.user_id,
        title: t.title,
        score: s,
        buyer: t.buyer,
        close_date: t.close_date,
        region: t.region,
        source: t.source,
        url: t.url,
        recommended_for_date: today,
        is_recommended: true,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("tender_recommendations").insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      inserted += rows.length;
    }
    usersProcessed += 1;
  }

  await supabase.from("digest_run_logs").insert({
    run_date: today,
    users_processed: usersProcessed,
    rows_fetched: feedRows.length,
    rows_inserted: inserted,
    status: "ok",
    notes: `gets=${getsRows.length},austender=${ausRows.length},eligible_users=${eligiblePrefs.length},source_gets=${apifyGetsRows.length ? "apify" : "feed"},source_aus=${apifyAusRows.length ? "apify" : "feed"}`,
  });

  return NextResponse.json({
    ok: true,
    runDate: today,
    rowsFetched: feedRows.length,
    usersProcessed,
    rowsInserted: inserted,
    eligibleUsers: eligiblePrefs.length,
  });
}
