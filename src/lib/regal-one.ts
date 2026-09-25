/**
 * Regal One plan identity — vendored from the shared `@regal/entitlements`
 * package that every Regal app reads (source of truth lives in the Regal Cloud
 * repo: `packages/regal-entitlements/src/plans.ts`).
 *
 * KEEP IN SYNC with that package. The Regal One subscription rides on the
 * shared @regalmail.me account's `user_metadata.regal_plan`, which is written
 * by the Regal Mail billing webhook — so this app can read the plan from the
 * same auth user it already trusts.
 *
 * Ecosystem behaviour mirrored here:
 *  - plan normalization (aliases like `vault+`, `education`, `corporate`)
 *  - AI quota per plan: free 20/day · pro 200/day · premium & above unlimited
 *  - tier display names used across Mail, Cloud, Photos, Notes & Student Companion
 */

export type RegalPlanId =
  | "free"
  | "pro"
  | "vault_plus"
  | "ultra"
  | "business_education"
  | "business_corporate"
  | "team";

/** Canonical Regal One upgrade page (from `packages/regal-entitlements/src/domains.ts`). */
export const REGAL_ONE_SITE_URL = "https://regalmesh.com/regal-one";

/** Mirror of `regalPlanIdFromMetadata` in @regal/entitlements. */
export function regalPlanIdFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): RegalPlanId {
  const raw =
    typeof metadata?.regal_plan === "string" ? metadata.regal_plan.trim().toLowerCase() : "";
  if (raw === "pro") return "pro";
  if (raw === "vault_plus" || raw === "vault+" || raw === "vaultplus") return "vault_plus";
  if (raw === "ultra") return "ultra";
  if (raw === "team" || raw === "teams" || raw === "business_team") return "team";
  if (raw === "business_education" || raw === "business-education" || raw === "education") {
    return "business_education";
  }
  if (
    raw === "business_corporate" ||
    raw === "business-corporate" ||
    raw === "corporate" ||
    raw === "business"
  ) {
    return "business_corporate";
  }
  return "free";
}

/** Mirror of `dailyAiQuotaForPlan` — `"unlimited"` for Premium, Ultra, Teams & Business. */
export function dailyAiQuotaForPlan(plan: RegalPlanId): number | "unlimited" {
  if (plan === "free") return 20;
  if (plan === "pro" || plan === "business_education") return 200;
  return "unlimited";
}

/** Mirror of `planDisplayName` — the label every Regal app shows for this plan. */
export function regalTierLabel(plan: RegalPlanId): string {
  switch (plan) {
    case "pro":
      return "Regal One · Plus";
    case "vault_plus":
      return "Regal One · Premium";
    case "ultra":
      return "Regal One · Ultra";
    case "team":
      return "Regal Cloud · Teams";
    case "business_education":
      return "Business · Education";
    case "business_corporate":
      return "Business · Corporate";
    default:
      return "Regal One · Free";
  }
}

export function isPaidRegalPlan(plan: RegalPlanId): boolean {
  return plan !== "free";
}
