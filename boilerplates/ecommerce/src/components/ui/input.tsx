import * as React from "react";
import { Input as MedusaInput } from "@medusajs/ui";
import { cn } from "@/lib/utils";

// Adaptador sobre el Input OFICIAL de @medusajs/ui (misma API que un <input>).
// Omitimos el `size` nativo (number) porque Medusa usa `size` para su tamaño visual.
const Input = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">
>(({ className, ...props }, ref) => {
  return <MedusaInput ref={ref} className={cn(className)} {...props} />;
});
Input.displayName = "Input";

export { Input };
