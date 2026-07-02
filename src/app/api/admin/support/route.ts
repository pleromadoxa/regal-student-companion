import { NextRequest, NextResponse } from "next/server";
import { isAdminGateError, requireAdminApi } from "@/lib/admin-api";
import { logAdminAction } from "@/lib/admin";

export async function GET() {
  const gate = await requireAdminApi();
  if (isAdminGateError(gate)) return gate.error;
  const { supabase } = gate;

  const { data, error } = await supabase
    .from("companion_support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireAdminApi();
  if (isAdminGateError(gate)) return gate.error;
  const { user, supabase } = gate;

  const body = (await request.json()) as {
    id?: string;
    status?: string;
    priority?: string;
    adminNotes?: string;
  };
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.status) patch.status = body.status;
  if (body.priority) patch.priority = body.priority;
  if (body.adminNotes !== undefined) patch.admin_notes = body.adminNotes;

  const { error } = await supabase.from("companion_support_tickets").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(user.id, "support_update", "ticket", body.id, patch);
  return NextResponse.json({ ok: true });
}
