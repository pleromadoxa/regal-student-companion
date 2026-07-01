import { AuthShell } from "@/components/auth/AuthShell";

export const metadata = {
  title: "Sign in",
  description: "Sign in to Regal Student Companion with your Regal Mail account.",
};

export default function LoginPage() {
  return <AuthShell />;
}
