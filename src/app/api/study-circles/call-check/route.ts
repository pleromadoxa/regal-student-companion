import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkFeatureAccess } from "@/lib/subscription";

/**
 * Server-side check for a paid plan before starting a study circle call.
 * Frontend calls this before opening the WebRTC room.
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

  const gate = await checkFeatureAccess(supabase, user.id, "studyCirclesUnlimited");
  if (!gate.ok) {
    return NextResponse.json(
      {
        error:
          "Group audio & video calls are a Graduate or Campus plan feature. Upgrade in Profile → Plans.",
        upgradeRequired: true,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true });
}
