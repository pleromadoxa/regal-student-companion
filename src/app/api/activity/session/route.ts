import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let path = "/dashboard";
  try {
    const body = (await request.json()) as { path?: string };
    if (body.path) path = body.path.slice(0, 200);
  } catch {
    /* use default */
  }

  await supabase.rpc("companion_record_app_session", { p_path: path });
  return NextResponse.json({ ok: true });
}
