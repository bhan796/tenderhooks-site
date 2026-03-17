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
    if (!token) return NextResponse.json({ error: "Missing auth token." }, { status: 401 });

    const auth = createSupabaseServerClient();
    const { data: authData, error: authError } = await auth.auth.getUser(token);
    const email = authData.user?.email?.toLowerCase() || "";
    if (authError || !email) return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });

    const body = (await req.json()) as { sessionId?: string };
    const sessionId = String(body.sessionId || "");
    if (!sessionId) return NextResponse.json({ error: "sessionId is required." }, { status: 400 });

    const stripe = requireStripe();
    const supabase = requireSupabaseAdmin();

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.mode !== "subscription" || !session.subscription) {
      return NextResponse.json({ error: "Checkout session has no subscription." }, { status: 400 });
    }

    const sessionEmail = (session.customer_email || "").toLowerCase();
    if (sessionEmail && sessionEmail !== email) {
      return NextResponse.json({ error: "Session email does not match signed-in user." }, { status: 403 });
    }

    const sub = await stripe.subscriptions.retrieve(String(session.subscription));
    const payload = {
      ...snapshot(sub),
      customer_email: email,
      plan: (sub.metadata?.plan || session.metadata?.plan || "starter") as string,
    };

    const { error: upsertError } = await supabase
      .from("billing_subscriptions")
      .upsert(payload, { onConflict: "stripe_subscription_id" });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json({ synced: 1, subscriptionId: sub.id, status: sub.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Session billing sync failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
