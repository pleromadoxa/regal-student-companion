import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFeatureAccess } from "@/lib/subscription";

/**
 * Server-side membership/capability check before opening a study circle call.
 * Any circle member can join the call; paid plans unlock Regal AI inside the call.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { circleId?: string } | null;
  if (!body?.circleId) {
    return NextResponse.json({ error: "circleId required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("companion_circle_members")
    .select("user_id")
    .eq("circle_id", body.circleId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "Not a member of this circle" }, { status: 403 });
  }

  const aiGate = await checkFeatureAccess(supabase, user.id, "liveVoiceTutor");
  return NextResponse.json({ ok: true, aiInCallAllowed: aiGate.ok });
}
