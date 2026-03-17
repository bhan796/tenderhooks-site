import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type DbSubRow = {
  stripe_subscription_id: string;
  stripe_customer_id: string | null;
  customer_email: string | null;
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean | null;
  plan: string | null;
};

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

async function getAuthedEmail(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return { error: "Missing auth token.", email: "" };

  const auth = createSupabaseServerClient();
  const { data: authData, error: authError } = await auth.auth.getUser(token);
  const email = authData.user?.email?.toLowerCase() || "";
  if (authError || !email) return { error: "Invalid auth token.", email: "" };

  return { error: "", email };
}

async function loadLatestSubscription(email: string) {
  const supabase = requireSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("billing_subscriptions")
    .select("stripe_subscription_id, stripe_customer_id, customer_email, status, current_period_end, trial_end, cancel_at_period_end, plan")
    .eq("customer_email", email)
    .order("updated_at", { ascending: false })
    .limit(25);

  if (error) return { row: null as DbSubRow | null, error };
  if (!rows || rows.length === 0) return { row: null as DbSubRow | null, error: null };

  const allRows = rows as DbSubRow[];
  const preferredStatuses = new Set(["trialing", "active", "past_due", "unpaid"]);
  const preferred = allRows.find((r) => preferredStatuses.has((r.status || "").toLowerCase()));
  return { row: preferred || allRows[0], error: null };
}

export async function GET(req: NextRequest) {
  try {
    const { error, email } = await getAuthedEmail(req);
    if (error) return NextResponse.json({ error }, { status: 401 });

    const { row, error: rowError } = await loadLatestSubscription(email);
    if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 });
    if (!row) return NextResponse.json({ hasSubscription: false });

    return NextResponse.json({
      hasSubscription: true,
      status: row.status,
      cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      currentPeriodEnd: row.current_period_end,
      trialEnd: row.trial_end,
      plan: row.plan || "starter",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not load subscription status.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { error, email } = await getAuthedEmail(req);
    if (error) return NextResponse.json({ error }, { status: 401 });

    const body = (await req.json()) as { action?: string };
    const action = body.action === "resume" ? "resume" : "cancel";

    const { row, error: rowError } = await loadLatestSubscription(email);
    if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 });
    if (!row?.stripe_subscription_id) {
      return NextResponse.json({ error: "No subscription found for this account." }, { status: 404 });
    }

    const rowStatus = (row.status || "").toLowerCase();
    if (action === "cancel" && !["trialing", "active", "past_due", "unpaid"].includes(rowStatus)) {
      return NextResponse.json({ error: `Subscription cannot be cancelled from status: ${row.status}.` }, { status: 400 });
    }

    const stripe = requireStripe();
    const supabase = requireSupabaseAdmin();
    const updated = await stripe.subscriptions.update(row.stripe_subscription_id, {
      cancel_at_period_end: action === "cancel",
    });

    const payload = {
      ...snapshot(updated),
      customer_email: email,
      plan: row.plan || "starter",
    };
    await supabase.from("billing_subscriptions").upsert(payload, { onConflict: "stripe_subscription_id" });

    return NextResponse.json({
      ok: true,
      status: updated.status,
      cancelAtPeriodEnd: updated.cancel_at_period_end,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not update subscription.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
