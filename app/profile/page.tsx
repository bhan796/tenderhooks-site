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

function parseCsv(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function ProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

      setLoading(false);
    });
  }, [router]);

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
        </div>
      </section>
    </main>
  );
}
