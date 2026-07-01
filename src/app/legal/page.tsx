import Link from "next/link";
import { LegalShell } from "@/components/legal/LegalShell";
import { getAllLegalDocuments } from "@/lib/legal/documents";

export default function LegalIndexPage() {
  const docs = getAllLegalDocuments();
  return (
    <LegalShell>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Legal center</h1>
        <p className="text-muted mb-8 leading-relaxed">
          Policies governing your use of Regal Student Companion. Read these documents carefully
          before using the Service.
        </p>
        <ul className="space-y-3">
          {docs.map((doc) => (
            <li key={doc.slug}>
              <Link
                href={`/legal/${doc.slug}`}
                className="block p-4 rounded-xl border border-white/10 hover:border-regal-purple-400/35 hover:bg-white/[0.03] transition-colors"
              >
                <p className="font-semibold text-white">{doc.title}</p>
                <p className="text-sm text-muted mt-1">{doc.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </LegalShell>
  );
}
