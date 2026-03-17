import { NextRequest, NextResponse } from "next/server";
import { requireStripe } from "@/lib/stripe";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type PlanTier = "starter" | "pro";

function normalizePlan(value: string): PlanTier {
  return value === "pro" ? "pro" : "starter";
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return NextResponse.json({ error: "Sign in is required before checkout." }, { status: 401 });
    }

    const supabase = createSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user?.email) {
      return NextResponse.json({ error: "Session is invalid. Please sign in again." }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const plan = normalizePlan(String(body.plan || "starter"));
    const email = authData.user.email.trim().toLowerCase();

    const priceId = plan === "pro" ? process.env.STRIPE_PRICE_ID_PRO : process.env.STRIPE_PRICE_ID_STARTER;

    if (!priceId) {
      return NextResponse.json({ error: `Price ID for ${plan} not configured.` }, { status: 503 });
    }

    const stripe = requireStripe();
    const origin = req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_collection: "always",
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          plan,
          company_name: String(body.company_name || ""),
        },
      },
      metadata: {
        plan,
        company_name: String(body.company_name || ""),
      },
      success_url: `${origin}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/onboarding?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout creation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
