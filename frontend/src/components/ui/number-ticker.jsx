import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function NumberTicker({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
}) {
  const ref = useRef(null);
  const prevValue = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const start = direction === "up" ? 0 : value;
    const end = direction === "up" ? value : 0;
    const duration = 1500;
    const startTime = performance.now() + delay * 1000;

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    let frame;
    function update(now) {
      const elapsed = Math.max(0, now - startTime);
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = start + (end - start) * eased;
      el.textContent = current.toFixed(decimalPlaces);
      if (progress < 1) {
        frame = requestAnimationFrame(update);
      }
    }

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [value, direction, delay, decimalPlaces]);

  return (
    <span
      className={cn(
        "inline-block tabular-nums tracking-tighter",
        className
      )}
      ref={ref}
    >
      {value}
    </span>
  );
}
