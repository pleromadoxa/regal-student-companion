"use server";

import { revalidatePath } from "next/cache";

/** Invalidate cached RSC data after client mutations (tasks, profile, etc.). */
export async function revalidateAppPaths(
  paths: string[] = ["/dashboard", "/profile", "/leaderboard"]
) {
  for (const path of paths) {
    revalidatePath(path);
  }
}

export async function revalidateDashboard() {
  revalidatePath("/dashboard");
}

export async function revalidateProfile() {
  revalidatePath("/profile");
  revalidatePath("/dashboard");
}
