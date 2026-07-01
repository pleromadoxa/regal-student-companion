"use client";

import { useState } from "react";
import { cn, getInitials } from "@/lib/utils";
import { resolveAvatarUrl } from "@/lib/profile-avatar";

type ProfileAvatarProps = {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  fallbackClassName?: string;
};

export function ProfileAvatar({
  userId,
  name,
  avatarUrl,
  size = 36,
  className,
  fallbackClassName,
}: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : resolveAvatarUrl(userId, avatarUrl);

  if (!src) {
    return (
      <div
        className={cn(
          "rounded-full regal-ai-gradient flex items-center justify-center font-bold text-white shrink-0 ring-2 ring-white/10",
          fallbackClassName,
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        aria-hidden
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn(
        "rounded-full object-cover shrink-0 ring-2 ring-white/10 bg-white/10",
        className
      )}
    />
  );
}
