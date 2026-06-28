"use client";

import { useEffect, useRef } from "react";

export interface RedsysForm {
  url: string;
  Ds_SignatureVersion: string;
  Ds_MerchantParameters: string;
  Ds_Signature: string;
}

// Auto-postea el formulario firmado al TPV de Redsys (redirección del navegador al banco).
export function RedsysRedirect({ form }: { form: RedsysForm }) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    ref.current?.submit();
  }, []);

  return (
    <form ref={ref} method="POST" action={form.url} className="hidden">
      <input type="hidden" name="Ds_SignatureVersion" value={form.Ds_SignatureVersion} />
      <input type="hidden" name="Ds_MerchantParameters" value={form.Ds_MerchantParameters} />
      <input type="hidden" name="Ds_Signature" value={form.Ds_Signature} />
    </form>
  );
}
