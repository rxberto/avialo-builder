"use client";

import * as React from "react";
import { Label as MedusaLabel } from "@medusajs/ui";
import { cn } from "@/lib/utils";

// Adaptador sobre el Label OFICIAL de @medusajs/ui.
const Label = React.forwardRef<
  React.ElementRef<typeof MedusaLabel>,
  React.ComponentPropsWithoutRef<typeof MedusaLabel>
>(({ className, ...props }, ref) => (
  <MedusaLabel ref={ref} size="small" weight="plus" className={cn(className)} {...props} />
));
Label.displayName = "Label";

export { Label };
