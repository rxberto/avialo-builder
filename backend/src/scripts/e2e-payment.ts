// E2E de PAGO con Stripe (headless, GATED a claves de TEST).
//
// Simula una compra completa contra el Medusa COMPARTIDO sin navegador:
//   carrito → dirección + envío → sesión de pago Stripe → confirmación del
//   PaymentIntent con una tarjeta de TEST (`pm_card_visa`) → completar → pedido.
//
// ⚠️ SEGURIDAD: este script ABORTA si las claves de Stripe no son de TEST
// (`sk_test_`/`rk_test_` + `pk_test_`). NUNCA debe ejecutarse con las claves LIVE
// del `.env` raíz. Para que funcione, el backend Medusa compartido debe estar
// arrancado con la MISMA clave secreta de TEST (módulo Stripe activo), porque el
// PaymentIntent lo crea Medusa y aquí lo confirmamos con esa misma cuenta.
//
// Uso:
//   STRIPE_TEST_SECRET_KEY=sk_test_... \
//   STRIPE_TEST_PUBLISHABLE_KEY=pk_test_... \
//   MEDUSA_BACKEND_URL=http://localhost:9010 \
//   MEDUSA_ADMIN_EMAIL=... MEDUSA_ADMIN_PASSWORD=... \
//   [E2E_SALES_CHANNEL_ID=sc_...] \
//   npm run e2e:payment
import "../config/env.js";
import Stripe from "stripe";

const MEDUSA = (process.env.MEDUSA_BACKEND_URL || "http://localhost:9010").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL || "";
const ADMIN_PASS = process.env.MEDUSA_ADMIN_PASSWORD || "";
const SALES_CHANNEL_ID =
  process.env.E2E_SALES_CHANNEL_ID || "sc_01KVY9M1XB2YJMCM8SXKZ6TPST";
const STRIPE_PROVIDER_ID = "pp_stripe_stripe";
const TEST_PM = process.env.E2E_TEST_PAYMENT_METHOD || "pm_card_visa";

// Claves de TEST dedicadas (preferidas). Nunca caemos a las LIVE del .env raíz a
// menos que el operador las haya puesto explícitamente como TEST en estas vars.
const STRIPE_SECRET =
  process.env.STRIPE_TEST_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "";
const STRIPE_PUBLISHABLE =
  process.env.STRIPE_TEST_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.STRIPE_PUBLISHABLE_KEY ||
  "";

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

/** Barrera de seguridad: solo se permite ejecutar con claves de TEST. */
function assertTestKeys(): void {
  if (!STRIPE_SECRET || !STRIPE_PUBLISHABLE) {
    fail(
      "Faltan claves Stripe de TEST. Define STRIPE_TEST_SECRET_KEY (sk_test_/rk_test_) " +
        "y STRIPE_TEST_PUBLISHABLE_KEY (pk_test_)."
    );
  }
  const secretIsTest = /^(sk|rk)_test_/.test(STRIPE_SECRET);
  const pubIsTest = /^pk_test_/.test(STRIPE_PUBLISHABLE);
  if (!secretIsTest || !pubIsTest) {
    fail(
      "ABORTADO: las claves de Stripe NO son de TEST. Este E2E jamás debe correr con " +
        "claves LIVE (rk_live/pk_live). Usa claves de prueba de tu panel de Stripe."
    );
  }
}

interface Json {
  [k: string]: unknown;
}

async function adminLogin(): Promise<string> {
  if (!ADMIN_EMAIL || !ADMIN_PASS) {
    fail("Faltan MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD.");
  }
  const r = await fetch(`${MEDUSA}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!r.ok) fail(`Login admin falló (${r.status}).`);
  const { token } = (await r.json()) as { token?: string };
  if (!token) fail("Login admin sin token.");
  return token;
}

/** Localiza la publishable key ligada al Sales Channel del tenant. */
async function findPublishableKey(adminToken: string): Promise<string> {
  const r = await fetch(
    `${MEDUSA}/admin/api-keys?type=publishable&limit=50&fields=id,token,*sales_channels`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  const { api_keys } = (await r.json()) as {
    api_keys?: { token: string; sales_channels?: { id: string }[] }[];
  };
  const key = (api_keys || []).find((k) =>
    (k.sales_channels || []).some((s) => s.id === SALES_CHANNEL_ID)
  );
  if (!key?.token) fail(`No hay publishable key para el canal ${SALES_CHANNEL_ID}.`);
  return key.token;
}

/** Asegura que el provider de Stripe está habilitado en la región (idempotente). */
async function ensureStripeOnRegion(adminToken: string, regionId: string): Promise<void> {
  const r = await fetch(
    `${MEDUSA}/admin/regions/${regionId}?fields=id,*payment_providers`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  const { region } = (await r.json()) as {
    region?: { payment_providers?: { id: string }[] };
  };
  const providers = (region?.payment_providers || []).map((p) => p.id);
  if (providers.includes(STRIPE_PROVIDER_ID)) {
    console.log("   ✓ Stripe ya habilitado en la región.");
    return;
  }
  const up = await fetch(`${MEDUSA}/admin/regions/${regionId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ payment_providers: [...providers, STRIPE_PROVIDER_ID] }),
  });
  if (!up.ok) {
    const t = await up.text().catch(() => "");
    fail(
      `No se pudo habilitar Stripe en la región (${up.status}). ¿Está el módulo Stripe ` +
        `cargado en medusa-config con la clave de TEST? Detalle: ${t.slice(0, 300)}`
    );
  }
  console.log("   ✓ Stripe habilitado en la región.");
}

function storeFetch(pk: string) {
  return async (path: string, init: { method?: string; body?: Json } = {}): Promise<Json> => {
    const r = await fetch(`${MEDUSA}${path}`, {
      method: init.method || "GET",
      headers: {
        "x-publishable-api-key": pk,
        "Content-Type": "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    const data = (await r.json().catch(() => ({}))) as Json;
    if (!r.ok) {
      fail(`Store API ${init.method || "GET"} ${path} → ${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return data;
  };
}

async function main(): Promise<void> {
  console.log("== E2E de PAGO Stripe (TEST) ==");
  assertTestKeys();
  console.log("   ✓ Claves de TEST verificadas (no LIVE).");

  const stripe = new Stripe(STRIPE_SECRET);
  const adminToken = await adminLogin();
  const pk = await findPublishableKey(adminToken);
  const api = storeFetch(pk);

  // 1) Región + variante del canal
  const { regions } = (await api("/store/regions")) as {
    regions: { id: string; currency_code: string }[];
  };
  const region = regions?.[0];
  if (!region) fail("La tienda no tiene región.");
  await ensureStripeOnRegion(adminToken, region.id);

  const prods = (await api("/store/products?limit=1&fields=id,title,*variants")) as {
    products: { title: string; variants: { id: string }[] }[];
  };
  const variant = prods.products?.[0]?.variants?.[0];
  if (!variant) fail("La tienda no tiene productos con variante.");
  console.log(`   ✓ Producto de prueba: ${prods.products[0].title}`);

  // 2) Carrito + línea + dirección + envío
  let { cart } = (await api("/store/carts", {
    method: "POST",
    body: { region_id: region.id },
  })) as { cart: { id: string } };
  const cartId = cart.id;
  await api(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    body: { variant_id: variant.id, quantity: 1 },
  });
  const address = {
    first_name: "Test",
    last_name: "Comprador",
    address_1: "Calle Mayor 1",
    city: "Logroño",
    postal_code: "26001",
    country_code: "es",
    phone: "+34600000000",
  };
  await api(`/store/carts/${cartId}`, {
    method: "POST",
    body: { email: "comprador-e2e@aurora.test", shipping_address: address, billing_address: address },
  });
  const { shipping_options } = (await api(
    `/store/shipping-options?cart_id=${cartId}`
  )) as { shipping_options: { id: string; name: string }[] };
  if (!shipping_options?.[0]) fail("No hay opciones de envío para el carrito.");
  await api(`/store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    body: { option_id: shipping_options[0].id },
  });
  console.log(`   ✓ Carrito ${cartId} con envío "${shipping_options[0].name}".`);

  // 3) Colección + sesión de pago Stripe
  const { payment_collection } = (await api("/store/payment-collections", {
    method: "POST",
    body: { cart_id: cartId },
  })) as { payment_collection: { id: string } };
  const sessionRes = (await api(
    `/store/payment-collections/${payment_collection.id}/payment-sessions`,
    { method: "POST", body: { provider_id: STRIPE_PROVIDER_ID } }
  )) as { payment_collection: { payment_sessions?: { provider_id: string; data?: Json }[] } };
  const session = (sessionRes.payment_collection.payment_sessions || []).find(
    (s) => s.provider_id === STRIPE_PROVIDER_ID
  );
  const clientSecret = (session?.data as { client_secret?: string } | undefined)?.client_secret;
  if (!clientSecret) {
    fail(
      "No se obtuvo client_secret de Stripe. ¿El módulo Stripe está configurado en el " +
        "backend Medusa con la clave de TEST?"
    );
  }
  const intentId = clientSecret.split("_secret")[0];
  console.log(`   ✓ Sesión de pago Stripe iniciada (PaymentIntent ${intentId}).`);

  // 4) Confirmar el PaymentIntent con una tarjeta de TEST (sin navegador)
  const confirmed = await stripe.paymentIntents.confirm(intentId, {
    payment_method: TEST_PM,
    return_url: "https://example.com/return",
  });
  console.log(`   ✓ PaymentIntent confirmado → estado: ${confirmed.status}`);
  if (!["succeeded", "requires_capture"].includes(confirmed.status)) {
    fail(`El pago no quedó autorizado (estado ${confirmed.status}).`);
  }

  // 5) Completar el carrito → pedido
  const complete = (await api(`/store/carts/${cartId}/complete`, { method: "POST" })) as {
    type: string;
    order?: { id: string; display_id?: number; payment_status?: string; total?: number };
    error?: { message?: string };
  };
  if (complete.type !== "order" || !complete.order) {
    fail(`No se creó el pedido: ${complete.error?.message || JSON.stringify(complete).slice(0, 300)}`);
  }
  const o = complete.order;
  console.log("\n✅ E2E de pago COMPLETADO");
  console.log(`   Pedido: #${o.display_id ?? "?"} (${o.id})`);
  console.log(`   Estado de pago: ${o.payment_status ?? "?"} | Total: ${o.total ?? "?"}`);
  console.log("   El pedido debería aparecer en el panel del dueño (Pedidos).");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
