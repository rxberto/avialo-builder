// ============================================
// ROUTER DE MODELOS — AVIALO v2
// ============================================

export const MODELS = {
  CLAUDE:  'claude-sonnet-4-6',      // Generación compleja, código crítico
  GEMINI:  'gemini-2.5-flash',       // Ediciones, chat, tareas rápidas
  GPT:     'gpt-4o-mini',            // Copywriting, textos, traducciones
};

// ── Por qué cada modelo para cada tarea:
//
// CLAUDE  → Código HTML/CSS/JS complejo, estructuras multi-página,
//           e-commerce, decisiones arquitectónicas, legal crítico.
//           Caro pero imprescindible cuando el output va directo al cliente.
//
// GEMINI  → Ediciones simples, SEO tags, chat soporte, análisis de webs
//           existentes (su contexto de 1M tokens es ideal para pasar
//           el HTML completo y pedir cambios puntuales).
//
// GPT     → Copywriting, slogans, descripciones de producto, emails,
//           traducciones, FAQs, textos persuasivos. Tono más comercial.

const TASK_CONFIG = {

  // ─────────────────────────────────────────
  // GENERACIÓN INICIAL
  // ─────────────────────────────────────────

  generate_web_corporativa: {
    model: 'claude',
    reason: 'Web corporativa completa — HTML/CSS/JS de calidad profesional',
    estimatedCost: 90,
    priority: 'high',
  },
  generate_web_dinamica: {
    model: 'claude',
    reason: 'Web dinámica con React — arquitectura de componentes compleja',
    estimatedCost: 120,
    priority: 'high',
  },
  generate_ecommerce: {
    model: 'claude',
    reason: 'E-commerce con Medusa — storefront Next.js completo',
    estimatedCost: 180,
    priority: 'high',
  },
  generate_landing: {
    model: 'claude',
    reason: 'Landing page — estructura y CTA críticos para conversión',
    estimatedCost: 60,
    priority: 'high',
  },

  // ─────────────────────────────────────────
  // EDICIÓN Y MODIFICACIONES
  // ─────────────────────────────────────────

  edit_text: {
    model: 'gemini',
    reason: 'Cambio de texto — tarea mínima, Gemini más que suficiente',
    estimatedCost: 1,
    priority: 'low',
  },
  edit_colors: {
    model: 'gemini',
    reason: 'Cambio de colores — buscar y reemplazar variables CSS, tarea simple',
    estimatedCost: 1,
    priority: 'low',
  },
  edit_layout: {
    model: 'gemini',
    reason: 'Cambio de layout — reordenar secciones con contexto completo HTML',
    estimatedCost: 4,
    priority: 'medium',
  },
  edit_fonts: {
    model: 'gemini',
    reason: 'Cambio de tipografía — actualizar font-family en CSS',
    estimatedCost: 1,
    priority: 'low',
  },
  edit_images: {
    model: 'gemini',
    reason: 'Actualizar imágenes y alt text — tarea estructurada y simple',
    estimatedCost: 1,
    priority: 'low',
  },
  edit_contact_info: {
    model: 'gemini',
    reason: 'Actualizar teléfono, email, dirección — buscar y reemplazar',
    estimatedCost: 1,
    priority: 'low',
  },
  edit_navigation: {
    model: 'gemini',
    reason: 'Modificar menú de navegación — cambios en HTML estructurado',
    estimatedCost: 2,
    priority: 'low',
  },

  // ─────────────────────────────────────────
  // REGENERACIÓN DE SECCIONES
  // ─────────────────────────────────────────

  regenerate_hero: {
    model: 'claude',
    reason: 'Hero section — la sección más crítica de la web, impacto en conversión',
    estimatedCost: 25,
    priority: 'high',
  },
  regenerate_section: {
    model: 'claude',
    reason: 'Sección compleja — requiere coherencia con el diseño existente',
    estimatedCost: 30,
    priority: 'high',
  },
  regenerate_footer: {
    model: 'gemini',
    reason: 'Footer — estructura repetitiva y predecible, Gemini suficiente',
    estimatedCost: 5,
    priority: 'medium',
  },
  add_section: {
    model: 'claude',
    reason: 'Nueva sección — tiene que encajar con el diseño existente',
    estimatedCost: 35,
    priority: 'high',
  },
  add_page: {
    model: 'claude',
    reason: 'Nueva página completa — misma calidad que la generación inicial',
    estimatedCost: 50,
    priority: 'high',
  },

  // ─────────────────────────────────────────
  // SEO
  // ─────────────────────────────────────────

  optimize_seo_meta: {
    model: 'gemini',
    reason: 'Meta tags SEO — tarea estructurada, output predecible',
    estimatedCost: 2,
    priority: 'medium',
  },
  optimize_seo_content: {
    model: 'gpt',
    reason: 'Contenido SEO — GPT mejor en textos naturales optimizados para keywords',
    estimatedCost: 6,
    priority: 'medium',
  },
  generate_schema_markup: {
    model: 'gemini',
    reason: 'Schema JSON-LD — formato estructurado, Gemini muy preciso',
    estimatedCost: 3,
    priority: 'medium',
  },
  generate_sitemap: {
    model: 'gemini',
    reason: 'Sitemap XML — formato rígido y predecible',
    estimatedCost: 1,
    priority: 'low',
  },
  generate_robots_txt: {
    model: 'gemini',
    reason: 'robots.txt — archivo simple y estándar',
    estimatedCost: 1,
    priority: 'low',
  },

  // ─────────────────────────────────────────
  // COPYWRITING Y CONTENIDO
  // ─────────────────────────────────────────

  generate_copy_hero: {
    model: 'gpt',
    reason: 'Copy del hero — GPT más persuasivo y comercial en titulares',
    estimatedCost: 4,
    priority: 'medium',
  },
  generate_copy_about: {
    model: 'gpt',
    reason: 'Texto "sobre nosotros" — narrativa de empresa, GPT más natural',
    estimatedCost: 5,
    priority: 'medium',
  },
  generate_copy_services: {
    model: 'gpt',
    reason: 'Descripciones de servicios — copywriting orientado a conversión',
    estimatedCost: 5,
    priority: 'medium',
  },
  generate_product_description: {
    model: 'gpt',
    reason: 'Descripciones de producto — tono comercial, GPT superior en e-commerce',
    estimatedCost: 3,
    priority: 'medium',
  },
  generate_faq: {
    model: 'gpt',
    reason: 'FAQs — preguntas y respuestas naturales, GPT más conversacional',
    estimatedCost: 4,
    priority: 'medium',
  },
  generate_blog_post: {
    model: 'gpt',
    reason: 'Post de blog — contenido largo y natural, GPT más fluido',
    estimatedCost: 8,
    priority: 'medium',
  },
  generate_slogan: {
    model: 'gpt',
    reason: 'Slogan — creatividad lingüística, GPT mejor en frases cortas impactantes',
    estimatedCost: 2,
    priority: 'medium',
  },

  // ─────────────────────────────────────────
  // LEGAL Y COMPLIANCE (España)
  // ─────────────────────────────────────────

  generate_privacy_policy: {
    model: 'claude',
    reason: 'Política de privacidad RGPD — precisión legal crítica, Claude más riguroso',
    estimatedCost: 40,
    priority: 'high',
  },
  generate_cookies_policy: {
    model: 'claude',
    reason: 'Aviso de cookies AEPD — normativa española específica',
    estimatedCost: 30,
    priority: 'high',
  },
  generate_legal_notice: {
    model: 'claude',
    reason: 'Aviso legal — incluye CIF, datos mercantiles, obligatorio en España',
    estimatedCost: 25,
    priority: 'high',
  },
  generate_terms: {
    model: 'claude',
    reason: 'Términos y condiciones — documento legal complejo',
    estimatedCost: 40,
    priority: 'high',
  },

  // ─────────────────────────────────────────
  // EMAIL Y COMUNICACIÓN
  // ─────────────────────────────────────────

  generate_email_template: {
    model: 'gpt',
    reason: 'Plantilla de email — HTML de email + copywriting, GPT equilibrado',
    estimatedCost: 6,
    priority: 'medium',
  },
  generate_welcome_email: {
    model: 'gpt',
    reason: 'Email de bienvenida — tono cálido y comercial, GPT más natural',
    estimatedCost: 4,
    priority: 'medium',
  },
  generate_contact_form: {
    model: 'gemini',
    reason: 'Formulario de contacto — HTML estructurado y predecible',
    estimatedCost: 3,
    priority: 'low',
  },

  // ─────────────────────────────────────────
  // TRADUCCIÓN E INTERNACIONALIZACIÓN
  // ─────────────────────────────────────────

  translate_content: {
    model: 'gpt',
    reason: 'Traducción — GPT líder absoluto en calidad de traducción',
    estimatedCost: 5,
    priority: 'medium',
  },
  translate_to_catalan: {
    model: 'gpt',
    reason: 'Traducción al catalán — GPT mejor en lenguas cooficiales españolas',
    estimatedCost: 5,
    priority: 'medium',
  },

  // ─────────────────────────────────────────
  // ANÁLISIS Y DIAGNÓSTICO
  // ─────────────────────────────────────────

  analyze_seo: {
    model: 'gemini',
    reason: 'Análisis SEO — leer HTML completo, contexto largo, Gemini ideal',
    estimatedCost: 5,
    priority: 'medium',
  },
  analyze_performance: {
    model: 'gemini',
    reason: 'Análisis de rendimiento — revisar código y detectar problemas',
    estimatedCost: 5,
    priority: 'medium',
  },
  analyze_accessibility: {
    model: 'gemini',
    reason: 'Accesibilidad WCAG — revisar HTML completo, contexto largo',
    estimatedCost: 5,
    priority: 'medium',
  },
  debug_code: {
    model: 'claude',
    reason: 'Debug de código — Claude superior en razonamiento sobre errores complejos',
    estimatedCost: 20,
    priority: 'high',
  },

  // ─────────────────────────────────────────
  // CHAT Y SOPORTE
  // ─────────────────────────────────────────

  chat_support: {
    model: 'gemini',
    reason: 'Chat soporte — respuestas rápidas y baratas, miles de mensajes al mes',
    estimatedCost: 1,
    priority: 'low',
  },
  chat_web_assistant: {
    model: 'gemini',
    reason: 'Asistente de edición — preguntas sobre la web actual, contexto largo',
    estimatedCost: 1,
    priority: 'low',
  },
};

/**
 * Decide qué modelo usar para una tarea dada
 * @param {string} taskType
 * @returns {{ model, modelId, reason, estimatedCost, priority }}
 */
export async function routeModel(taskType, taskDescription = null) {
  const task = TASK_CONFIG[taskType];

  if (!task) {
    const description = taskDescription || taskType;
    return await routeUnknownTask(description);
  }

  const modelId = MODELS[task.model.toUpperCase()];

  console.log(`🔀 ${taskType}`);
  console.log(`   → ${task.model.toUpperCase()} (${modelId})`);
  console.log(`   → ${task.reason}`);
  console.log(`   → Coste: ~${(task.estimatedCost / 100).toFixed(2)}€ | Prioridad: ${task.priority}\n`);

  return { model: task.model, modelId, reason: task.reason, estimatedCost: task.estimatedCost, priority: task.priority };
}

// ─────────────────────────────────────────
// CLASIFICADOR DE TAREAS DESCONOCIDAS
// Gemini Flash analiza la tarea y decide complejidad
// ─────────────────────────────────────────

/**
 * Clasifica una tarea desconocida usando Gemini Flash
 * Devuelve: 'simple' | 'medium' | 'complex'
 * Coste: ~0.01€ — prácticamente gratis
 */
export async function classifyUnknownTask(taskDescription) {
  // Por ahora devuelve lógica local sin llamada API
  // Cuando añadas créditos Gemini, activamos la llamada real
  const keywords = taskDescription.toLowerCase();

  // Palabras que indican complejidad alta → Claude
  const complexKeywords = [
    'legal', 'rgpd', 'privacy', 'terms', 'ecommerce', 'tienda',
    'arquitectura', 'complejo', 'integrar', 'backend', 'base de datos',
    'medusa', 'stripe', 'pago', 'checkout', 'autenticacion'
  ];

  // Palabras que indican tarea media → GPT
  const mediumKeywords = [
    'texto', 'copy', 'blog', 'describir', 'redactar', 'slogan',
    'traducir', 'email', 'contenido', 'faq', 'about'
  ];

  const isComplex = complexKeywords.some(k => keywords.includes(k));
  const isMedium  = mediumKeywords.some(k => keywords.includes(k));

  if (isComplex) return 'complex';
  if (isMedium)  return 'medium';
  return 'simple';
}

/**
 * Router para tareas desconocidas — dos capas
 * 1. Clasificador (Gemini) analiza la descripción
 * 2. Según complejidad, asigna modelo correcto
 */
export async function routeUnknownTask(taskDescription) {
  console.log(`🔍 Tarea desconocida detectada: "${taskDescription}"`);
  console.log(`   → Clasificando con Gemini Flash...`);

  const complexity = await classifyUnknownTask(taskDescription);

  const routing = {
    simple: {
      model: 'gemini',
      modelId: MODELS.GEMINI,
      reason: 'Clasificada como simple — Gemini suficiente',
      estimatedCost: 3,
      priority: 'low',
    },
    medium: {
      model: 'gpt',
      modelId: MODELS.GPT,
      reason: 'Clasificada como media — GPT equilibrio calidad/coste',
      estimatedCost: 6,
      priority: 'medium',
    },
    complex: {
      model: 'claude',
      modelId: MODELS.CLAUDE,
      reason: 'Clasificada como compleja — Claude para máxima calidad',
      estimatedCost: 90,
      priority: 'high',
    },
  };

  const result = routing[complexity];
  console.log(`   → Complejidad: ${complexity.toUpperCase()}`);
  console.log(`   → Modelo asignado: ${result.model.toUpperCase()} (${result.modelId})`);
  console.log(`   → Coste estimado: ~${(result.estimatedCost / 100).toFixed(2)}€\n`);

  return { ...result, complexity, taskDescription };
}
/**
 * Devuelve un resumen de todas las tareas agrupadas por modelo
 */
export function getRouterSummary() {
  const summary = { claude: [], gemini: [], gpt: [] };
  for (const [taskType, config] of Object.entries(TASK_CONFIG)) {
    summary[config.model].push({ taskType, estimatedCost: config.estimatedCost });
  }
  return summary;
}