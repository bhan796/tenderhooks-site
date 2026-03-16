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
};

type ViewMode = "today" | "history";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<TenderItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayLabel = useMemo(() => new Date().toLocaleDateString(), []);

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

      const { data } = await client.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }
      setEmail(user.email || "");

      const { data: billingRows, error: billingError } = await client
        .from("billing_subscriptions")
        .select("status")
        .eq("customer_email", user.email || "")
        .in("status", ["trialing", "active"])
        .limit(1);

      if (billingError && billingError.code !== "PGRST205") {
        setError(billingError.message);
        setLoading(false);
        return;
      }

      if (!billingRows || billingRows.length === 0) {
        setError("No active trial or subscription found. Start a trial to access your digest.");
        setLoading(false);
        return;
      }

      const baseQuery = client
        .from("tender_recommendations")
        .select("id, title, score, buyer, close_date, region, source, url, recommended_for_date")
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
