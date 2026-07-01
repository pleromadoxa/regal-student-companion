export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  summary: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export const LEGAL_SLUGS = [
  "terms",
  "privacy",
  "cookies",
  "acceptable-use",
  "disclaimer",
  "refunds",
  "dmca",
] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];
