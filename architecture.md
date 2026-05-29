# Arquitectura — Avialo Builder

## Qué es
Plataforma SaaS donde una pyme rellena un formulario y un agente IA genera una app web full-stack completa (frontend + backend + DB + auth + paneles). Se despliega en `proyecto-cliente.avialo.app` para previsualización y luego en producción con dominio propio.

No son páginas estáticas. Son aplicaciones con lógica de negocio real: reservas, paneles privados, admin, pagos.

---

## Flujo completo

```
[Cliente rellena formulario]
        ↓
[Panel Next.js] → POST /api/jobs → [Orquestador Express]
        ↓
[BullMQ encola job]
        ↓
[Worker:]
  1. Clona boilerplate → /sandbox/{jobId}/
  2. Construye prompt con parámetros del cliente
  3. Agente IA escribe archivos en sandbox
  4. npm install + npm run build
  5. Si error → reenvía error + archivos tocados → agente corrige
  6. Loop máx 5 iteraciones
  7. Build limpio → Docker container + Traefik subdominio
  8. Cliente ve preview en proyecto-{slug}.avialo.app
        ↓
[Aprobación → Stripe → deploy producción → dominio real]
```

---

## Estructura del monorepo

```
avialo-builder/
├── CLAUDE.md
├── apps/
│   ├── orchestrator/        Express + BullMQ
│   ├── panel/               Dashboard cliente (Next.js)
│   └── landing/             avialo.es/builder (Next.js)
├── boilerplates/
│   ├── corporate/           Next.js + Prisma + NextAuth
│   └── ecommerce/           Medusa + Next.js + Redis
├── packages/
│   ├── db/                  Prisma schema compartido
│   ├── types/               TypeScript types compartidos
│   └── agent-context/       System prompts del agente
├── infra/
│   ├── docker-compose.yml   Traefik + Redis + PostgreSQL
│   ├── traefik/
│   └── scripts/             Setup Hetzner + deploy
└── docs/
    └── architecture.md      ← este archivo
```

---

## Boilerplate corporativo — módulos requeridos

- Next.js 14 App Router + Tailwind (colores via CSS variables)
- Prisma schema: User, Session, Appointment, BusinessConfig, Invoice
- NextAuth.js v5 con roles: `admin` | `client`
- Panel cliente `/dashboard`: citas, documentos, pagos
- Panel admin `/admin`: gestión clientes, servicios, facturación
- Sistema de reservas genérico (configurable por tipo de negocio)
- SEO: metadatos dinámicos + sitemap.xml + robots.txt + structured data
- Nodemailer para emails transaccionales
- Responsive mobile-first

## Boilerplate ecommerce — módulos requeridos

- Medusa.js v2 backend completo
- Next.js storefront conectado a Medusa API
- Redis para cache de productos
- Stripe integrado via plugin Medusa
- SEO optimizado por producto y categoría

---

## Orquestador — endpoints y jobs

**REST API:**
- `POST /api/jobs` — crea job de generación
- `GET /api/jobs/:id` — estado del job
- `GET /api/jobs/:id/logs` — stream SSE de logs

**Job states:** `pending → generating → building → preview → deployed → failed`

**Multi-tenancy:** cada cliente tiene schema PostgreSQL propio: `tenant_{clientId}`

**Docker:** cada proyecto = contenedor aislado vía dockerode. Si un contenedor falla, los demás siguen.

---

## Agente IA — reglas estrictas

1. Trabaja solo en `/sandbox/{jobId}/` — nunca en boilerplate original
2. Herramientas disponibles: `write_file`, `read_file`, `list_directory`, `run_command` (solo en sandbox)
3. En error de build: recibe únicamente el error + archivos que tocó en el último prompt. No reescribe todo.
4. Máximo 5 iteraciones. Si falla → job marcado `failed` → notificación al cliente.
5. Sin acceso a internet durante generación. Todo el contexto va en el system prompt.
6. Modelos: Claude para generación de código, Gemini para contexto largo (docs Medusa).

---

## Infraestructura

**Servidor:** Hetzner CPX32 (8GB RAM / 4 cores / ~15€ mes)
**Swap:** 4GB configurado en Linux (RAM de emergencia para builds pesados)
**Traefik:** wildcard `*.avialo.app` + HTTPS automático via Let's Encrypt
**Dominios producción:** Cloudflare API o Namecheap API (compra automática al hacer deploy)

---

## Variables de entorno

```env
# Base de datos
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://localhost:6379

# Docker
DOCKER_SOCKET=/var/run/docker.sock

# LLM
LITELLM_URL=http://localhost:4000
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=

# Traefik
TRAEFIK_API_URL=http://localhost:8080
AVIALO_BASE_DOMAIN=avialo.app

# Auth panel
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Dominios
DOMAIN_REGISTRAR=cloudflare
DOMAIN_REGISTRAR_API_KEY=
```

---

## Modelo de negocio

| Plan | Setup fee | Mensual | Cambios incluidos |
|------|-----------|---------|-------------------|
| Starter | 149€ | 29€ | 10 |
| Pro | 249€ | 59€ | 30 |
| Business | 449€ | 119€ | ilimitados |

**Margen objetivo:** >90% por cliente recurrente (coste real = infra Hetzner + tokens IA)

**Mercado:** pymes españolas — clínicas, despachos, restaurantes, comercios, academias

**Diferenciador frente a Wix/Squarespace:** backend real, base de datos, paneles privados, SEO técnico de producción, soporte en castellano, facturación española con IVA.
