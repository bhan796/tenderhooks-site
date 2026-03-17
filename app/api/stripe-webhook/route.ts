import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireStripe } from "@/lib/stripe";
import { requireSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function extractSubscriptionSnapshot(sub: Stripe.Subscription) {
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
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook secret/signature missing." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    const stripe = requireStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = requireSupabaseAdmin();
  const stripe = requireStripe();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(String(session.subscription));

        const payload = {
          ...extractSubscriptionSnapshot(sub),
          customer_email: session.customer_email ? session.customer_email.toLowerCase() : null,
          plan: (sub.metadata?.plan || session.metadata?.plan || "starter") as string,
        };

        await supabase.from("billing_subscriptions").upsert(payload, { onConflict: "stripe_subscription_id" });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      let customerEmail: string | null = null;
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!("deleted" in customer)) {
          customerEmail = customer.email ? customer.email.toLowerCase() : null;
        }
      } catch {
        customerEmail = null;
      }
      const payload = {
        ...extractSubscriptionSnapshot(sub),
        customer_email: customerEmail,
        plan: (sub.metadata?.plan || "starter") as string,
      };
      await supabase.from("billing_subscriptions").upsert(payload, { onConflict: "stripe_subscription_id" });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as any;
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

      if (subscriptionId) {
        await supabase
          .from("billing_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subscriptionId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
