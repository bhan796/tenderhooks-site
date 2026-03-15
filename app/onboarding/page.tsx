"use client";

import { useEffect, useState } from "react";
import { GL } from "@/components/gl";

type PlanTier = "starter" | "pro";
type SubmitState = "idle" | "submitting" | "error";

export default function OnboardingPage() {
  const [plan, setPlan] = useState<PlanTier>("starter");
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const p = url.searchParams.get("plan");
    setPlan(p === "pro" ? "pro" : "starter");
  }, []);

  async function onSubmit(formData: FormData) {
    setState("submitting");
    setError("");

    const payload = {
      company_name: String(formData.get("company_name") || ""),
      contact_name: String(formData.get("contact_name") || ""),
      contact_email: String(formData.get("contact_email") || ""),
      digest_time: String(formData.get("digest_time") || "07:30"),
      primary_services: String(formData.get("primary_services") || ""),
      keywords: String(formData.get("keywords") || ""),
      contract_size: String(formData.get("contract_size") || "any"),
      delivery_channel: String(formData.get("delivery_channel") || "email"),
      plan,
      regions: ["New Zealand"],
      exclude_keywords: [],
    };

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await res.json()) as { error?: string; paymentUrl?: string | null };

    if (!res.ok) {
      setState("error");
      setError(body.error || "Could not submit onboarding.");
      return;
    }

    if (body.paymentUrl) {
      window.location.href = body.paymentUrl;
      return;
    }

    setState("error");
    setError("Onboarding saved but no payment link configured.");
  }

  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-36 md:pt-44 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-sentient text-4xl md:text-6xl">Start your Tender Hooks trial</h1>
          <p className="font-mono text-foreground/65 mt-5 max-w-2xl mx-auto">
            Pick a plan, complete onboarding, then pay securely via Stripe.
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
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onSubmit(new FormData(e.currentTarget));
            }}
            className="grid md:grid-cols-2 gap-4 font-mono"
          >
            <label className="text-sm text-foreground/70 uppercase">Company name*<input name="company_name" required className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase">Contact name*<input name="contact_name" required className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase">Contact email*<input name="contact_email" type="email" required className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase">Digest time*<input name="digest_time" type="time" defaultValue="07:30" className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase md:col-span-2">Primary services*<textarea name="primary_services" rows={4} required className="mt-2 w-full bg-black/40 border border-border p-3" /></label>
            <label className="text-sm text-foreground/70 uppercase md:col-span-2">Keywords to prioritize*<input name="keywords" placeholder="cloud, managed services, cybersecurity" required className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase">Contract size<select name="contract_size" className="mt-2 w-full bg-black/40 border border-border h-11 px-3"><option>any</option><option>small</option><option>medium</option><option>large</option></select></label>
            <label className="text-sm text-foreground/70 uppercase">Delivery channel<select name="delivery_channel" className="mt-2 w-full bg-black/40 border border-border h-11 px-3"><option>email</option><option>telegram</option></select></label>
            <div className="md:col-span-2 pt-2">
              <button disabled={state === "submitting"} className="inline-flex uppercase border border-primary text-primary-foreground h-14 px-6 font-mono [clip-path:polygon(16px_0,calc(100%_-_16px)_0,100%_0,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,0_100%,0_calc(100%_-_16px),0_16px)] [box-shadow:inset_0_0_54px_0px_#EBB800] disabled:opacity-60" type="submit">{state === "submitting" ? "Submitting..." : `Continue to ${plan === "pro" ? "Pro" : "Starter"} payment`}</button>
            </div>
            {error ? <p className="md:col-span-2 text-sm text-red-400">{error}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
