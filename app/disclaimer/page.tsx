"use client";

import { GL } from "@/components/gl";

export default function DisclaimerPage() {
  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-36 md:pt-44 max-w-4xl mx-auto">
        <h1 className="font-sentient text-4xl md:text-6xl text-center mb-8">Disclaimer</h1>
        <article className="border border-border bg-black/45 backdrop-blur-xs p-6 md:p-8 space-y-4 font-mono text-foreground/80">
          <p>Tender Hooks provides informational content only and does not provide legal, procurement, financial, or tax advice.</p>
          <p>Opportunity data may change on source platforms after publication. Always verify final details on the originating procurement site.</p>
          <p>Past tender outcomes or relevance scores are not guarantees of future win probability.</p>
        </article>
      </section>
    </main>
  );
}

