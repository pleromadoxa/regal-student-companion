/** User-facing product names — never expose underlying infrastructure vendors. */
export const REGAL_CLOUD = "Regal Cloud" as const;
export const REGAL_CLOUD_SHORT = "Regal Cloud sync" as const;
export const REGAL_AI = "Regal AI" as const;
export const REGAL_MAIL_URL = "https://www.regalmail.me" as const;
export const REGAL_MAIL_LABEL = "Regal Mail" as const;
export const REGAL_ECOSYSTEM = "Regal ecosystem" as const;

export const USER_FACING = {
  cloudBackup: `${REGAL_CLOUD} backup`,
  cloudSync: `${REGAL_CLOUD} sync`,
  aiPowered: `Powered by ${REGAL_AI}`,
  aiEverywhere: `${REGAL_AI} powers 21+ student tools`,
  securePayments: "Secure card payments in USD",
  paymentPending: "Payment verification in progress",
  paymentUnavailable: "Billing is not available yet. Please try again later.",
  authSecured: `Secured with ${REGAL_MAIL_LABEL} authentication`,
  priorityAi: `Priority ${REGAL_AI} routing`,
} as const;
