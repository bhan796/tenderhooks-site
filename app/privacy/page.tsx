"use client";

import { GL } from "@/components/gl";

export default function PrivacyPage() {
  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-36 md:pt-44 max-w-4xl mx-auto">
        <h1 className="font-sentient text-4xl md:text-6xl text-center mb-8">Privacy</h1>
        <article className="border border-border bg-black/45 backdrop-blur-xs p-6 md:p-8 space-y-4 font-mono text-foreground/80">
          <p>Tender Hooks collects only the information needed to onboard your business, generate relevance rankings, and deliver digest notifications.</p>
          <p>We do not sell personal data. We share data only with core infrastructure providers required to operate the service.</p>
          <p>You may request correction or deletion of your onboarding profile data at any time by contacting support.</p>
        </article>
      </section>
    </main>
  );
}

