import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalShell } from "@/components/legal/LegalShell";
import { LegalDocumentView } from "@/components/legal/LegalDocumentView";
import { getLegalDocument, LEGAL_DOCUMENTS } from "@/lib/legal/documents";

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getLegalDocument(slug);
  if (!doc) return { title: "Legal" };
  return {
    title: `${doc.title} · Regal Student Companion`,
    description: doc.summary,
  };
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = getLegalDocument(slug);
  if (!doc) notFound();

  return (
    <LegalShell activeSlug={slug}>
      <LegalDocumentView doc={doc} />
    </LegalShell>
  );
}
