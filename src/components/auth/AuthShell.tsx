"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { MotionConfig, motion, type Variants } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

/**
 * Hero background video — plays raw, with no overlay / tint mask on top of it.
 * Replicated exactly from Regal Cloud's Aurora auth layout.
 */
export const HERO_VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4";

const heroContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stepList: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, staggerChildren: 0.15, delayChildren: 0.15 },
  },
};

export type AuthStep = {
  number: number;
  text: string;
  active?: boolean;
};

type AuthShellProps = {
  brand?: string;
  heroTitle: string;
  heroDescription: string;
  steps: AuthStep[];
  children: ReactNode;
};

/**
 * Two-column "Aurora" auth layout: a video hero on the left, the form on the right.
 */
export function AuthShell({
  brand = "Regal Companion",
  heroTitle,
  heroDescription,
  steps,
  children,
}: AuthShellProps) {
  return (
    <MotionConfig reducedMotion="user">
      <main className="flex min-h-screen w-full bg-black p-2 selection:bg-white/30 transition-all duration-500 lg:h-[calc(100vh-8rem)] lg:min-h-[calc(100vh-8rem)] lg:overflow-hidden lg:p-4">
        {/* Left column — hero over a raw background video (no overlay, no tint). */}
        <section className="relative hidden h-full w-[52%] flex-col items-center justify-end overflow-hidden rounded-3xl px-12 pb-32 shadow-2xl lg:flex">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
          >
            <source src={HERO_VIDEO_SRC} type="video/mp4" />
          </video>

          <motion.div
            variants={heroContainer}
            initial="hidden"
            animate="visible"
            className="z-10 w-full max-w-xs space-y-8"
          >
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt=""
                width={44}
                height={44}
                decoding="async"
                className="h-11 w-11 shrink-0 rounded-xl object-contain drop-shadow-[0_4px_28px_rgba(124,58,237,0.55)]"
              />
              <span className="text-xl font-semibold tracking-tight text-white">{brand}</span>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-3">
              <h1 className="whitespace-nowrap text-4xl font-medium tracking-tight text-white">
                {heroTitle}
              </h1>
              <p className="px-4 text-sm leading-relaxed text-white/60">{heroDescription}</p>
            </motion.div>

            <motion.div variants={stepList} className="space-y-3">
              {steps.map((step) => (
                <motion.div key={step.number} variants={fadeUp}>
                  <StepItem number={step.number} text={step.text} active={step.active} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Right column — form */}
        <section className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-12 sm:px-12 lg:px-16 lg:py-6 xl:px-24">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="my-auto w-full max-w-xl space-y-8 sm:space-y-10 lg:space-y-6"
          >
            {children}
          </motion.div>
        </section>
      </main>
    </MotionConfig>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-3xl font-medium tracking-tight text-white">{title}</h2>
      <p className="text-sm text-white/40">{subtitle}</p>
    </div>
  );
}

export function AuthDivider({ label = "Or" }: { label?: string }) {
  return (
    <div className="relative flex w-full items-center">
      <span className="h-px w-full border-t border-white/10" />
      <span className="absolute left-1/2 -translate-x-1/2 bg-black px-4 text-xs font-medium uppercase tracking-widest text-white/40">
        {label}
      </span>
    </div>
  );
}

export function StepItem({
  number,
  text,
  active,
}: {
  number: number;
  text: string;
  active?: boolean;
}) {
  return (
    <div
      className={
        active
          ? "flex items-center gap-4 rounded-xl border border-white bg-white px-4 py-3 text-black"
          : "flex items-center gap-4 rounded-xl border-none bg-brand-gray px-4 py-3 text-white"
      }
    >
      <span
        className={
          active
            ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-sm font-semibold text-white"
            : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white/40"
        }
      >
        {number}
      </span>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}

type SocialButtonProps = { icon: ReactNode; label: string } & Omit<
  ComponentProps<"button">,
  "children"
>;

export function SocialButton({ icon, label, className = "", ...props }: SocialButtonProps) {
  return (
    <button
      type="button"
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black text-sm font-medium text-white transition-colors hover:bg-white/5 ${className}`}
      {...props}
    >
      {icon}
      {label}
    </button>
  );
}

type InputGroupProps = {
  label: string;
  placeholder?: string;
  type?: string;
  helperText?: string;
  /** Rendered inside the input, anchored to the right (e.g. the password eye toggle). */
  trailing?: ReactNode;
} & Omit<ComponentProps<"input">, "type">;

export function InputGroup({
  label,
  placeholder,
  type = "text",
  helperText,
  trailing,
  id,
  className = "",
  ...inputProps
}: InputGroupProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-white">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border-none bg-brand-gray px-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 ${
            trailing ? "pr-12" : ""
          } ${className}`}
          {...inputProps}
        />
        {trailing ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</span>
        ) : null}
      </div>
      {helperText ? <p className="text-[11px] text-white/40">{helperText}</p> : null}
    </div>
  );
}

type PasswordInputGroupProps = Omit<InputGroupProps, "type" | "trailing" | "label"> & {
  label?: string;
};

/** Password field with a lucide `Eye` show/hide toggle pinned to the right of the input. */
export function PasswordInputGroup({
  label = "Password",
  helperText = "Minimum 8 characters.",
  ...inputProps
}: PasswordInputGroupProps) {
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup
      label={label}
      type={visible ? "text" : "password"}
      helperText={helperText}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="text-white/40 transition-colors hover:text-white"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...inputProps}
    />
  );
}
