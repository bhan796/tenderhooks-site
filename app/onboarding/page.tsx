"use client";

import { GL } from "@/components/gl";

export default function OnboardingPage() {
  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-36 md:pt-44 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="font-sentient text-4xl md:text-6xl">Start your Tender Hooks trial</h1>
          <p className="font-mono text-foreground/65 mt-5 max-w-2xl mx-auto">Set your buyer profile in under 3 minutes. We’ll deliver your first ranked digest tomorrow morning.</p>
        </div>

        <div className="border border-border bg-black/45 backdrop-blur-xs p-6 md:p-8">
          <form className="grid md:grid-cols-2 gap-4 font-mono">
            <label className="text-sm text-foreground/70 uppercase">Company name*<input className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase">Contact name*<input className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase">Contact email*<input type="email" className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase">Digest time*<input type="time" defaultValue="07:30" className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase md:col-span-2">Primary services*<textarea rows={4} className="mt-2 w-full bg-black/40 border border-border p-3" /></label>
            <label className="text-sm text-foreground/70 uppercase md:col-span-2">Keywords to prioritize*<input placeholder="cloud, managed services, cybersecurity" className="mt-2 w-full bg-black/40 border border-border h-11 px-3" /></label>
            <label className="text-sm text-foreground/70 uppercase">Contract size<select className="mt-2 w-full bg-black/40 border border-border h-11 px-3"><option>Any</option><option>Small</option><option>Medium</option><option>Large</option></select></label>
            <label className="text-sm text-foreground/70 uppercase">Delivery channel<select className="mt-2 w-full bg-black/40 border border-border h-11 px-3"><option>Email</option><option>Telegram</option></select></label>
            <div className="md:col-span-2 pt-2">
              <button className="inline-flex uppercase border border-primary text-primary-foreground h-14 px-6 font-mono [clip-path:polygon(16px_0,calc(100%_-_16px)_0,100%_0,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,0_100%,0_calc(100%_-_16px),0_16px)] [box-shadow:inset_0_0_54px_0px_#EBB800]" type="button">Submit onboarding</button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

