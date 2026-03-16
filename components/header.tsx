"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { requireSupabaseConfig, supabase } from "@/lib/supabase";
import { Logo } from "./logo";

export const Header = () => {
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!supabase) return;
    const client = requireSupabaseConfig();

    client.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email || "");
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email || "");
    });

    return () => subscription.unsubscribe();
  }, []);

  async function onLogout() {
    if (!supabase) return;
    const client = requireSupabaseConfig();
    await client.auth.signOut();
  }

  return (
    <div className="fixed z-50 pt-8 md:pt-14 top-0 left-0 w-full">
      <header className="flex items-center justify-between container">
        <Link href="/"><Logo className="w-[100px] md:w-[120px]" /></Link>
        <div className="flex items-center gap-6">
          {email ? (
            <>
              <Link className="uppercase transition-colors ease-out duration-150 font-mono text-foreground/70 hover:text-foreground" href="/dashboard">
                Daily Digest
              </Link>
              <Link className="uppercase transition-colors ease-out duration-150 font-mono text-foreground/70 hover:text-foreground" href="/profile">
                Profile
              </Link>
              <button onClick={onLogout} className="uppercase transition-colors ease-out duration-150 font-mono text-foreground/70 hover:text-foreground">
                Log Out
              </button>
            </>
          ) : (
            <Link className="uppercase transition-colors ease-out duration-150 font-mono text-foreground/70 hover:text-foreground" href="/login">
              Log In
            </Link>
          )}
          {!email ? (
            <Link className="uppercase transition-colors ease-out duration-150 font-mono text-primary hover:text-primary/80" href="/onboarding">
              Start Trial
            </Link>
          ) : null}
        </div>
      </header>
    </div>
  );
};
