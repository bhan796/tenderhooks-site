"use client";

import Link from "next/link";
import { GL } from "./gl";
import { Pill } from "./pill";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { requireSupabaseConfig, supabase } from "@/lib/supabase";

export function Hero() {
  const [hovering, setHovering] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const client = requireSupabaseConfig();

    async function loadState() {
      const { data } = await client.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        setIsLoggedIn(false);
        setIsSubscriber(false);
        return;
      }

      setIsLoggedIn(true);
      const email = (user.email || "").toLowerCase();
      const { data: rows } = await client
        .from("billing_subscriptions")
        .select("status")
        .eq("customer_email", email)
        .in("status", ["trialing", "active"])
        .limit(1);

      setIsSubscriber(Boolean(rows && rows.length > 0));
    }

    loadState();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(() => {
      loadState();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="relative">
      <GL hovering={hovering} />

      <section className="min-h-svh flex flex-col justify-end text-center px-4 pb-16 relative z-10">
        <Pill className="mb-6 self-center">NZ IT SERVICES - BETA</Pill>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sentient">
          Win better-fit <br />
          <i className="font-light">tenders faster</i>
        </h1>
        <p className="font-mono text-sm sm:text-base text-foreground/60 text-balance mt-8 max-w-[560px] mx-auto">
          Tender Hooks scans NZ/AU opportunities, scores fit against your profile, and sends a decision-ready daily digest.
        </p>
        <div id="contact" className="mt-14">
          <Link className="contents max-sm:hidden" href={isLoggedIn ? "/dashboard" : "/onboarding"}>
            <Button onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
              {isLoggedIn ? "[Daily Digest]" : "[Start Trial]"}
            </Button>
          </Link>
          <Link className="contents sm:hidden" href={isLoggedIn ? "/dashboard" : "/onboarding"}>
            <Button size="sm" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
              {isLoggedIn ? "[Daily Digest]" : "[Start Trial]"}
            </Button>
          </Link>
        </div>
      </section>

      {!isSubscriber ? (
        <section id="pricing" className="relative z-10 px-4 pb-8">
          <div className="container grid md:grid-cols-2 gap-4 font-mono">
            <article className="border border-border bg-black/45 backdrop-blur-xs p-6">
              <h3 className="font-sentient text-3xl mb-3">Starter</h3>
              <p className="text-foreground/70 mb-4">Single niche profile, daily digest, NZ$99/mo.</p>
              <Link className="text-primary uppercase" href="/onboarding?plan=starter">Choose Starter</Link>
            </article>
            <article className="border border-border bg-black/45 backdrop-blur-xs p-6">
              <h3 className="font-sentient text-3xl mb-3">Pro</h3>
              <p className="text-foreground/70 mb-4">Up to 3 profiles + priority alerts, NZ$249/mo.</p>
              <Link className="text-primary uppercase" href="/onboarding?plan=pro">Choose Pro</Link>
            </article>
          </div>
        </section>
      ) : null}

      <section id="about" className="relative z-10 px-4 pb-10">
        <div className="container grid md:grid-cols-3 gap-4">
          <article className="border border-border bg-black/45 backdrop-blur-xs p-6">
            <h3 className="font-sentient text-2xl mb-3">Daily shortlist</h3>
            <p className="font-mono text-foreground/70">Top matched opportunities with direct links, deadlines, and buyer context.</p>
          </article>
          <article id="insights" className="border border-border bg-black/45 backdrop-blur-xs p-6">
            <h3 className="font-sentient text-2xl mb-3">Fit scoring</h3>
            <p className="font-mono text-foreground/70">Clear rationale on why each listing is high, medium, or low relevance.</p>
          </article>
          <article id="portfolio" className="border border-border bg-black/45 backdrop-blur-xs p-6">
            <h3 className="font-sentient text-2xl mb-3">Action notes</h3>
            <p className="font-mono text-foreground/70">Suggested next step so your team can move from scan to bid immediately.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
