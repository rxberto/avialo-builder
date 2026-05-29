import React from "react";
import { cn } from "@/lib/utils";

export function ShimmerButton({
  shimmerColor = "#ffffff",
  shimmerSize = "0.05em",
  shimmerDuration = "3s",
  borderRadius = "0.75rem",
  background = "rgba(0, 0, 0, 1)",
  className,
  children,
  ...props
}) {
  return (
    <button
      style={{
        "--shimmer-color": shimmerColor,
        "--shimmer-size": shimmerSize,
        "--shimmer-duration": shimmerDuration,
        "--border-radius": borderRadius,
        "--background": background,
      }}
      className={cn(
        "group relative z-0 flex cursor-pointer items-center justify-center gap-2 overflow-hidden whitespace-nowrap px-6 py-3 text-white",
        "transform-gpu transition-transform duration-300 active:translate-y-px",
        "[border-radius:var(--border-radius)]",
        "[background:var(--background)]",
        className
      )}
      {...props}
    >
      {/* Shimmer */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden [border-radius:var(--border-radius)]"
        )}
      >
        <div
          className="absolute inset-[-100%] animate-[shimmer_var(--shimmer-duration)_infinite_linear]"
          style={{
            background: `conic-gradient(from 0deg, transparent 0%, transparent 40%, var(--shimmer-color) 50%, transparent 60%, transparent 100%)`,
          }}
        />
      </div>

      {/* Inner content */}
      <div
        className={cn(
          "absolute inset-[1px] [border-radius:calc(var(--border-radius)-1px)]",
          "bg-zinc-950 dark:bg-zinc-950"
        )}
      />

      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
}
