"use client";

import { GL } from "@/components/gl";

export default function TermsPage() {
  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-36 md:pt-44 max-w-4xl mx-auto">
        <h1 className="font-sentient text-4xl md:text-6xl text-center mb-8">Terms</h1>
        <article className="border border-border bg-black/45 backdrop-blur-xs p-6 md:p-8 space-y-6 font-mono text-foreground/80">
          <div><h2 className="font-sentient text-2xl text-white mb-2">Service scope</h2><p>Tender Hooks provides informational tender discovery, matching, and prioritization support. We do not submit bids on your behalf.</p></div>
          <div><h2 className="font-sentient text-2xl text-white mb-2">Customer responsibility</h2><p>You are responsible for validating all tender details, deadlines, eligibility criteria, and procurement requirements before acting.</p></div>
          <div><h2 className="font-sentient text-2xl text-white mb-2">Liability</h2><p>To the maximum extent permitted by law, Tender Hooks is not liable for indirect, incidental, or consequential losses arising from platform use.</p></div>
        </article>
      </section>
    </main>
  );
}

