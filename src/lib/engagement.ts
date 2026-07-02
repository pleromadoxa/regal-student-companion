import { logActivity, type LogActivityInput } from "@/lib/activity-log";

/** Award engagement points and log platform activity. */
export async function incrementEngagement(
  delta = 5,
  label = "Earned engagement points",
  action = "engagement_points"
): Promise<void> {
  await logActivity({
    action,
    category: "platform",
    label,
    pointsDelta: delta,
  });
}

export { logActivity, type LogActivityInput };
