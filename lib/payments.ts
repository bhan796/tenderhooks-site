export type PlanTier = "starter" | "pro";

export function normalizePlan(raw: string | null | undefined): PlanTier {
  return (raw || "starter").toLowerCase() === "pro" ? "pro" : "starter";
}

export function getStripePaymentLink(plan: PlanTier): string | null {
  const starter = process.env.STRIPE_PAYMENT_LINK_STARTER || "";
  const pro = process.env.STRIPE_PAYMENT_LINK_PRO || "";
  const value = plan === "pro" ? pro : starter;
  return value.trim() ? value.trim() : null;
}
