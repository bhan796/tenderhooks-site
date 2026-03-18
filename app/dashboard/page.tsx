"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GL } from "@/components/gl";
import { requireSupabaseConfig, supabase } from "@/lib/supabase";

type TenderItem = {
  id: string;
  title: string;
  score: number;
  buyer: string;
  close: string | null;
  region: string;
  source: string;
  url: string;
  recommendedForDate: string;
  matchReasons: string[];
  matchBreakdown: {
    keyword_points?: number;
    region_points?: number;
    exclude_penalty?: number;
    final_score?: number;
  };
};

type ViewMode = "today" | "history";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<TenderItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState("");
  const [requiresSubscription, setRequiresSubscription] = useState(false);
  const [countdown, setCountdown] = useState("");

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayLabel = useMemo(() => new Date().toLocaleDateString(), []);

  useEffect(() => {
    function getNzParts(nowMs: number) {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Pacific/Auckland",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(new Date(nowMs))
        .reduce<Record<string, string>>((acc, p) => {
          if (p.type !== "literal") acc[p.type] = p.value;
          return acc;
        }, {});
    }

    function getNzOffsetMinutes(nowMs: number) {
      const tzPart = new Intl.DateTimeFormat("en-US", {
        timeZone: "Pacific/Auckland",
        timeZoneName: "shortOffset",
      })
        .formatToParts(new Date(nowMs))
        .find((p) => p.type === "timeZoneName")?.value;

      const match = (tzPart || "").match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
      if (!match) return 12 * 60;
      const sign = match[1] === "-" ? -1 : 1;
      const h = Number(match[2] || "0");
      const m = Number(match[3] || "0");
      return sign * (h * 60 + m);
    }

    function getNextDigestUtcMs(nowMs: number) {
      const parts = getNzParts(nowMs);
      const y = Number(parts.year);
      const m = Number(parts.month);
      const d = Number(parts.day);
      const h = Number(parts.hour);
      const min = Number(parts.minute);
      const s = Number(parts.second);

      const isPastToday = h > 7 || (h === 7 && (min > 30 || (min === 30 && s > 0)));
      const nzDateUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
      if (isPastToday) nzDateUtc.setUTCDate(nzDateUtc.getUTCDate() + 1);

      const ty = nzDateUtc.getUTCFullYear();
      const tm = nzDateUtc.getUTCMonth();
      const td = nzDateUtc.getUTCDate();
      const targetNaiveUtc = Date.UTC(ty, tm, td, 7, 30, 0);
      const offsetMins = getNzOffsetMinutes(nowMs);
      return targetNaiveUtc - offsetMins * 60 * 1000;
    }

    function refreshCountdown() {
      const now = Date.now();
      const nextRun = getNextDigestUtcMs(now);
      const diffMs = Math.max(0, nextRun - now);
      const totalSeconds = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setCountdown(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      );
    }

    refreshCountdown();
    const timer = setInterval(refreshCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase not configured.");
      setLoading(false);
      return;
    }

    const client = requireSupabaseConfig();

    async function loadDashboard(mode: ViewMode) {
      setLoading(true);
      setError("");
      setSyncError("");

      const { data } = await client.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      const email = (user.email || "").toLowerCase();
      setEmail(email);
      const params = new URLSearchParams(window.location.search);
      const checkoutSessionId = params.get("session_id") || "";

      if (data.session?.access_token) {
        if (checkoutSessionId) {
          const syncRes = await fetch("/api/billing-sync-session", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ sessionId: checkoutSessionId }),
          }).catch(() => null);
          if (syncRes && !syncRes.ok) {
            const body = (await syncRes.json().catch(() => ({}))) as { error?: string };
            setSyncError(body.error || "Could not sync checkout session.");
          }
        }

        await fetch("/api/billing-sync", {
          method: "POST",
          headers: { authorization: `Bearer ${data.session.access_token}` },
        }).catch(() => null);
      }

      const { data: billingRows, error: billingError } = await client
        .from("billing_subscriptions")
        .select("status")
        .eq("customer_email", email)
        .in("status", ["trialing", "active"])
        .limit(1);

      if (billingError && billingError.code !== "PGRST205") {
        setError(billingError.message);
        setLoading(false);
        return;
      }

      if (!billingRows || billingRows.length === 0) {
        setRequiresSubscription(true);
        setError("");
        setLoading(false);
        return;
      }

      const baseQuery = client
        .from("tender_recommendations")
        .select("id, title, score, buyer, close_date, region, source, url, recommended_for_date, match_reasons, match_breakdown")
        .eq("user_id", user.id)
        .eq("is_recommended", true);

      const query =
        mode === "today"
          ? baseQuery.eq("recommended_for_date", todayIso).order("score", { ascending: false }).limit(25)
          : baseQuery.lt("recommended_for_date", todayIso).order("recommended_for_date", { ascending: false }).order("score", { ascending: false }).limit(50);

      const { data: rows, error: fetchError } = await query;

      if (fetchError) {
        if (fetchError.code === "PGRST205") {
          setItems([]);
          setLoading(false);
          return;
        }
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setItems(
        (rows || []).map((row: any) => ({
          id: String(row.id),
          title: String(row.title || "Untitled opportunity"),
          score: Number(row.score || 0),
          buyer: String(row.buyer || "Unknown buyer"),
          close: row.close_date ? String(row.close_date) : null,
          region: String(row.region || "Unknown region"),
          source: String(row.source || "Unknown source"),
          url: String(row.url || "#"),
          recommendedForDate: String(row.recommended_for_date || ""),
          matchReasons: Array.isArray(row.match_reasons) ? row.match_reasons.map((x: unknown) => String(x)) : [],
          matchBreakdown:
            row.match_breakdown && typeof row.match_breakdown === "object"
              ? row.match_breakdown
              : {},
        })),
      );
      setLoading(false);
    }

    loadDashboard(viewMode);

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      if (!sessionUser) {
        router.replace("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, todayIso, viewMode]);

  async function logout() {
    if (supabase) {
      const client = requireSupabaseConfig();
      await client.auth.signOut();
    }
    router.replace("/");
  }

  if (error) {
    return (
      <main className="relative min-h-svh px-4 pb-12">
        <GL hovering={false} />
        <section className="relative z-10 pt-36 max-w-3xl mx-auto font-mono text-red-400">{error}</section>
      </main>
    );
  }

  if (!email) {
    return null;
  }

  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-32 md:pt-40 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sentient text-3xl md:text-5xl">Daily Tender List</h1>
            <p className="font-mono text-foreground/65 mt-2">{todayLabel} - Signed in as {email}</p>
            <p className="font-mono text-foreground/50 mt-1">Next digest run (07:30 NZ): {countdown || "--:--:--"}</p>
          </div>
          <button onClick={logout} className="uppercase font-mono text-primary hover:text-primary/80">Log Out</button>
        </div>

        <div className="inline-flex mb-6 border border-border bg-black/45">
          <button
            onClick={() => setViewMode("today")}
            className={`px-4 h-10 uppercase font-mono text-sm transition-colors ${viewMode === "today" ? "text-primary bg-primary/10" : "text-foreground/70 hover:text-foreground"}`}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode("history")}
            className={`px-4 h-10 uppercase font-mono text-sm transition-colors ${viewMode === "history" ? "text-primary bg-primary/10" : "text-foreground/70 hover:text-foreground"}`}
          >
            History
          </button>
        </div>

        {loading ? (
          <div className="border border-border bg-black/45 backdrop-blur-xs p-8 font-mono text-foreground/70">
            Loading your {viewMode === "today" ? "daily tenders" : "history"}...
          </div>
        ) : requiresSubscription ? (
          <div className="border border-border bg-black/45 backdrop-blur-xs p-8 text-center">
            <h2 className="font-sentient text-3xl">Start your 7-day trial</h2>
            <p className="font-mono text-foreground/65 mt-3 max-w-2xl mx-auto">
              You need an active trial or subscription to access your daily digest.
            </p>
            {syncError ? <p className="font-mono text-red-400 mt-3">{syncError}</p> : null}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/onboarding"
                className="inline-flex uppercase border border-primary text-primary-foreground h-12 px-6 font-mono [clip-path:polygon(16px_0,calc(100%_-_16px)_0,100%_0,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,0_100%,0_calc(100%_-_16px),0_16px)] [box-shadow:inset_0_0_54px_0px_#EBB800]"
              >
                Start 7-Day Trial
              </Link>
              <Link href="/onboarding?plan=starter" className="uppercase font-mono text-primary hover:text-primary/80">
                Starter Plan
              </Link>
              <Link href="/onboarding?plan=pro" className="uppercase font-mono text-primary hover:text-primary/80">
                Pro Plan
              </Link>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="border border-border bg-black/45 backdrop-blur-xs p-8 text-center">
            <h2 className="font-sentient text-3xl">
              {viewMode === "today" ? "No tenders for today yet" : "No history yet"}
            </h2>
            <p className="font-mono text-foreground/65 mt-3">
              {viewMode === "today"
                ? "We have not generated a matched shortlist for today. Update your preferences or check back later."
                : "Past recommendations will appear here once daily digests have been generated."}
            </p>
            <Link
              href="/profile"
              className="inline-block mt-6 uppercase font-mono text-primary hover:text-primary/80"
            >
              Update Profile
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => (
              <article key={item.id} className="border border-border bg-black/45 backdrop-blur-xs p-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-sentient text-2xl">{item.title}</h2>
                  <span className="font-mono text-primary">{item.score}/100</span>
                </div>
                <div className="mt-3 font-mono text-foreground/70 text-sm grid md:grid-cols-2 gap-y-2">
                  <p>Buyer: {item.buyer}</p>
                  <p>Close: {item.close || "TBC"}</p>
                  <p>Region: {item.region}</p>
                  <p>Source: {item.source}</p>
                  {item.matchReasons.length ? (
                    <p className="md:col-span-2 text-foreground/85">
                      Matched on: {item.matchReasons.map((r) => r.replace(/^keyword:|^region:|^exclude:/, "")).join(", ")}
                    </p>
                  ) : null}
                  {(item.matchBreakdown.keyword_points || item.matchBreakdown.region_points || item.matchBreakdown.exclude_penalty) ? (
                    <p className="md:col-span-2 text-foreground/55">
                      Score detail: +{item.matchBreakdown.keyword_points || 0} keyword, +{item.matchBreakdown.region_points || 0} region, -{item.matchBreakdown.exclude_penalty || 0} exclusions
                    </p>
                  ) : null}
                  {viewMode === "history" ? <p className="md:col-span-2">Recommended: {item.recommendedForDate}</p> : null}
                </div>
                <a href={item.url} target="_blank" rel="noreferrer" className="inline-block mt-4 uppercase font-mono text-primary hover:text-primary/80">Open Tender</a>
              </article>
            ))}
          </div>
        )}

        <div className="mt-8 font-mono text-sm text-foreground/55">
          {viewMode === "today"
            ? "Showing your live, date-scoped recommendations from Supabase."
            : "Showing recent historical recommendations retained for reference."}
          <Link href="/profile" className="text-primary ml-2">Update profile</Link>
        </div>
      </section>
    </main>
  );
}
