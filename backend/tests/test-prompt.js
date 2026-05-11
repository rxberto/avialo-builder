import { isOutOfScope, SYSTEM_PROMPT } from '../src/prompts/system-base.js';

console.log('🧪 Probando filtro de scope v2...\n');

const casos = [
  // Claramente IN scope
  { msg: 'Cambia el color del header a azul', esperado: false },
  { msg: 'Añade una sección de servicios', esperado: false },
  { msg: 'Optimiza el SEO de mi web', esperado: false },
  { msg: 'Genera el aviso legal de mi empresa', esperado: false },
  { msg: 'Crea un formulario de contacto con RGPD', esperado: false },
  { msg: 'Quiero una tienda online con Medusa', esperado: false },
  { msg: 'Mejora el rendimiento y Core Web Vitals', esperado: false },

  // Claramente OUT scope
  { msg: '¿Quién es el presidente de España?', esperado: true },
  { msg: '¿Cómo cocino una paella?', esperado: true },
  { msg: 'Recomiéndame una película de Netflix', esperado: true },
  { msg: 'Ayúdame con mi declaración de la renta', esperado: true },
  { msg: 'Quiero invertir en Bitcoin', esperado: true },
  { msg: 'Crea un script en Python para analizar datos', esperado: true },
  { msg: 'Desarrolla una app móvil en Flutter', esperado: true },
  { msg: 'Explícame machine learning', esperado: true },
  { msg: 'Tengo síntomas de gripe, qué tomo', esperado: true },
  { msg: 'Cuántos habitantes tiene Madrid', esperado: true },
  { msg: 'Ayúdame con mi contrato laboral de trabajo', esperado: true },

  // Zona gris — deben pasar (la IA ya filtra con el system prompt)
  { msg: 'Hola', esperado: false },
  { msg: '¿Qué puedes hacer?', esperado: false },
  { msg: 'Necesito ayuda', esperado: false },
];

let ok = 0;
for (const caso of casos) {
  const resultado = isOutOfScope(caso.msg);
  const correcto = resultado === caso.esperado;
  const icon = correcto ? '✅' : '❌';
  const estado = resultado ? 'FUERA de scope' : 'DENTRO de scope';
  console.log(`${icon} "${caso.msg}"`);
  if (!correcto) console.log(`   → ${estado} (ERROR — esperado: ${caso.esperado ? 'FUERA' : 'DENTRO'})\n`);
  if (correcto) ok++;
}

console.log(`\n📊 Resultado: ${ok}/${casos.length} correctos`);
console.log(`✅ System prompt — ${SYSTEM_PROMPT.length} caracteres`);