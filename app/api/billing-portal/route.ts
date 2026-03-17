import { NextRequest, NextResponse } from "next/server";
import { requireStripe } from "@/lib/stripe";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "edge";

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

    const supabase = requireSupabaseAdmin();
    const { data: subRow } = await supabase
      .from("billing_subscriptions")
      .select("stripe_customer_id")
      .eq("customer_email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ stripe_customer_id: string | null }>();

    let customerId = subRow?.stripe_customer_id || null;

    if (!customerId) {
      const stripe = requireStripe();
      const customers = await stripe.customers.list({ email, limit: 1 });
      customerId = customers.data[0]?.id || null;
    }

    if (!customerId) {
      return NextResponse.json({ error: "No billing profile found for this account." }, { status: 404 });
    }

    const stripe = requireStripe();
    const origin = req.nextUrl.origin;
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not open billing portal.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
