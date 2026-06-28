import * as React from "react";
import { Textarea as MedusaTextarea } from "@medusajs/ui";
import { cn } from "@/lib/utils";

// Adaptador sobre el Textarea OFICIAL de @medusajs/ui.
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return <MedusaTextarea ref={ref} className={cn(className)} {...props} />;
});
Textarea.displayName = "Textarea";

export { Textarea };
