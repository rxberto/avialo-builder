# Avialo Builder

SaaS que genera apps web full-stack para pymes españolas via agentes IA. Lee `docs/architecture.md` al iniciar cada fase nueva.

## Stack (no cambiar)
- **Boilerplate corporativo:** Next.js 14 + Tailwind + Prisma + PostgreSQL + NextAuth.js v5
- **Boilerplate ecommerce:** Medusa.js v2 + Next.js + Redis + Stripe
- **Orquestador:** Express + TypeScript + BullMQ + Redis + dockerode
- **Agente:** LiteLLM (Claude principal, Gemini fallback)
- **Infra:** Hetzner CPX32 + Docker + Traefik v3

## Reglas
- TypeScript estricto, sin `any`, sin secrets hardcodeados
- Código en inglés, comentarios en español
- Un módulo completo por sesión — confirmar antes de continuar
- Nunca tocar archivos fuera de `/sandbox/{jobId}/` desde el agente
- Sin Vercel, AWS ni plataformas cloud

## Fases
1. Boilerplates (corporativo → ecommerce)
2. Orquestador (Express + BullMQ + Docker API)
3. Agente IA + loop autocorrección (máx 5 intentos)
4. Panel cliente (Next.js + SSE + Stripe)
5. Infra (docker-compose + Traefik + scripts Hetzner)

## Al iniciar sesión
1. Revisa qué módulos están completos
2. Pregunta por qué fase continuar si no está claro
3. Construye — confirma — siguiente módulo
