import { NextRequest, NextResponse } from "next/server";
import { getStripePaymentLink, normalizePlan } from "@/lib/payments";

export async function GET(req: NextRequest) {
  const plan = normalizePlan(req.nextUrl.searchParams.get("plan"));
  const paymentLink = getStripePaymentLink(plan);

  if (!paymentLink) {
    return NextResponse.json(
      { error: `Payment link for '${plan}' is not configured.` },
      { status: 503 },
    );
  }

  return NextResponse.redirect(paymentLink, { status: 302 });
}
