# E2E de pago con Stripe (modo TEST)

Prueba de extremo a extremo del **cobro real** de la tienda Medusa, sin navegador:
carrito → dirección + envío → sesión de pago Stripe → confirmación con tarjeta de
prueba → pedido creado.

> ⚠️ **Solo con claves de TEST.** El script `npm run e2e:payment` **aborta** si
> detecta claves que no empiezan por `sk_test_`/`rk_test_` y `pk_test_`. Las claves
> del `.env` raíz son **LIVE** (`rk_live`/`pk_live`) → nunca se usan para esta prueba.

---

## Requisitos previos

1. **Claves de TEST de Stripe** (panel de Stripe → modo test):
   - `sk_test_...` (o `rk_test_...`) — clave secreta.
   - `pk_test_...` — clave publicable.

2. **El backend Medusa compartido debe arrancar con el módulo Stripe y la clave
   secreta de TEST.** El PaymentIntent lo crea Medusa; el script lo confirma con la
   *misma* cuenta, así que ambas partes deben usar la misma clave de test.

   En el contenedor de Medusa (`avialo-medusa-m0` en el lab) configura, p. ej.:
   ```
   MEDUSA_STRIPE_API_KEY=sk_test_...      # la infra la mapea al módulo @medusajs/payment-stripe
   ```
   y reinícialo. (En `medusa-config` el módulo de pago Stripe debe estar registrado;
   el script verifica que el provider `pp_stripe_stripe` se puede habilitar en la
   región y, si no, te avisa con un mensaje claro.)

3. **La storefront** necesita `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` para
   el Payment Element del navegador (el pipeline ya inyecta esta var; en pruebas
   locales ponla en `.env.local`).

---

## Ejecutar

Desde `backend/`:

```bash
STRIPE_TEST_SECRET_KEY=sk_test_xxx \
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_xxx \
MEDUSA_BACKEND_URL=http://localhost:9010 \
MEDUSA_ADMIN_EMAIL=e2e-admin@avialo.app \
MEDUSA_ADMIN_PASSWORD=E2eAdmin2026 \
npm run e2e:payment
```

Variables opcionales:
- `E2E_SALES_CHANNEL_ID` — canal del tenant a probar (por defecto el del lab e2e).
- `E2E_TEST_PAYMENT_METHOD` — método de pago de prueba (por defecto `pm_card_visa`).

> Si el `.env` raíz tiene claves LIVE, **no** las pongas en `STRIPE_TEST_*`. El
> script usa primero `STRIPE_TEST_SECRET_KEY`/`STRIPE_TEST_PUBLISHABLE_KEY`; solo
> cae a `STRIPE_SECRET_KEY`/`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` si son de test.

## Qué hace el script (`src/scripts/e2e-payment.ts`)

1. **Gate de seguridad**: aborta si las claves no son de TEST.
2. Login admin → localiza la *publishable key* del Sales Channel.
3. Habilita `pp_stripe_stripe` en la región (idempotente).
4. Store API: crea carrito, añade producto, fija email + dirección + envío.
5. Inicia la sesión de pago Stripe y obtiene el `client_secret`.
6. Confirma el PaymentIntent con `pm_card_visa` (sin navegador).
7. Completa el carrito → **crea el pedido** y muestra su id + estado de pago.

El pedido aparece luego en el panel del dueño (**Pedidos**), donde se puede
capturar / preparar / enviar con el flujo del Módulo 10.

## Tarjetas de prueba útiles (Stripe test mode)

- `pm_card_visa` — pago correcto.
- `pm_card_chargeDeclined` — pago rechazado (para probar el camino de error).
- 3D Secure: `pm_card_authenticationRequired`.

## Estado actual (lab)

- El checkout de la storefront ya está cableado (Payment Element + `cart.complete`).
- El backend de prueba usa `pp_system_default` (sin Stripe). Para el E2E hay que
  arrancar Medusa con la clave de TEST como arriba.
- Validado: el gate aborta con claves LIVE; con claves de formato test el flujo
  avanza hasta habilitar el provider y guía si el módulo Stripe no está cargado.
