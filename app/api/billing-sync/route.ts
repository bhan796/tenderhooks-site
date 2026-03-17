import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function snapshot(sub: Stripe.Subscription) {
  const raw = sub as any;
  return {
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    status: sub.status,
    current_period_start: raw.current_period_start ? new Date(raw.current_period_start * 1000).toISOString() : null,
    current_period_end: raw.current_period_end ? new Date(raw.current_period_end * 1000).toISOString() : null,
    trial_start: raw.trial_start ? new Date(raw.trial_start * 1000).toISOString() : null,
    trial_end: raw.trial_end ? new Date(raw.trial_end * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Missing auth token." }, { status: 401 });
    }

    const auth = createSupabaseServerClient();
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    const email = authData.user?.email?.toLowerCase() || "";
    if (authError || !email) {
      return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
    }

    const stripe = requireStripe();
    const supabase = requireSupabaseAdmin();

    const customers = await stripe.customers.list({ email, limit: 10 });
    if (!customers.data.length) {
      return NextResponse.json({ synced: 0 });
    }

    let synced = 0;
    for (const customer of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: customer.id, status: "all", limit: 50 });
      for (const sub of subs.data) {
        const payload = {
          ...snapshot(sub),
          customer_email: email,
          plan: (sub.metadata?.plan || "starter") as string,
        };
        await supabase.from("billing_subscriptions").upsert(payload, { onConflict: "stripe_subscription_id" });
        synced += 1;
      }
    }

    return NextResponse.json({ synced });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Billing sync failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
