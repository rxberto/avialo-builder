import * as React from "react";
import { Button as MedusaButton } from "@medusajs/ui";
import { cn } from "@/lib/utils";

// Adaptador sobre el Button OFICIAL de @medusajs/ui. Conserva la API de shadcn
// (variant/size/asChild) que usan las pantallas, traduciéndola a la de Medusa,
// para que TODO el panel use el botón real de Medusa sin reescribir cada llamada.

type ShadcnVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
type ShadcnSize = "default" | "sm" | "lg" | "icon";
type MedusaVariant = "primary" | "secondary" | "transparent" | "danger";
type MedusaSize = "small" | "base" | "large";

const VARIANT_MAP: Record<ShadcnVariant, MedusaVariant> = {
  default: "primary",
  destructive: "danger",
  outline: "secondary",
  secondary: "secondary",
  ghost: "transparent",
  link: "transparent",
};
const SIZE_MAP: Record<ShadcnSize, MedusaSize> = {
  default: "base",
  sm: "small",
  lg: "large",
  icon: "base",
};

export interface ButtonProps
  extends Omit<React.ComponentPropsWithoutRef<typeof MedusaButton>, "variant" | "size"> {
  variant?: ShadcnVariant;
  size?: ShadcnSize;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <MedusaButton
        ref={ref}
        variant={VARIANT_MAP[variant]}
        size={SIZE_MAP[size]}
        className={cn(
          size === "icon" && "h-8 w-8 p-0",
          variant === "link" && "border-0 bg-transparent px-0 underline-offset-4 hover:underline",
          "gap-x-1.5",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
