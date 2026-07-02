import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthUser, getCompanionProfile } from "@/lib/supabase/auth-server";
import { isCompanionAdmin, getCompanionAdminRecord } from "@/lib/admin";
import { AdminClient } from "@/components/admin/AdminClient";

export const metadata: Metadata = {
  title: "Admin Console",
  description: "Regal Student Companion administration.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const user = await requireAuthUser();
  const isAdmin = await isCompanionAdmin(user);
  if (!isAdmin) redirect("/dashboard");

  const admin = await getCompanionAdminRecord(user);
  const profile = await getCompanionProfile(user.id);

  return <AdminClient adminEmail={admin?.email ?? profile?.email ?? user.email ?? "admin"} />;
}
