"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Loader2, Lock } from "lucide-react";

// Clave publicable de Stripe (pk_...). El pipeline la inyecta en build-time.
const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

const stripePromise = STRIPE_PUBLISHABLE_KEY
  ? loadStripe(STRIPE_PUBLISHABLE_KEY)
  : null;

interface Props {
  clientSecret: string;
  onPaid: () => Promise<void>;
  onError: (message: string) => void;
}

export function StripePayment({ clientSecret, onPaid, onError }: Props) {
  if (!stripePromise) {
    return (
      <p className="text-sm text-rose-500 font-medium">
        La pasarela de pago no está configurada (falta la clave de Stripe).
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <PaymentForm onPaid={onPaid} onError={onError} />
    </Elements>
  );
}

function PaymentForm({
  onPaid,
  onError,
}: {
  onPaid: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);

    // Confirmamos el pago sin redirección cuando es posible (tarjeta); gestionamos el
    // resultado en la app. return_url es obligatorio para métodos que sí redirigen.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url:
          typeof window !== "undefined"
            ? `${window.location.origin}/checkout`
            : undefined,
      },
      redirect: "if_required",
    });

    if (error) {
      onError(error.message ?? "El pago no se pudo procesar.");
      setProcessing(false);
      return;
    }

    if (
      paymentIntent &&
      (paymentIntent.status === "succeeded" ||
        paymentIntent.status === "requires_capture" ||
        paymentIntent.status === "processing")
    ) {
      await onPaid();
    } else {
      onError("El pago no se completó. Inténtalo de nuevo.");
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-6 py-3.5 rounded-xl shadow-lg hover:bg-primary/90 transition-all text-sm disabled:opacity-60"
      >
        {processing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Lock size={16} />
        )}
        Pagar ahora
      </button>
    </form>
  );
}
