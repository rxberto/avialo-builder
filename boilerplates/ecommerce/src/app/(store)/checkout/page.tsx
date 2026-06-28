"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, ArrowLeft } from "lucide-react";
import type { HttpTypes } from "@medusajs/types";
import { useCart } from "@/lib/cart-context";
import { sdk, STRIPE_PROVIDER_ID, REDSYS_PROVIDER_ID, MEDUSA_BACKEND_URL } from "@/lib/medusa";
import { formatPrice } from "@/lib/format";
import { StripePayment } from "@/components/StripePayment";
import { RedsysRedirect, RedsysForm } from "@/components/RedsysRedirect";

interface AddressForm {
  email: string;
  first_name: string;
  last_name: string;
  address_1: string;
  postal_code: string;
  city: string;
  country_code: string;
  phone: string;
}

const EMPTY_FORM: AddressForm = {
  email: "",
  first_name: "",
  last_name: "",
  address_1: "",
  postal_code: "",
  city: "",
  country_code: "es",
  phone: "",
};

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const router = useRouter();

  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [shippingOptions, setShippingOptions] = useState<
    HttpTypes.StoreCartShippingOption[]
  >([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config de pago de la tienda (resuelta en servidor): si puede cobrar, a qué cuenta
  // conectada (Stripe Connect) y la comisión de la plataforma en puntos básicos.
  const [payConfig, setPayConfig] = useState<{
    provider: string;
    paymentsEnabled: boolean;
    connectedAccount: string | null;
    feeBps: number;
  } | null>(null);
  // Formulario firmado de Redsys: cuando se rellena, redirigimos al TPV del banco.
  const [redsysForm, setRedsysForm] = useState<RedsysForm | null>(null);
  // Retorno desde el TPV (?redsys=ok|ko) — detectado en cliente para no requerir Suspense.
  const [redsysReturn, setRedsysReturn] = useState<"ok" | "ko" | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("redsys");
    if (p === "ok" || p === "ko") setRedsysReturn(p);
  }, []);

  useEffect(() => {
    fetch("/api/store/payment-config")
      .then((r) => r.json())
      .then((c) =>
        setPayConfig({
          provider: typeof c.provider === "string" ? c.provider : "none",
          paymentsEnabled: !!c.paymentsEnabled,
          connectedAccount: typeof c.connectedAccount === "string" ? c.connectedAccount : null,
          feeBps: typeof c.feeBps === "number" ? c.feeBps : 0,
        })
      )
      .catch(() =>
        setPayConfig({ provider: "none", paymentsEnabled: false, connectedAccount: null, feeBps: 0 })
      );
  }, []);

  const currency = cart?.currency_code ?? "eur";
  const countryOptions = useMemo(
    () => cart?.region?.countries ?? [],
    [cart]
  );

  // Carga las opciones de envío disponibles para el carrito.
  useEffect(() => {
    if (!cart?.id) return;
    sdk.store.fulfillment
      .listCartOptions({ cart_id: cart.id })
      .then(({ shipping_options }) => {
        setShippingOptions(shipping_options ?? []);
        if (shipping_options?.[0]) setSelectedOption(shipping_options[0].id);
      })
      .catch(() => setShippingOptions([]));
  }, [cart?.id]);

  const handleChange = (key: keyof AddressForm, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Paso 1 → 2: guarda dirección + método de envío e inicia la sesión de pago de Stripe.
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart?.id || !selectedOption) return;
    // Gate: no iniciamos el pago si la tienda aún no tiene cobros configurados (Connect).
    if (payConfig && !payConfig.paymentsEnabled) {
      setError("Esta tienda todavía no acepta pagos online. Vuelve a intentarlo más tarde.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const address = {
        first_name: form.first_name,
        last_name: form.last_name,
        address_1: form.address_1,
        city: form.city,
        postal_code: form.postal_code,
        country_code: form.country_code,
        phone: form.phone,
      };

      await sdk.store.cart.update(cart.id, {
        email: form.email,
        shipping_address: address,
        billing_address: address,
      });

      await sdk.store.cart.addShippingMethod(cart.id, {
        option_id: selectedOption,
      });

      // ── REDSYS: redirección al TPV del banco ──
      if (payConfig?.provider === "redsys") {
        const origin = window.location.origin;
        const { payment_collection } =
          await sdk.store.payment.initiatePaymentSession(cart as HttpTypes.StoreCart, {
            provider_id: REDSYS_PROVIDER_ID,
            data: {
              sales_channel_id: (cart as { sales_channel_id?: string }).sales_channel_id,
              url_ok: `${origin}/checkout?redsys=ok`,
              url_ko: `${origin}/checkout?redsys=ko`,
              // Notificación servidor-servidor → hook de pago de Medusa (público).
              notify_url: `${MEDUSA_BACKEND_URL}/hooks/payment/${REDSYS_PROVIDER_ID}`,
            },
          });
        const rsSession = payment_collection?.payment_sessions?.find(
          (s) => s.provider_id === REDSYS_PROVIDER_ID
        );
        const rs = (rsSession?.data as { redsys?: RedsysForm } | undefined)?.redsys;
        if (!rs?.url || !rs.Ds_MerchantParameters || !rs.Ds_Signature) {
          throw new Error("No se pudo iniciar el pago con Redsys. Inténtalo de nuevo.");
        }
        setRedsysForm(rs); // auto-redirige al TPV
        return;
      }

      // ── STRIPE CONNECT: Payment Element ──
      // Destination charge: enrutamos el cobro a la cuenta del tenant y, si hay comisión
      // configurada, la calculamos en la unidad mínima (céntimos) sobre el total.
      const sessionData: Record<string, unknown> = {};
      if (payConfig?.connectedAccount) {
        sessionData.connected_account = payConfig.connectedAccount;
        const totalCents = Math.round((cart.total ?? 0) * 100);
        const fee = Math.round((totalCents * (payConfig.feeBps || 0)) / 10000);
        if (fee > 0) sessionData.application_fee_amount = fee;
      }

      // Inicia la sesión de pago con Stripe y obtiene el client_secret.
      const { payment_collection } =
        await sdk.store.payment.initiatePaymentSession(cart as HttpTypes.StoreCart, {
          provider_id: STRIPE_PROVIDER_ID,
          data: sessionData,
        });

      const session = payment_collection?.payment_sessions?.find(
        (s) => s.provider_id === STRIPE_PROVIDER_ID
      );
      const secret = (session?.data as { client_secret?: string } | undefined)
        ?.client_secret;

      if (!secret) {
        throw new Error(
          "No se pudo iniciar el pago. Revisa que Stripe esté configurado en la tienda."
        );
      }
      await refresh();
      setClientSecret(secret);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo continuar con el pago. Inténtalo de nuevo."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Tras confirmar el pago en Stripe, completa el carrito → pedido.
  const handlePaid = async () => {
    if (!cart?.id) return;
    try {
      const result = await sdk.store.cart.complete(cart.id);
      if (result.type === "order") {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("avialo_cart_id");
        }
        router.push(`/pedido/${result.order.id}`);
      } else {
        setError(result.error?.message ?? "No se pudo completar el pedido.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo completar el pedido."
      );
    }
  };

  // Redirección a Redsys: pantalla de transición mientras el navegador postea al TPV.
  if (redsysForm) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center w-full">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          Te estamos redirigiendo a la pasarela segura de tu banco…
        </p>
        <RedsysRedirect form={redsysForm} />
      </div>
    );
  }

  // Retorno desde Redsys: el pedido lo crea la notificación (webhook). Mostramos estado.
  if (redsysReturn === "ok") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center w-full">
        <h1 className="text-2xl font-extrabold text-foreground">Pago recibido</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Estamos confirmando tu pago con el banco. Recibirás tu pedido en unos instantes.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl text-sm"
        >
          Volver a la tienda
        </Link>
      </div>
    );
  }
  if (redsysReturn === "ko") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center w-full">
        <h1 className="text-2xl font-extrabold text-foreground">Pago no completado</h1>
        <p className="text-sm text-muted-foreground mt-2">
          El pago se canceló o fue rechazado. Puedes intentarlo de nuevo.
        </p>
        <Link
          href="/checkout"
          className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl text-sm"
        >
          Reintentar
        </Link>
      </div>
    );
  }

  if (!cart || (cart.items ?? []).length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center w-full">
        <h1 className="text-2xl font-extrabold text-foreground">
          No hay nada que pagar
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Tu carrito está vacío.
        </p>
        <Link
          href="/productos"
          className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl text-sm"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 w-full">
      <Link
        href="/carrito"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
      >
        <ArrowLeft size={15} /> Volver al carrito
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Formulario */}
        <div className="lg:col-span-2">
          {!clientSecret ? (
            <form onSubmit={handleContinue} className="flex flex-col gap-8">
              <section>
                <h2 className="text-lg font-extrabold text-foreground mb-4">
                  Datos de contacto y envío
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(v) => handleChange("email", v)}
                    className="sm:col-span-2"
                  />
                  <Input
                    label="Nombre"
                    required
                    value={form.first_name}
                    onChange={(v) => handleChange("first_name", v)}
                  />
                  <Input
                    label="Apellidos"
                    required
                    value={form.last_name}
                    onChange={(v) => handleChange("last_name", v)}
                  />
                  <Input
                    label="Dirección"
                    required
                    value={form.address_1}
                    onChange={(v) => handleChange("address_1", v)}
                    className="sm:col-span-2"
                  />
                  <Input
                    label="Código postal"
                    required
                    value={form.postal_code}
                    onChange={(v) => handleChange("postal_code", v)}
                  />
                  <Input
                    label="Ciudad"
                    required
                    value={form.city}
                    onChange={(v) => handleChange("city", v)}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      País
                    </label>
                    <select
                      value={form.country_code}
                      onChange={(e) =>
                        handleChange("country_code", e.target.value)
                      }
                      className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary"
                    >
                      {countryOptions.length > 0 ? (
                        countryOptions.map((c) => (
                          <option key={c.iso_2} value={c.iso_2}>
                            {c.display_name ?? c.iso_2}
                          </option>
                        ))
                      ) : (
                        <option value="es">España</option>
                      )}
                    </select>
                  </div>
                  <Input
                    label="Teléfono"
                    value={form.phone}
                    onChange={(v) => handleChange("phone", v)}
                  />
                </div>
              </section>

              <section>
                <h2 className="text-lg font-extrabold text-foreground mb-4">
                  Método de envío
                </h2>
                <div className="flex flex-col gap-3">
                  {shippingOptions.length > 0 ? (
                    shippingOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between gap-4 p-4 border rounded-xl cursor-pointer transition-all ${
                          selectedOption === opt.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="shipping"
                            checked={selectedOption === opt.id}
                            onChange={() => setSelectedOption(opt.id)}
                            className="accent-[hsl(var(--primary))]"
                          />
                          <span className="text-sm font-medium text-foreground">
                            {opt.name}
                          </span>
                        </span>
                        <span className="text-sm font-bold text-foreground">
                          {formatPrice(opt.amount ?? 0, currency)}
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Cargando opciones de envío...
                    </p>
                  )}
                </div>
              </section>

              {error && (
                <p className="text-sm text-rose-500 font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedOption}
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:bg-primary/90 transition-all text-sm disabled:opacity-60 w-full sm:w-auto"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Lock size={16} />
                )}
                Continuar al pago
              </button>
            </form>
          ) : (
            <section>
              <h2 className="text-lg font-extrabold text-foreground mb-4">
                Pago
              </h2>
              <StripePayment
                clientSecret={clientSecret}
                onPaid={handlePaid}
                onError={setError}
              />
              {error && (
                <p className="text-sm text-rose-500 font-medium mt-4">{error}</p>
              )}
            </section>
          )}
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 p-6 bg-card border border-border rounded-2xl">
            <h2 className="font-bold text-foreground mb-4">Tu pedido</h2>
            <ul className="flex flex-col gap-3 mb-4">
              {(cart.items ?? []).map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="text-muted-foreground truncate">
                    {item.quantity}× {item.product_title ?? item.title}
                  </span>
                  <span className="font-medium text-foreground whitespace-nowrap">
                    {formatPrice(item.total ?? 0, currency)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 text-sm pt-4 border-t border-border">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd>{formatPrice(cart.item_subtotal ?? 0, currency)}</dd>
              </div>
              {(cart.discount_total ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <dt>Descuento</dt>
                  <dd>- {formatPrice(cart.discount_total ?? 0, currency)}</dd>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <dt>Envío</dt>
                <dd>{formatPrice(cart.shipping_total ?? 0, currency)}</dd>
              </div>
              <div className="flex justify-between pt-2 border-t border-border text-base font-black text-foreground">
                <dt>Total</dt>
                <dd>{formatPrice(cart.total ?? 0, currency)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-border rounded-xl px-3 py-2.5 text-sm bg-background outline-none focus:border-primary"
      />
    </div>
  );
}
