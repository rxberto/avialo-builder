import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ProgressBar({ pasos, pasoActual, onStepClick, maxReachedStep = 0 }) {
  return (
    <div className="relative px-2">
      {/* Background & active tracks */}
      <div className="absolute top-5 left-[calc(100%/(2*var(--steps)))] right-[calc(100%/(2*var(--steps)))] h-[2px] bg-zinc-100 dark:bg-zinc-800 -z-10"
        style={{ '--steps': pasos.length }}>
        <motion.div
          className="h-full bg-zinc-900 dark:bg-zinc-100"
          initial={{ width: '0%' }}
          animate={{ width: `${(pasoActual / (pasos.length - 1)) * 100}%` }}
          transition={{ duration: 0.5, ease: 'anticipate' }}
        />
      </div>

      <div className="flex items-start justify-between">
        {pasos.map((nombre, i) => {
          const isCompleted = i < pasoActual;
          const isCurrent   = i === pasoActual;
          const isReachable = i <= maxReachedStep;
          const isClickable = isReachable && i !== pasoActual && onStepClick;

          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center gap-3 relative z-10 transition-all duration-300",
                isClickable ? "cursor-pointer hover:opacity-80" : ""
              )}
              style={{ width: `${100 / pasos.length}%` }}
              onClick={() => isClickable && onStepClick(i)}
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 border-2",
                  isCompleted
                    ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                    : isCurrent
                      ? "bg-white dark:bg-zinc-950 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-50 ring-4 ring-zinc-900/5"
                      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" strokeWidth={3} />
                ) : (
                  <span>{i + 1}</span>
                )}
              </motion.div>

              <span
                className={cn(
                  "text-[11px] text-center tracking-medium font-medium transition-colors duration-300 whitespace-nowrap",
                  isCurrent
                    ? "text-zinc-900 dark:text-zinc-50 font-semibold"
                    : isCompleted
                      ? "text-zinc-500 dark:text-zinc-400"
                      : "text-zinc-400 dark:text-zinc-600"
                )}
              >
                {nombre}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
