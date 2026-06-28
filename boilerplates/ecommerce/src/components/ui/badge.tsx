import * as React from "react";
import { Badge as MedusaBadge } from "@medusajs/ui";
import { cn } from "@/lib/utils";

// Adaptador sobre el Badge OFICIAL de @medusajs/ui. Mapea las variantes de color
// que usan las pantallas (green/amber/red/blue/neutral…) a los colores de Medusa.

type ShadcnVariant =
  | "default"
  | "secondary"
  | "outline"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "neutral";
type MedusaColor = "grey" | "red" | "green" | "blue" | "orange" | "purple";

const COLOR_MAP: Record<ShadcnVariant, MedusaColor> = {
  default: "grey",
  secondary: "grey",
  outline: "grey",
  neutral: "grey",
  green: "green",
  amber: "orange",
  red: "red",
  blue: "blue",
};

export interface BadgeProps
  extends Omit<React.ComponentPropsWithoutRef<typeof MedusaBadge>, "color"> {
  variant?: ShadcnVariant;
}

function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <MedusaBadge
      color={COLOR_MAP[variant]}
      size="2xsmall"
      className={cn(className)}
      {...props}
    />
  );
}

export { Badge };
