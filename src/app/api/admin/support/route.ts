import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-server";
import { isCompanionAdmin, logAdminAction } from "@/lib/admin";
import { createServiceClient, hasServiceRole } from "@/lib/supabase/service";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isCompanionAdmin(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasServiceRole()) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const service = createServiceClient();
  const { data, error } = await service
    .from("companion_support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tickets: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isCompanionAdmin(user))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasServiceRole()) return NextResponse.json({ error: "Not configured" }, { status: 503 });

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

  const service = createServiceClient();
  const { error } = await service.from("companion_support_tickets").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(user.id, "support_update", "ticket", body.id, patch);
  return NextResponse.json({ ok: true });
}
