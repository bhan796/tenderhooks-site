"use client";

import { FormEvent, useState } from "react";
import { GL } from "@/components/gl";
import { requireSupabaseConfig, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    try {
      const client = requireSupabaseConfig();
      setLoading(true);
      setError("");
      setSent(false);
      const redirectTo = `${window.location.origin}/dashboard`;
      const { error: signInError } = await client.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: redirectTo },
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-36 md:pt-44 max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-sentient text-4xl md:text-6xl">Client Login</h1>
          <p className="font-mono text-foreground/65 mt-4">Enter your email for a secure magic-link sign in.</p>
        </div>

        <div className="border border-border bg-black/45 backdrop-blur-xs p-6 md:p-8">
          <form onSubmit={onSubmit} className="grid gap-4 font-mono">
            <label className="text-sm text-foreground/70 uppercase">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full bg-black/40 border border-border h-11 px-3"
              />
            </label>
            <button
              disabled={loading}
              className="inline-flex uppercase border border-primary text-primary-foreground h-14 px-6 font-mono [clip-path:polygon(16px_0,calc(100%_-_16px)_0,100%_0,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,0_100%,0_calc(100%_-_16px),0_16px)] [box-shadow:inset_0_0_54px_0px_#EBB800] disabled:opacity-60"
              type="submit"
            >
              {loading ? "Sending..." : "Send Magic Link"}
            </button>
            {sent ? <p className="text-sm text-foreground/70">Check your email for the login link.</p> : null}
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {!supabase ? (
              <p className="text-sm text-red-400">
                Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
