import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to Regal Student Companion with your Regal Mail account.",
};

export default function LoginPage() {
  return (
    <AuthShell
      brand="Regal Companion"
      heroTitle="Welcome back"
      heroDescription="Sign in to your semester command center in seconds."
      steps={[
        { number: 1, text: "Enter your Regal Mail address", active: true },
        { number: 2, text: "Confirm your identity" },
        { number: 3, text: "Open your workspace" },
      ]}
    >
      <LoginForm />
    </AuthShell>
  );
}
