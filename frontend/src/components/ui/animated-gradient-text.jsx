import React from "react";
import { cn } from "@/lib/utils";

export function AnimatedGradientText({ children, className }) {
  return (
    <div
      className={cn(
        "group relative flex max-w-fit flex-row items-center justify-center rounded-full px-4 py-1.5 text-sm font-medium",
        "bg-white/40 dark:bg-black/40 backdrop-blur-sm",
        "shadow-[inset_0_-8px_10px_#8fdfff1f] dark:shadow-[inset_0_-8px_10px_#a855f71f]",
        "transition-shadow duration-500 ease-out hover:shadow-[inset_0_-5px_10px_#8fdfff3f]",
        "border border-white/20 dark:border-white/10",
        className
      )}
    >
      <div
        className={cn(
          "absolute inset-0 block h-full w-full animate-gradient",
          "bg-gradient-to-r from-[#ffaa40]/50 via-[#9c40ff]/50 to-[#ffaa40]/50 bg-[length:var(--bg-size,300%)_100%]",
          "[mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)]",
          "rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        )}
      />
      {children}
    </div>
  );
}
