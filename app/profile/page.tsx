"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GL } from "@/components/gl";
import { requireSupabaseConfig, supabase } from "@/lib/supabase";

type PreferenceRow = {
  user_id: string;
  regions: string[] | null;
  keywords: string[] | null;
  exclude_keywords: string[] | null;
};

type SubscriptionState = {
  hasSubscription: boolean;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  plan: string;
};

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [billingHint, setBillingHint] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [cancelStep, setCancelStep] = useState<"closed" | "confirm" | "reason" | "final">("closed");
  const [cancelReason, setCancelReason] = useState("Not enough relevant tenders");

  const [regions, setRegions] = useState("New Zealand, Auckland, Wellington");
  const [keywords, setKeywords] = useState("cloud, managed services, cybersecurity");
  const [excludeKeywords, setExcludeKeywords] = useState("construction");

  useEffect(() => {
    if (!supabase) {
      setError("Supabase not configured.");
      setLoading(false);
      return;
    }

    const client = requireSupabaseConfig();

    client.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      setUserId(user.id);
      setAccessToken(data.session?.access_token || "");

      const { data: row, error: fetchError } = await client
        .from("user_preferences")
        .select("user_id, regions, keywords, exclude_keywords")
        .eq("user_id", user.id)
        .maybeSingle<PreferenceRow>();

      if (fetchError) {
        setError("Could not load profile yet. Ensure `user_preferences` table exists with RLS.");
        setLoading(false);
        return;
      }

      if (row) {
        setRegions((row.regions || []).join(", "));
        setKeywords((row.keywords || []).join(", "));
        setExcludeKeywords((row.exclude_keywords || []).join(", "));
      }

      if (data.session?.access_token) {
        const res = await fetch("/api/subscription", {
          headers: { authorization: `Bearer ${data.session.access_token}` },
        }).catch(() => null);
        if (res?.ok) {
          const body = (await res.json()) as Partial<SubscriptionState>;
          if (body.hasSubscription) {
            setSubscription({
              hasSubscription: true,
              status: String(body.status || "unknown"),
              cancelAtPeriodEnd: Boolean(body.cancelAtPeriodEnd),
              currentPeriodEnd: body.currentPeriodEnd ? String(body.currentPeriodEnd) : null,
              trialEnd: body.trialEnd ? String(body.trialEnd) : null,
              plan: String(body.plan || "starter"),
            });
          } else {
            setSubscription({
              hasSubscription: false,
              status: "none",
              cancelAtPeriodEnd: false,
              currentPeriodEnd: null,
              trialEnd: null,
              plan: "starter",
            });
          }
        }
      }

      setLoading(false);
    });
  }, [router]);

  async function updateSubscription(action: "cancel" | "resume") {
    if (!accessToken) return;
    setUpdatingSubscription(true);
    setBillingHint("");

    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json()) as { error?: string; status?: string; cancelAtPeriodEnd?: boolean };
      if (!res.ok) {
        setBillingHint(body.error || "Could not update your subscription.");
        return;
      }

      setSubscription((prev) =>
        prev
          ? {
              ...prev,
              status: String(body.status || prev.status),
              cancelAtPeriodEnd: Boolean(body.cancelAtPeriodEnd),
            }
          : prev,
      );
      setCancelStep("closed");
      setBillingHint(action === "cancel" ? "Your subscription will end at period close." : "Your subscription is active again.");
    } catch {
      setBillingHint("Could not update your subscription.");
    } finally {
      setUpdatingSubscription(false);
    }
  }

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || !userId) return;

    setSaving(true);
    setMessage("");
    setError("");

    const client = requireSupabaseConfig();

    const payload = {
      user_id: userId,
      regions: parseCsv(regions),
      keywords: parseCsv(keywords),
      exclude_keywords: parseCsv(excludeKeywords),
      digest_time: "07:30",
      delivery_channel: "email",
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await client.from("user_preferences").upsert(payload, { onConflict: "user_id" });

    if (upsertError) {
      setError(upsertError.message);
      setSaving(false);
      return;
    }

    setMessage("Preferences saved.");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="relative min-h-svh px-4 pb-12">
        <GL hovering={false} />
      </main>
    );
  }

  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-36 md:pt-44 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-sentient text-4xl md:text-6xl">Profile Preferences</h1>
          <p className="font-mono text-foreground/65 mt-4">Set the filters used for your daily tender shortlist.</p>
          <p className="font-mono text-foreground/50 mt-2">Digest delivery time is fixed at 07:30 NZ time.</p>
        </div>

        <div className="border border-border bg-black/45 backdrop-blur-xs p-6 md:p-8">
          <form onSubmit={onSave} className="grid gap-4 font-mono">
            <label className="text-sm text-foreground/70 uppercase">Regions (comma separated)
              <input value={regions} onChange={(e) => setRegions(e.target.value)} className="mt-2 w-full bg-black/40 border border-border h-11 px-3" />
            </label>
            <label className="text-sm text-foreground/70 uppercase">Keywords (comma separated)
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className="mt-2 w-full bg-black/40 border border-border h-11 px-3" />
            </label>
            <label className="text-sm text-foreground/70 uppercase">Exclude Keywords (comma separated)
              <input value={excludeKeywords} onChange={(e) => setExcludeKeywords(e.target.value)} className="mt-2 w-full bg-black/40 border border-border h-11 px-3" />
            </label>
            <button disabled={saving} className="inline-flex uppercase border border-primary text-primary-foreground h-14 px-6 font-mono [clip-path:polygon(16px_0,calc(100%_-_16px)_0,100%_0,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,0_100%,0_calc(100%_-_16px),0_16px)] [box-shadow:inset_0_0_54px_0px_#EBB800] disabled:opacity-60" type="submit">
              {saving ? "Saving..." : "Save Preferences"}
            </button>

            {message ? <p className="text-sm text-foreground/70">{message}</p> : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </form>
          <div className="mt-6 pt-4 border-t border-border/60 text-right">
            {subscription?.hasSubscription ? (
              <div className="mb-3 text-left">
                <p className="font-mono text-xs text-foreground/60 uppercase">
                  Plan: {subscription.plan} · Status: {subscription.status}
                </p>
                {subscription.currentPeriodEnd ? (
                  <p className="font-mono text-xs text-foreground/50 mt-1">
                    {subscription.cancelAtPeriodEnd ? "Access ends" : "Renews"} on{" "}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                  </p>
                ) : null}
                {!subscription.cancelAtPeriodEnd ? (
                  <button
                    type="button"
                    onClick={() => setCancelStep("confirm")}
                    className="mt-2 font-mono text-xs uppercase text-foreground/45 hover:text-foreground/70 transition-colors"
                  >
                    Cancel subscription
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => updateSubscription("resume")}
                    disabled={updatingSubscription}
                    className="mt-2 font-mono text-xs uppercase text-foreground/45 hover:text-foreground/70 transition-colors disabled:opacity-50"
                  >
                    {updatingSubscription ? "Updating..." : "Resume subscription"}
                  </button>
                )}
              </div>
            ) : null}
            {billingHint ? <p className="mt-2 font-mono text-xs text-red-400">{billingHint}</p> : null}
          </div>
        </div>

        {cancelStep !== "closed" ? (
          <div className="mt-6 border border-border bg-black/70 backdrop-blur-xs p-6">
            {cancelStep === "confirm" ? (
              <div>
                <h2 className="font-sentient text-2xl">Are you sure?</h2>
                <p className="font-mono text-foreground/65 mt-2">
                  You will lose access to your daily shortlist and fit scoring once your period ends.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelStep("closed")}
                    className="font-mono uppercase text-foreground/70 hover:text-foreground"
                  >
                    Keep my plan
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelStep("reason")}
                    className="font-mono uppercase text-primary hover:text-primary/80"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : null}

            {cancelStep === "reason" ? (
              <div>
                <h2 className="font-sentient text-2xl">Help us improve</h2>
                <p className="font-mono text-foreground/65 mt-2">What is the main reason you are leaving?</p>
                <div className="mt-4 grid gap-2 font-mono text-sm text-foreground/75">
                  {[
                    "Not enough relevant tenders",
                    "Too expensive right now",
                    "Using another tool",
                    "Just testing",
                  ].map((reason) => (
                    <label key={reason} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="cancel-reason"
                        checked={cancelReason === reason}
                        onChange={() => setCancelReason(reason)}
                      />
                      <span>{reason}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelStep("confirm")}
                    className="font-mono uppercase text-foreground/70 hover:text-foreground"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelStep("final")}
                    className="font-mono uppercase text-primary hover:text-primary/80"
                  >
                    Continue
                  </button>
                </div>
              </div>
            ) : null}

            {cancelStep === "final" ? (
              <div>
                <h2 className="font-sentient text-2xl">Final confirmation</h2>
                <p className="font-mono text-foreground/65 mt-2">
                  Your account will remain active until the end of the current billing period.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelStep("reason")}
                    className="font-mono uppercase text-foreground/70 hover:text-foreground"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSubscription("cancel")}
                    disabled={updatingSubscription}
                    className="font-mono uppercase text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    {updatingSubscription ? "Cancelling..." : "Confirm cancellation"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
