import Link from "next/link";
import Image from "next/image";
import { LEGAL_SLUGS } from "@/lib/legal/types";
import { getLegalDocument } from "@/lib/legal/documents";
import { REGAL_MAIL_URL } from "@/lib/branding";
import { COPYRIGHT_LINE, COMPANY_NAME } from "@/lib/company";

const NAV_LABELS: Record<string, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  cookies: "Cookie Policy",
  "acceptable-use": "Acceptable Use",
  disclaimer: "Disclaimer",
  refunds: "Refunds & Billing",
  dmca: "Copyright / DMCA",
};

export function LegalShell({
  children,
  activeSlug,
}: {
  children: React.ReactNode;
  activeSlug?: string;
}) {
  return (
    <div className="min-h-screen bg-[#08040f] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-[#08040f]/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <Image src="/logo.png" alt="" width={47} height={47} className="rounded-lg" />
            <span className="font-bold text-sm hidden sm:block">Regal Companion</span>
          </Link>
          <div className="flex items-center gap-2">
            <a href={REGAL_MAIL_URL} target="_blank" rel="noopener noreferrer">
              <span className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-white/10 text-muted hover:text-white hover:border-regal-purple-400/40 transition-colors">
                Regal Mail
              </span>
            </a>
            <Link href="/login">
              <span className="text-xs sm:text-sm px-3 py-1.5 rounded-lg regal-ai-gradient text-white font-medium">
                Sign in
              </span>
            </Link>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col lg:flex-row gap-10">
        <aside className="lg:w-56 shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Legal center</p>
          <nav className="flex flex-wrap lg:flex-col gap-1">
            {LEGAL_SLUGS.map((slug) => {
              const doc = getLegalDocument(slug);
              if (!doc) return null;
              return (
                <Link
                  key={slug}
                  href={`/legal/${slug}`}
                  className={`text-sm px-3 py-2 rounded-lg transition-colors ${
                    activeSlug === slug
                      ? "bg-regal-purple-500/20 text-white border border-regal-purple-400/30"
                      : "text-muted hover:text-white hover:bg-white/5"
                  }`}
                >
                  {NAV_LABELS[slug] ?? doc.title}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
      <footer className="border-t border-white/10 py-6 px-4 sm:px-6 text-center text-xs text-muted">
        <p>{COPYRIGHT_LINE}</p>
        <p className="mt-1">{COMPANY_NAME} · Regal Student Companion</p>
      </footer>
    </div>
  );
}
