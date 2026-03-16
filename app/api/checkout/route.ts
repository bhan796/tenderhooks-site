import { NextRequest, NextResponse } from "next/server";
import { requireStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type PlanTier = "starter" | "pro";

function normalizePlan(value: string): PlanTier {
  return value === "pro" ? "pro" : "starter";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const plan = normalizePlan(String(body.plan || "starter"));
    const email = String(body.contact_email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "contact_email is required" }, { status: 400 });
    }

    const priceId =
      plan === "pro"
        ? process.env.STRIPE_PRICE_ID_PRO
        : process.env.STRIPE_PRICE_ID_STARTER;

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
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/onboarding?checkout=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout creation failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
