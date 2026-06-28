# LANDING REDESIGN — AVIALO BUILDER

## BRIEF
- Product: Avialo Builder — AI platform that auto-generates full-stack websites for Spanish SMEs
- Audience: Spanish SME owners (40-55yo), not developers. Trust > flash.
- Current problem: landing looks AI-generated, generic SaaS template
- Domain: avialo.app | Stack: Next.js 14, Tailwind, App Router

## REFERENCES (study these aesthetics)
- tasteskill.dev → organic textures (stone bg, real plants), asymmetric hero, serif headlines, floating mockup cascade
- stripe.com → gradient mesh background (animated SVG, not linear-gradient), typography-as-hero, social proof logo bar
- resend.com → premium minimalism, serif display font, 3D hero element, radical simplicity
- traefik.io → real product screenshot in hero, subtle grid/particle background, version badge

## DESIGN DIRECTION
Warm professional. NOT dark theme. NOT purple/blue SaaS.
- Palette: warm neutrals (stone, sand, cream) + one bold accent (terracotta OR deep teal)
- Typography: serif display for h1/h2 (Fraunces, Newsreader, or Lora) + clean sans body (DM Sans, Outfit, or Satoshi). NEVER Inter, Geist, Space Grotesk
- Background: subtle texture layer — SVG noise grain at 0.03 opacity OR soft photographic texture (marble/stone/paper) like tasteskill.dev
- Layout: asymmetric hero — text left-aligned, product mockups/screenshots floating right in staggered cascade
- Motion: GSAP or Framer Motion — staggered hero reveal (80ms delays), scroll-triggered section entrances, NO generic fade-in

## SECTIONS (in order)
1. HERO: serif h1 left-aligned + subtitle + 1 primary CTA + 1 ghost CTA. Right side: 2-3 real screenshots of the builder stacked/overlapping at angles (use placeholder images I'll replace later). Background: subtle texture.
2. SOCIAL PROOF: horizontal scrolling logo bar OR "Trusted by X businesses" counter. Even if no real logos yet, build the component ready to fill.
3. HOW IT WORKS: 3 steps, NOT 3 identical cards. Use numbered large typography (01, 02, 03) with alternating left/right layout (zig-zag). Each step has a small illustration or screenshot.
4. FEATURES: bento grid layout (like Apple/Linear) — mixed card sizes, some with screenshots inside, some with icon + text. NOT equal-size feature cards.
5. TESTIMONIAL: single large quote with photo + name + company. If no real testimonial, leave placeholder structure.
6. CTA FINAL: full-width section with accent background color, serif headline, single button.
7. FOOTER: minimal — logo, 3-4 links, copyright, legal links.

## EXECUTION RULES
- Work section by section. Complete hero first, show me, wait for OK.
- Each section = separate commit with clear message.
- All text in Spanish. Copy must be specific to Spanish SMEs, mention Spain/PYMEs.
- Responsive: mobile-first, test at 375px and 1440px.
- Images: use Next.js Image component. For now use placeholder URLs (/placeholder-1.webp etc), I'll replace with real screenshots.
- Add a grain/noise SVG overlay component reusable across sections.
- NO shadcn default components unless heavily customized.
- NO generic Lucide icons as decoration. If icons needed, use a consistent custom set or SVG illustrations.