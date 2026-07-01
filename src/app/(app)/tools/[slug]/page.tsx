import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolPage } from "@/components/tools/ToolsHub";
import { getToolBySlug, STUDENT_TOOLS } from "@/lib/student-tools";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getToolBySlug(slug);
  if (!tool) return { title: "Tool not found" };

  return {
    title: tool.name,
    description: tool.description,
    openGraph: {
      title: tool.name,
      description: tool.description,
    },
  };
}

export function generateStaticParams() {
  return STUDENT_TOOLS.map((tool) => ({ slug: tool.slug }));
}

export default async function ToolSlugPage({ params }: PageProps) {
  const { slug } = await params;
  if (!getToolBySlug(slug)) notFound();
  return <ToolPage slug={slug} />;
}
