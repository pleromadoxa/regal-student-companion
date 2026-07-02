import { NextRequest, NextResponse } from "next/server";
import { isAdminGateError, requireAdminApi } from "@/lib/admin-api";
import { logAdminAction } from "@/lib/admin";

export async function GET() {
  const gate = await requireAdminApi();
  if (isAdminGateError(gate)) return gate.error;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("companion_coupons")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ coupons: data ?? [] });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdminApi();
  if (isAdminGateError(gate)) return gate.error;
  const { user, supabase } = gate;

  const body = (await request.json()) as {
    code?: string;
    description?: string;
    planId?: string;
    discountPercent?: number;
    trialDays?: number;
    maxUses?: number;
    expiresAt?: string;
  };

  if (!body.code?.trim()) {
    return NextResponse.json({ error: "code required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("companion_coupons")
    .insert({
      code: body.code.trim().toUpperCase(),
      description: body.description ?? null,
      plan_id: body.planId ?? null,
      discount_percent: body.discountPercent ?? 0,
      trial_days: body.trialDays ?? 0,
      max_uses: body.maxUses ?? null,
      expires_at: body.expiresAt ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logAdminAction(user.id, "coupon_create", "coupon", data.id, { code: body.code });
  return NextResponse.json({ coupon: data });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdminApi();
  if (isAdminGateError(gate)) return gate.error;
  const { user, supabase } = gate;

  const body = (await request.json()) as { id?: string; active?: boolean };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("companion_coupons")
    .update({ active: body.active, updated_at: new Date().toISOString() })
    .eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(user.id, "coupon_update", "coupon", body.id, { active: body.active });
  return NextResponse.json({ ok: true });
}
