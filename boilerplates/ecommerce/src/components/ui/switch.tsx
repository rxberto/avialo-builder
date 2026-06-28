"use client";

import * as React from "react";
import { Switch as MedusaSwitch } from "@medusajs/ui";
import { cn } from "@/lib/utils";

// Adaptador sobre el Switch OFICIAL de @medusajs/ui (misma API Radix: checked/onCheckedChange).
const Switch = React.forwardRef<
  React.ElementRef<typeof MedusaSwitch>,
  React.ComponentPropsWithoutRef<typeof MedusaSwitch>
>(({ className, ...props }, ref) => (
  <MedusaSwitch ref={ref} className={cn(className)} {...props} />
));
Switch.displayName = "Switch";

export { Switch };
