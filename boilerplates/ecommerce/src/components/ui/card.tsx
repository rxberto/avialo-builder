import * as React from "react";
import { Heading } from "@medusajs/ui";
import { cn } from "@/lib/utils";

// "Card" re-skineada con los tokens EXACTOS de Medusa (equivalente a su <Container>):
// fondo base, borde sutil y sombra de tarjeta de Medusa. Mantiene la API (Card/Header/
// Title/Content/…) para no reescribir las pantallas.

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border border-ui-border-base bg-ui-bg-base text-ui-fg-base shadow-elevation-card-rest",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 px-6 py-4", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

function CardTitle({
  className,
  children,
}: React.HTMLAttributes<HTMLHeadingElement>) {
  // Medusa <Heading> no admite ref; lo envolvemos sin reenviarlo.
  return (
    <Heading level="h2" className={cn("text-base", className)}>
      {children}
    </Heading>
  );
}
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-ui-fg-subtle", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-6 py-4 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center px-6 py-4 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
