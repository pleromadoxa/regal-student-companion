import type { LegalDocument, LegalSlug } from "@/lib/legal/types";

const UPDATED = "July 1, 2026";
const SERVICE = "Regal Student Companion";
const OPERATOR = "Quantum Regal";
const SITE = "regalcompanion.cloud";

export const LEGAL_DOCUMENTS: Record<LegalSlug, LegalDocument> = {
  terms: {
    slug: "terms",
    title: "Terms of Service",
    summary: `These Terms govern your access to and use of ${SERVICE} (${SITE}), operated as part of the ${OPERATOR} / Regal Mail ecosystem.`,
    lastUpdated: UPDATED,
    sections: [
      {
        id: "acceptance",
        title: "1. Acceptance of Terms",
        paragraphs: [
          `By accessing or using ${SERVICE}, creating an account, or clicking "I agree," you enter a binding agreement with ${OPERATOR} ("we," "us," "our"). If you do not agree, do not use the Service.`,
          "We may update these Terms at any time. Material changes will be posted on this page with an updated date. Continued use after changes constitutes acceptance.",
        ],
      },
      {
        id: "eligibility",
        title: "2. Eligibility",
        paragraphs: [
          "You must be at least 16 years old to use the Service independently. Users aged 13–15 may use the Service only with verifiable parental or guardian consent.",
          "You must have a valid Regal Mail account where required and provide accurate registration information. You are responsible for safeguarding your credentials.",
        ],
      },
      {
        id: "service",
        title: "3. The Service",
        paragraphs: [
          `${SERVICE} is an academic productivity platform including tasks, study tools, Regal AI features, and optional Regal Cloud sync. Features vary by subscription plan.`,
          "We may modify, suspend, or discontinue any feature with reasonable notice where practicable. We do not guarantee uninterrupted availability.",
        ],
      },
      {
        id: "accounts",
        title: "4. Accounts & Security",
        paragraphs: [
          "You are responsible for all activity under your account. Notify us immediately of unauthorized access at legal@regalmail.me.",
          "We may suspend or terminate accounts that violate these Terms, pose security risks, or remain inactive for extended periods after notice.",
        ],
      },
      {
        id: "user-content",
        title: "5. Your Content",
        paragraphs: [
          "You retain ownership of content you submit (notes, uploads, assignments, messages). You grant us a worldwide, non-exclusive, royalty-free license to host, process, transmit, and display your content solely to operate and improve the Service.",
          "You represent that you have all rights necessary to submit content and that it does not infringe third-party rights or violate law.",
        ],
      },
      {
        id: "ai",
        title: "6. Regal AI",
        paragraphs: [
          "Regal AI outputs are generated automatically and may be inaccurate, incomplete, or outdated. AI is not a substitute for professional academic, legal, medical, or financial advice.",
          "You are solely responsible for reviewing, verifying, and appropriately citing any AI-assisted work before submission to institutions or third parties.",
        ],
      },
      {
        id: "billing",
        title: "7. Subscriptions & Billing",
        paragraphs: [
          "Paid plans renew automatically each billing period unless cancelled before renewal. Prices are shown in USD unless stated otherwise.",
          "Refunds are governed by our Refunds & Billing Policy. Failure to pay may result in downgrade or suspension of paid features.",
        ],
      },
      {
        id: "prohibited",
        title: "8. Prohibited Conduct",
        paragraphs: ["You agree not to:"],
        bullets: [
          "Violate academic integrity policies or submit AI output as solely your own work where prohibited.",
          "Reverse engineer, scrape, or overload the Service.",
          "Upload malware, illegal content, or content that harasses others.",
          "Circumvent usage limits, plan gates, or security measures.",
          "Use the Service for commercial resale without written permission.",
        ],
      },
      {
        id: "ip",
        title: "9. Intellectual Property",
        paragraphs: [
          `${SERVICE}, Regal AI, Regal Cloud, logos, and software are owned by ${OPERATOR} or licensors. Except for limited use rights in these Terms, no rights are granted.`,
          "Feedback you provide may be used by us without obligation or compensation.",
        ],
      },
      {
        id: "disclaimer",
        title: "10. Disclaimer of Warranties",
        paragraphs: [
          "THE SERVICE IS PROVIDED AS IS AND AS AVAILABLE WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.",
        ],
      },
      {
        id: "liability",
        title: "11. Limitation of Liability",
        paragraphs: [
          `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ${OPERATOR} AND ITS AFFILIATES SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, GOODWILL, OR ACADEMIC OUTCOMES.`,
          "Our aggregate liability for any claim arising from the Service shall not exceed the greater of (a) amounts you paid us in the twelve (12) months before the claim, or (b) USD $100.",
        ],
      },
      {
        id: "indemnity",
        title: "12. Indemnification",
        paragraphs: [
          "You agree to defend, indemnify, and hold harmless Regal Network, its officers, directors, employees, and agents from claims arising from your use of the Service, your content, or your violation of these Terms or applicable law.",
        ],
      },
      {
        id: "disputes",
        title: "13. Dispute Resolution",
        paragraphs: [
          "Before filing a claim, contact legal@regalmail.me to attempt informal resolution within 30 days.",
          "Except where prohibited by law, disputes shall be resolved by binding individual arbitration under internationally recognized rules, not in a class or representative action. You waive any right to participate in class actions against us.",
          "These Terms are governed by the laws of Ghana, without regard to conflict-of-law principles, except that mandatory consumer protections in your country of residence remain applicable where required by law.",
        ],
      },
      {
        id: "general",
        title: "14. General",
        paragraphs: [
          "If any provision is unenforceable, the remainder stays in effect. Our failure to enforce a right is not a waiver.",
          "You may not assign these Terms without our consent. We may assign them in connection with a merger or sale.",
          "Contact: legal@regalmail.me · Regal Student Companion · regalcompanion.cloud",
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Privacy Policy",
    summary: `How ${OPERATOR} collects, uses, shares, and protects personal data when you use ${SERVICE}.`,
    lastUpdated: UPDATED,
    sections: [
      {
        id: "controller",
        title: "1. Data Controller",
        paragraphs: [
          `${OPERATOR} is the data controller for personal data processed through ${SERVICE}. Contact: legal@regalmail.me.`,
        ],
      },
      {
        id: "collect",
        title: "2. Data We Collect",
        paragraphs: ["We may collect:"],
        bullets: [
          "Account data: Regal Mail email, display name, profile photo, academic info you provide.",
          "Usage data: features used, AI request counts, engagement metrics, device/browser type, IP address, timestamps.",
          "Content you create: tasks, notes, uploads, study circle messages, Regal Cloud sync bundles.",
          "Payment metadata: plan tier, transaction references (card details are handled by our payment processor).",
          "Cookies and similar technologies as described in our Cookie Policy.",
        ],
      },
      {
        id: "use",
        title: "3. How We Use Data",
        paragraphs: ["We use personal data to:"],
        bullets: [
          "Provide, secure, and improve the Service.",
          "Authenticate you via Regal Mail and enforce plan limits.",
          "Process subscriptions and support requests.",
          "Generate Regal AI responses and Regal Cloud backups you request.",
          "Send service-related communications (not third-party marketing without consent).",
          "Comply with legal obligations and prevent fraud or abuse.",
        ],
      },
      {
        id: "legal-bases",
        title: "4. Legal Bases (EEA/UK)",
        paragraphs: [
          "Where GDPR applies, we rely on: contract performance, legitimate interests (security, improvement), consent (where required), and legal obligation.",
        ],
      },
      {
        id: "sharing",
        title: "5. Sharing",
        paragraphs: [
          "We do not sell your personal data. We share data only with infrastructure and service providers that help us operate the Service (hosting, authentication, payments, AI inference), under contractual confidentiality and data-protection obligations.",
          "We may disclose data if required by law, to protect rights and safety, or in connection with a merger or acquisition with notice where required.",
        ],
      },
      {
        id: "transfers",
        title: "6. International Transfers",
        paragraphs: [
          "Data may be processed in countries other than your own. Where required, we implement appropriate safeguards such as standard contractual clauses or equivalent mechanisms.",
        ],
      },
      {
        id: "retention",
        title: "7. Retention",
        paragraphs: [
          "We retain data while your account is active and as needed to provide the Service, resolve disputes, and meet legal requirements. You may request deletion subject to lawful exceptions.",
        ],
      },
      {
        id: "rights",
        title: "8. Your Rights",
        paragraphs: [
          "Depending on your location, you may have rights to access, correct, delete, restrict, port, or object to processing, and to withdraw consent. California residents may have additional rights under CCPA/CPRA.",
          "Submit requests to legal@regalmail.me. We will verify identity before responding. You may lodge a complaint with your local supervisory authority.",
        ],
      },
      {
        id: "children",
        title: "9. Children",
        paragraphs: [
          "The Service is not directed to children under 13. We do not knowingly collect data from children under 13 without parental consent as required by law.",
        ],
      },
      {
        id: "security",
        title: "10. Security",
        paragraphs: [
          "We implement technical and organizational measures including encryption in transit, access controls, and isolated companion data storage. No method of transmission is 100% secure.",
        ],
      },
      {
        id: "changes",
        title: "11. Changes",
        paragraphs: [
          "We may update this Policy. Material changes will be posted here with a new effective date.",
        ],
      },
    ],
  },
  cookies: {
    slug: "cookies",
    title: "Cookie Policy",
    summary: "How we use cookies and similar technologies on regalcompanion.cloud.",
    lastUpdated: UPDATED,
    sections: [
      {
        id: "what",
        title: "1. What Are Cookies",
        paragraphs: [
          "Cookies are small text files stored on your device. We also use local storage for preferences and sync metadata.",
        ],
      },
      {
        id: "types",
        title: "2. Types We Use",
        bullets: [
          "Strictly necessary: authentication session cookies required to keep you signed in.",
          "Functional: preferences such as theme or dismissed notices.",
          "Analytics: aggregated usage to improve performance (where enabled).",
        ],
        paragraphs: [],
      },
      {
        id: "control",
        title: "3. Your Choices",
        paragraphs: [
          "You can block cookies in browser settings, but essential features may not work. Use your browser's help documentation to manage cookies.",
        ],
      },
      {
        id: "contact",
        title: "4. Contact",
        paragraphs: ["Questions: legal@regalmail.me"],
      },
    ],
  },
  "acceptable-use": {
    slug: "acceptable-use",
    title: "Acceptable Use Policy",
    summary: "Rules for fair and lawful use of Regal Student Companion.",
    lastUpdated: UPDATED,
    sections: [
      {
        id: "purpose",
        title: "1. Purpose",
        paragraphs: [
          "This Policy supplements our Terms of Service and applies to all users, including free and paid plans.",
        ],
      },
      {
        id: "allowed",
        title: "2. Permitted Use",
        bullets: [
          "Personal academic study, research assistance, and productivity.",
          "Collaboration in study circles with consenting participants.",
          "Backing up your own academic materials via Regal Cloud.",
        ],
        paragraphs: [],
      },
      {
        id: "prohibited",
        title: "3. Prohibited Use",
        bullets: [
          "Academic dishonesty where your institution prohibits AI assistance.",
          "Generating harmful, illegal, hateful, or sexually exploitative content.",
          "Automated scraping, credential stuffing, or denial-of-service attacks.",
          "Impersonation, spam, or phishing.",
          "Sharing account credentials or reselling access.",
        ],
        paragraphs: [],
      },
      {
        id: "enforcement",
        title: "4. Enforcement",
        paragraphs: [
          "Violations may result in warning, feature restriction, suspension, or permanent termination without refund where permitted by law. We may report illegal activity to authorities.",
        ],
      },
    ],
  },
  disclaimer: {
    slug: "disclaimer",
    title: "Disclaimer",
    summary: "Important limitations regarding Regal AI, academic outcomes, and educational use.",
    lastUpdated: UPDATED,
    sections: [
      {
        id: "general",
        title: "1. General",
        paragraphs: [
          `${SERVICE} is an educational productivity tool. It does not guarantee grades, admissions, employment, or academic success.`,
        ],
      },
      {
        id: "ai",
        title: "2. Regal AI Disclaimer",
        paragraphs: [
          "Regal AI may produce errors, hallucinations, or biased content. Always verify facts, citations, and calculations independently.",
          "You are responsible for compliance with your school, university, or exam board policies regarding AI use.",
        ],
      },
      {
        id: "professional",
        title: "3. No Professional Advice",
        paragraphs: [
          "Nothing in the Service constitutes legal, medical, financial, or professional advice. Consult qualified professionals for such matters.",
        ],
      },
      {
        id: "third-party",
        title: "4. Third-Party Links",
        paragraphs: [
          "Links to Regal Mail or external sites are provided for convenience. We are not responsible for third-party content or policies.",
        ],
      },
    ],
  },
  refunds: {
    slug: "refunds",
    title: "Refunds & Billing Policy",
    summary: "Subscription billing, cancellation, and refund terms for paid plans.",
    lastUpdated: UPDATED,
    sections: [
      {
        id: "plans",
        title: "1. Plans",
        paragraphs: [
          "Scholar is free. Graduate and Campus are paid monthly subscriptions in USD unless otherwise stated.",
        ],
      },
      {
        id: "billing",
        title: "2. Billing",
        paragraphs: [
          "Paid subscriptions renew automatically each month until cancelled. You authorize recurring charges to your selected payment method.",
          "Price changes will be communicated in advance; continued use after the effective date constitutes acceptance.",
        ],
      },
      {
        id: "cancel",
        title: "3. Cancellation",
        paragraphs: [
          "Cancel anytime from Profile → Plans. Cancellation stops future charges; access to paid features continues until the end of the current billing period unless otherwise stated.",
        ],
      },
      {
        id: "refunds",
        title: "4. Refunds",
        paragraphs: [
          "Except where required by law, payments are non-refundable once a billing period begins. If you believe you were charged in error, contact legal@regalmail.me within 14 days with your transaction reference.",
          "We may offer discretionary credits for significant service outages at our sole discretion.",
        ],
      },
      {
        id: "chargebacks",
        title: "5. Chargebacks",
        paragraphs: [
          "Filing a chargeback without contacting us first may result in account suspension pending investigation.",
        ],
      },
    ],
  },
  dmca: {
    slug: "dmca",
    title: "Copyright & DMCA Policy",
    summary: "How to report copyright infringement and our response process.",
    lastUpdated: UPDATED,
    sections: [
      {
        id: "respect",
        title: "1. Respect for Copyright",
        paragraphs: [
          "We respect intellectual property rights and expect users to upload only content they own or are licensed to use.",
        ],
      },
      {
        id: "notice",
        title: "2. Infringement Notice",
        paragraphs: [
          "Send a detailed notice to legal@regalmail.me including:",
        ],
        bullets: [
          "Identification of the copyrighted work.",
          "Identification of the infringing material and its location in the Service.",
          "Your contact information and a statement of good-faith belief.",
          "A statement under penalty of perjury that the information is accurate and you are authorized to act.",
          "Your physical or electronic signature.",
        ],
      },
      {
        id: "counter",
        title: "3. Counter-Notice",
        paragraphs: [
          "If you believe content was removed in error, you may submit a counter-notice with the information required under applicable law. We may restore content unless the complainant seeks court action.",
        ],
      },
      {
        id: "repeat",
        title: "4. Repeat Infringers",
        paragraphs: [
          "Accounts of repeat infringers may be terminated.",
        ],
      },
    ],
  },
};

export function getLegalDocument(slug: string): LegalDocument | null {
  if (slug in LEGAL_DOCUMENTS) return LEGAL_DOCUMENTS[slug as LegalSlug];
  return null;
}

export function getAllLegalDocuments(): LegalDocument[] {
  return Object.values(LEGAL_DOCUMENTS);
}
