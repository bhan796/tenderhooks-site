"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GL } from "@/components/gl";
import { requireSupabaseConfig, supabase } from "@/lib/supabase";

type PlanTier = "starter" | "pro";
type SubmitState = "idle" | "submitting" | "error";

export default function OnboardingPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanTier>("starter");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string>("");
  const [email, setEmail] = useState("");
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    const p = url.searchParams.get("plan");
    setPlan(p === "pro" ? "pro" : "starter");
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    const client = requireSupabaseConfig();
    client.auth.getSession().then(({ data }) => {
      const userEmail = data.session?.user?.email || "";
      if (!userEmail) {
        const url = new URL(window.location.href);
        const planParam = url.searchParams.get("plan");
        const next = planParam ? `/onboarding?plan=${encodeURIComponent(planParam)}` : "/onboarding";
        router.replace(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      setEmail(userEmail.toLowerCase());
      setAuthReady(true);
    });
  }, [router]);

  async function onSubmit(formData: FormData) {
    if (!supabase) {
      setState("error");
      setError("Supabase is not configured.");
      return;
    }

    const client = requireSupabaseConfig();
    const {
      data: { session },
    } = await client.auth.getSession();

    if (!session?.access_token || !session.user.email) {
      setState("error");
      setError("Please sign in before starting your trial.");
      router.replace("/login?next=%2Fonboarding");
      return;
    }

    setState("submitting");
    setError("");
    const payload = {
      company_name: String(formData.get("company_name") || ""),
      contact_name: String(formData.get("contact_name") || ""),
      contact_email: session.user.email.toLowerCase(),
      digest_time: "07:30",
      primary_services: String(formData.get("primary_services") || ""),
      keywords: String(formData.get("keywords") || ""),
      contract_size: String(formData.get("contract_size") || "any"),
      delivery_channel: String(formData.get("delivery_channel") || "email"),
      plan,
      submitted_at_utc: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !body.url) {
        setState("error");
        setError(body.error || "Could not start checkout.");
        return;
      }
      localStorage.setItem("tenderhooks_onboarding_draft", JSON.stringify(payload));
      window.location.href = body.url;
      return;
    } catch {
      setState("error");
      setError("Could not connect to checkout.");
      return;
    }
  }

  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-36 md:pt-44 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-sentient text-4xl md:text-6xl">Start your Tender Hooks trial</h1>
          <p className="font-mono text-foreground/65 mt-5 max-w-2xl mx-auto">
            Create your account, choose a plan, then start your 7-day free trial in Stripe.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6 font-mono">
          <button type="button" onClick={() => setPlan("starter")} className={`border p-5 text-left ${plan === "starter" ? "border-primary bg-primary/10" : "border-border bg-black/45"}`}>
            <div className="text-lg text-white">Starter</div>
            <div className="text-foreground/70 mt-1">NZ$99/mo - single profile</div>
          </button>
          <button type="button" onClick={() => setPlan("pro")} className={`border p-5 text-left ${plan === "pro" ? "border-primary bg-primary/10" : "border-border bg-black/45"}`}>
            <div className="text-lg text-white">Pro</div>
            <div className="text-foreground/70 mt-1">NZ$249/mo - up to 3 profiles + priority alerts</div>
          </button>
        </div>

        <div className="border border-border bg-black/45 backdrop-blur-xs p-6 md:p-8">
          {!authReady ? <p className="font-mono text-foreground/70 mb-4">Checking your account...</p> : null}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onSubmit(new FormData(e.currentTarget));
            }}
            className="grid md:grid-cols-2 gap-4 font-mono"
          >
            <label className="text-sm text-foreground/70 uppercase">Account email<input value={email} readOnly className="mt-2 w-full bg-black/30 border border-border h-11 px-3 text-foreground/80" /></label>
            <label className="text-sm text-foreground/70 uppercase">Company name*<input name="company_name" required className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase">Contact name*<input name="contact_name" required className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase md:col-span-2">Primary services*<textarea name="primary_services" rows={4} required className="mt-2 w-full bg-black/40 border border-border p-3" /></label>
            <label className="text-sm text-foreground/70 uppercase md:col-span-2">Keywords to prioritize*<input name="keywords" placeholder="cloud, managed services, cybersecurity" required className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase">Contract size<select name="contract_size" className="mt-2 w-full bg-black/40 border border-border h-11 px-3"><option>any</option><option>small</option><option>medium</option><option>large</option></select></label>
            <label className="text-sm text-foreground/70 uppercase">Delivery channel<select name="delivery_channel" className="mt-2 w-full bg-black/40 border border-border h-11 px-3"><option>email</option><option>telegram</option></select></label>
            <div className="md:col-span-2 pt-2">
              <button disabled={!authReady || state === "submitting"} className="inline-flex uppercase border border-primary text-primary-foreground h-14 px-6 font-mono [clip-path:polygon(16px_0,calc(100%_-_16px)_0,100%_0,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,0_100%,0_calc(100%_-_16px),0_16px)] [box-shadow:inset_0_0_54px_0px_#EBB800] disabled:opacity-60" type="submit">{state === "submitting" ? "Submitting..." : `Continue to ${plan === "pro" ? "Pro" : "Starter"} payment`}</button>
            </div>
            {error ? <p className="md:col-span-2 text-sm text-red-400">{error}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
