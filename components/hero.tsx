"use client";

import Link from "next/link";
import { useState } from "react";
import { GL } from "./gl";
import { Pill } from "./pill";
import { Button } from "./ui/button";

export function Hero() {
  const [hovering, setHovering] = useState(false);

  return (
    <main className="content-wrap">
      <GL hovering={hovering} />

      <section className="hero" style={{ justifyContent: "center", minHeight: "88vh", paddingBottom: 0 }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <Pill>TENDER HOOKS · NZ LAUNCH</Pill>
          <h1 className="hero-title">Capture high-fit tenders<br /><i style={{ fontWeight: 300 }}>before your competitors do</i></h1>
          <p className="hero-sub">Tender Hooks scans public opportunities daily, then delivers ranked, decision-ready shortlists to your inbox at 07:30.</p>
          <Link href="/onboarding">
            <Button onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
              [Start 7-Day Trial]
            </Button>
          </Link>
        </div>
      </section>

      <section className="section" id="how" style={{ paddingTop: 26 }}>
        <div className="container grid three">
          <article className="panel card"><h3>Daily Match Feed</h3><p className="muted">Top 5-20 opportunities matched to your services, region, and ideal buyers.</p></article>
          <article className="panel card"><h3>AI Relevance Scoring</h3><p className="muted">Transparent scoring to drive faster go/no-go bid decisions.</p></article>
          <article className="panel card"><h3>Action Notes</h3><p className="muted">Short rationale per listing so your team acts quickly with confidence.</p></article>
        </div>
      </section>

      <section className="section" id="pricing" style={{ paddingTop: 16 }}>
        <div className="container grid two">
          <article className="panel card"><h3>Starter — NZ$99/mo</h3><p className="muted">One profile · daily digest</p></article>
          <article className="panel card"><h3>Pro — NZ$249/mo</h3><p className="muted">Up to 3 profiles · priority alerts</p></article>
        </div>
      </section>
    </main>
  );
}
