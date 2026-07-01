import { createHmac } from "node:crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

export function paystackSecretKey(): string | null {
  return process.env.PAYSTACK_SECRET_KEY?.trim() || null;
}

export function paystackPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.trim() || null;
}

export function isPaystackConfigured(): boolean {
  return Boolean(paystackSecretKey() && paystackPublicKey());
}

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

export async function paystackRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<PaystackResponse<T>> {
  const secret = paystackSecretKey();
  if (!secret) throw new Error("Paystack is not configured");

  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const body = (await res.json()) as PaystackResponse<T>;
  if (!res.ok || !body.status) {
    throw new Error(body.message || "Paystack request failed");
  }
  return body;
}

export type InitializeTransactionData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializeTransaction(params: {
  email: string;
  amountCents: number;
  currency?: "USD" | "NGN";
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
}): Promise<InitializeTransactionData> {
  const currency = params.currency ?? "USD";
  const { data } = await paystackRequest<InitializeTransactionData>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: params.email,
        amount: params.amountCents,
        currency,
        reference: params.reference,
        callback_url: params.callbackUrl,
        metadata: params.metadata,
        channels: ["card"],
      }),
    }
  );
  return data;
}

export type VerifyTransactionData = {
  status: string;
  reference: string;
  amount: number;
  customer: { customer_code?: string };
  metadata?: Record<string, unknown>;
};

export async function verifyTransaction(
  reference: string
): Promise<VerifyTransactionData> {
  const { data } = await paystackRequest<VerifyTransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
  return data;
}

export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = paystackSecretKey();
  if (!secret || !signature) return false;

  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}
