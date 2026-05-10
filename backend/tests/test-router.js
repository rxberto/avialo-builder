import { routeModel, getRouterSummary } from '../src/models/router.js';

console.log('🧪 Probando router v3 con clasificador...\n');

// Tareas conocidas
const tareasConocidas = [
  'generate_web_corporativa',
  'edit_colors',
  'generate_copy_hero',
  'generate_privacy_policy',
  'chat_support',
];

console.log('═══ TAREAS CONOCIDAS ═══\n');
for (const tarea of tareasConocidas) {
  await routeModel(tarea);
}

// Tareas desconocidas — el clasificador decide
console.log('═══ TAREAS DESCONOCIDAS — CLASIFICADOR ═══\n');
const tareasDesconocidas = [
  'cambiar el logo',                          // simple → Gemini
  'redactar descripcion de mi restaurante',   // medio  → GPT
  'integrar pasarela de pago con stripe',     // complejo → Claude
  'añadir mapa de google maps',               // simple → Gemini
  'crear politica de privacidad rgpd',        // complejo → Claude
  'escribir slogan para mi empresa',          // medio → GPT
  'arreglar el menu que no se ve bien',       // simple → Gemini
];

for (const tarea of tareasDesconocidas) {
  await routeModel(null, tarea);
}

// Resumen
console.log('\n📊 RESUMEN POR MODELO:');
const summary = getRouterSummary();
for (const [modelo, tareas] of Object.entries(summary)) {
  console.log(`\n${modelo.toUpperCase()} — ${tareas.length} tipos de tarea conocida`);
}