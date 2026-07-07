import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTransactionalEmail } from "@/lib/cloudflare-email";

type StartCallBody = {
  circleId?: string;
  mode?: "audio" | "video";
};

type AlertRecipient = {
  user_id: string;
  email: string;
  display_name: string | null;
  circle_name: string;
  call_id: string;
  mode: "audio" | "video";
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as StartCallBody | null;
    if (!body?.circleId || (body.mode !== "audio" && body.mode !== "video")) {
      return NextResponse.json({ error: "circleId and mode are required" }, { status: 400 });
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

    const { data: existing } = await supabase
      .from("companion_circle_calls")
      .select("*")
      .eq("circle_id", body.circleId)
      .is("ended_at", null)
      .maybeSingle();

    const call =
      existing ??
      (
        await supabase
          .from("companion_circle_calls")
          .insert({
            circle_id: body.circleId,
            started_by: user.id,
            mode: body.mode,
            ai_enabled: false,
          })
          .select()
          .single()
      ).data;

    if (!call) {
      return NextResponse.json({ error: "Could not create call" }, { status: 500 });
    }

    if (!existing) {
      await supabase
        .from("companion_study_circles")
        .update({ active_call_id: call.id })
        .eq("id", body.circleId);
    }

    let recipients: AlertRecipient[] = [];
    let emailed = 0;
    if (!existing) {
      const { data: recipientsData, error: alertsError } = await supabase.rpc(
        "companion_create_call_alerts",
        { p_call_id: call.id }
      );

      if (alertsError) {
        return NextResponse.json({ error: alertsError.message }, { status: 500 });
      }

      recipients = (recipientsData ?? []) as AlertRecipient[];
      const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://regalcompanion.cloud";

      const emailResults = await Promise.allSettled(
        recipients
          .filter((recipient) => Boolean(recipient.email))
          .map((recipient) =>
            sendTransactionalEmail({
              to: recipient.email,
              subject: `${recipient.circle_name}: live ${recipient.mode} study call started`,
              html: `<p>Hi ${recipient.display_name ?? "student"},</p>
<p>A live <strong>${recipient.mode}</strong> study call just started in <strong>${recipient.circle_name}</strong>.</p>
<p><a href="${appUrl}/study-circles?circle=${body.circleId}">Open the study circle and join the call</a>.</p>
<p>See you there,<br/>Regal Student Companion</p>`,
              text:
                `Hi ${recipient.display_name ?? "student"},\n\n` +
                `A live ${recipient.mode} study call just started in ${recipient.circle_name}.\n\n` +
                `Open the study circle and join: ${appUrl}/study-circles?circle=${body.circleId}\n\n` +
                `Regal Student Companion`,
            })
          )
      );

      emailed = emailResults.filter(
        (result) => result.status === "fulfilled" && result.value.ok
      ).length;
    }

    return NextResponse.json({
      call,
      notifiedMembers: recipients.length,
      emailedMembers: emailed,
      reusedExisting: Boolean(existing),
    });
  } catch (error) {
    console.error("[study-circles/start-call]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start call" },
      { status: 500 }
    );
  }
}
