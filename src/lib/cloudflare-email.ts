import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getRuntimeEnv } from "@/lib/env";

type SendEmailBinding = {
  send: (message: {
    to: string;
    from: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<unknown>;
};

export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const binding = (env as Record<string, unknown>).EMAIL as SendEmailBinding | undefined;
    const from =
      (await getRuntimeEnv("EMAIL_FROM_ADDRESS"))?.trim() || "notifications@regalcompanion.cloud";

    if (!binding?.send) {
      return { ok: false as const, reason: "EMAIL binding unavailable" };
    }

    await binding.send({
      to: input.to,
      from,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });

    return { ok: true as const };
  } catch (error) {
    console.error("[email] send failed", error);
    return {
      ok: false as const,
      reason: error instanceof Error ? error.message : "Email send failed",
    };
  }
}
