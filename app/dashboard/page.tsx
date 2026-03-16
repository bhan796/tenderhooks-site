"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GL } from "@/components/gl";
import { requireSupabaseConfig, supabase } from "@/lib/supabase";

type TenderItem = {
  title: string;
  score: number;
  buyer: string;
  close: string;
  region: string;
  source: string;
  url: string;
};

const DAILY_TENDERS: TenderItem[] = [
  {
    title: "Managed Cloud Services Support Panel",
    score: 92,
    buyer: "Ministry of Education",
    close: "2026-03-24",
    region: "Wellington",
    source: "GETS",
    url: "https://www.gets.govt.nz/",
  },
  {
    title: "Cyber Security Advisory and Monitoring",
    score: 88,
    buyer: "Auckland Transport",
    close: "2026-03-22",
    region: "Auckland",
    source: "GETS",
    url: "https://www.gets.govt.nz/",
  },
  {
    title: "Application Support and Service Desk",
    score: 83,
    buyer: "Regional Council",
    close: "2026-03-20",
    region: "Hamilton",
    source: "GETS",
    url: "https://www.gets.govt.nz/",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setError("Supabase not configured.");
      return;
    }

    const client = requireSupabaseConfig();

    client.auth.getSession().then(({ data }) => {
      const sessionEmail = data.session?.user?.email || "";
      if (!sessionEmail) {
        router.replace("/login");
        return;
      }
      setEmail(sessionEmail);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const sessionEmail = session?.user?.email || "";
      if (!sessionEmail) {
        router.replace("/login");
        return;
      }
      setEmail(sessionEmail);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const todayLabel = useMemo(() => new Date().toLocaleDateString(), []);

  async function logout() {
    if (supabase) {
      const client = requireSupabaseConfig();
      await client.auth.signOut();
    }
    router.replace("/");
  }

  if (error) {
    return (
      <main className="relative min-h-svh px-4 pb-12">
        <GL hovering={false} />
        <section className="relative z-10 pt-36 max-w-3xl mx-auto font-mono text-red-400">{error}</section>
      </main>
    );
  }

  if (!email) {
    return null;
  }

  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-32 md:pt-40 max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-sentient text-3xl md:text-5xl">Daily Tender List</h1>
            <p className="font-mono text-foreground/65 mt-2">{todayLabel} - Signed in as {email}</p>
          </div>
          <button onClick={logout} className="uppercase font-mono text-primary hover:text-primary/80">Log Out</button>
        </div>

        <div className="grid gap-4">
          {DAILY_TENDERS.map((item) => (
            <article key={item.title} className="border border-border bg-black/45 backdrop-blur-xs p-5">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-sentient text-2xl">{item.title}</h2>
                <span className="font-mono text-primary">{item.score}/100</span>
              </div>
              <div className="mt-3 font-mono text-foreground/70 text-sm grid md:grid-cols-2 gap-y-2">
                <p>Buyer: {item.buyer}</p>
                <p>Close: {item.close}</p>
                <p>Region: {item.region}</p>
                <p>Source: {item.source}</p>
              </div>
              <a href={item.url} target="_blank" rel="noreferrer" className="inline-block mt-4 uppercase font-mono text-primary hover:text-primary/80">Open Tender</a>
            </article>
          ))}
        </div>

        <div className="mt-8 font-mono text-sm text-foreground/55">
          Demo view for now. Next step is wiring this page to your real generated digest/feed output.
          <Link href="/profile" className="text-primary ml-2">Update profile</Link>
        </div>
      </section>
    </main>
  );
}
