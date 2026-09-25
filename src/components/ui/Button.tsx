import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "regal-btn-primary text-white font-semibold",
    secondary:
      "bg-white/[0.06] border border-white/[0.12] text-white hover:bg-white/[0.1] hover:border-white/20 font-medium backdrop-blur-sm",
    ghost: "text-muted hover:text-white hover:bg-white/[0.05] font-medium",
    danger: "bg-red-500/15 border border-red-500/25 text-red-300 hover:bg-red-500/25 font-medium",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-5 py-2.5 text-sm rounded-xl",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
