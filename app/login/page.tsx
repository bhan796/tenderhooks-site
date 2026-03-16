"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { GL } from "@/components/gl";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password.");
      return;
    }

    localStorage.setItem(
      "tenderhooks_session",
      JSON.stringify({ email: email.trim().toLowerCase(), logged_in_at: new Date().toISOString() }),
    );
    router.push("/dashboard");
  }

  return (
    <main className="relative min-h-svh px-4 pb-12">
      <GL hovering={false} />
      <section className="relative z-10 pt-36 md:pt-44 max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="font-sentient text-4xl md:text-6xl">Client Login</h1>
          <p className="font-mono text-foreground/65 mt-4">Access your daily matched tender list.</p>
        </div>

        <div className="border border-border bg-black/45 backdrop-blur-xs p-6 md:p-8">
          <form onSubmit={onSubmit} className="grid gap-4 font-mono">
            <label className="text-sm text-foreground/70 uppercase">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full bg-black/40 border border-border h-11 px-3"
              />
            </label>
            <label className="text-sm text-foreground/70 uppercase">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full bg-black/40 border border-border h-11 px-3"
              />
            </label>
            <button
              className="inline-flex uppercase border border-primary text-primary-foreground h-14 px-6 font-mono [clip-path:polygon(16px_0,calc(100%_-_16px)_0,100%_0,100%_calc(100%_-_16px),calc(100%_-_16px)_100%,0_100%,0_calc(100%_-_16px),0_16px)] [box-shadow:inset_0_0_54px_0px_#EBB800]"
              type="submit"
            >
              Log In
            </button>
            {error ? <p className="text-sm text-red-400">{error}</p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
