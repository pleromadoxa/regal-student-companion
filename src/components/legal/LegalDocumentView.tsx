import Link from "next/link";
import type { LegalDocument } from "@/lib/legal/types";
import { REGAL_MAIL_URL } from "@/lib/branding";

export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  return (
    <article className="max-w-3xl mx-auto">
      <header className="mb-10 pb-8 border-b border-white/10">
        <p className="text-xs text-regal-pink uppercase tracking-wider font-semibold mb-2">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">{doc.title}</h1>
        <p className="text-muted mt-3 leading-relaxed">{doc.summary}</p>
        <p className="text-xs text-muted mt-4">Last updated: {doc.lastUpdated}</p>
      </header>
      <div className="space-y-10">
        {doc.sections.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-lg font-bold text-white mb-3">{section.title}</h2>
            <div className="space-y-3 text-sm text-muted leading-relaxed">
              {section.paragraphs.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
            {section.bullets && section.bullets.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm text-muted list-disc pl-5">
                {section.bullets.map((b) => (
                  <li key={b.slice(0, 40)}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <footer className="mt-14 pt-8 border-t border-white/10 text-sm text-muted">
        <p>
          Questions? Contact{" "}
          <a href="mailto:legal@regalmail.me" className="text-regal-pink hover:underline">
            legal@regalmail.me
          </a>
          {" · "}
          <Link href="/legal/privacy" className="hover:text-white">
            Privacy Policy
          </Link>
          {" · "}
          <a href={REGAL_MAIL_URL} className="hover:text-white" target="_blank" rel="noopener noreferrer">
            Regal Mail
          </a>
        </p>
      </footer>
    </article>
  );
}
