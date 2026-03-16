import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export const stripe =
  stripeSecretKey
    ? new Stripe(stripeSecretKey)
    : null;

export function requireStripe() {
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return stripe;
}
