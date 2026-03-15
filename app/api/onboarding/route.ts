import { NextRequest, NextResponse } from "next/server";
import { getStripePaymentLink, normalizePlan } from "@/lib/payments";

type OnboardingPayload = {
  company_name: string;
  contact_name: string;
  contact_email: string;
  digest_time: string;
  primary_services: string;
  keywords: string;
  contract_size: string;
  delivery_channel: string;
  plan: "starter" | "pro";
  regions: string[];
  exclude_keywords: string[];
};

function parseCsvList(value: string): string[] {
  return value
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function isValidEmail(email: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload: OnboardingPayload = {
    company_name: String(body.company_name || "").trim(),
    contact_name: String(body.contact_name || "").trim(),
    contact_email: String(body.contact_email || "").trim(),
    digest_time: String(body.digest_time || "07:30").trim(),
    primary_services: String(body.primary_services || "").trim(),
    keywords: String(body.keywords || "").trim(),
    contract_size: String(body.contract_size || "any").trim(),
    delivery_channel: String(body.delivery_channel || "email").trim(),
    plan: normalizePlan(String(body.plan || "starter")),
    regions: Array.isArray(body.regions)
      ? body.regions.map((x) => String(x).trim()).filter(Boolean)
      : ["New Zealand"],
    exclude_keywords: Array.isArray(body.exclude_keywords)
      ? body.exclude_keywords.map((x) => String(x).trim()).filter(Boolean)
      : [],
  };

  if (!payload.company_name || !payload.contact_name || !payload.contact_email || !payload.keywords) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isValidEmail(payload.contact_email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const intakeRecord = {
    ...payload,
    keywords: parseCsvList(payload.keywords),
    primary_services_list: parseCsvList(payload.primary_services),
    submitted_at_utc: new Date().toISOString(),
    source: "website",
  };

  const webhookUrl = process.env.ONBOARDING_WEBHOOK_URL;
  if (webhookUrl) {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(intakeRecord),
    });

    if (!resp.ok) {
      return NextResponse.json({ error: "Failed to queue onboarding." }, { status: 502 });
    }
  }

  const paymentUrl = getStripePaymentLink(payload.plan);
  return NextResponse.json({ ok: true, plan: payload.plan, paymentUrl, intakeRecord });
}
