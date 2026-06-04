// Servicio de comunicación con el orquestador backend
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Ayudante para obtener las cabeceras comunes con token JWT si existe
function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const userStr = localStorage.getItem('avialo_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
    } catch { /* token ausente o corrupto: continuar sin autenticación */ }
  }
  return headers;
}

/**
 * Encola un nuevo trabajo de generación de web en el orquestador.
 * Protegido con JWT.
 */
export async function createJob(clientData) {
  const response = await fetch(`${API_BASE}/api/jobs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(clientData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Obtiene el estado actual de un trabajo.
 */
export async function getJob(jobId) {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Elimina una generación (típicamente fallida): limpia recursos y resetea el sitio.
 */
export async function deleteJob(jobId) {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo eliminar la generación.');
  }
  return response.json();
}

/**
 * Reintenta una generación fallida reutilizando los datos del job original.
 * Devuelve el nuevo { jobId }.
 */
export async function retryJob(jobId) {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}/retry`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo reintentar la generación.');
  }
  return response.json();
}

/**
 * Obtiene la auditoría REAL de rendimiento/SEO del sitio desplegado (PageSpeed Insights).
 * Devuelve { available: false, reason } si no hay sitio o no es accesible.
 * @param {boolean} refresh fuerza re-medir ignorando la caché del backend
 */
export async function getSiteAudit(refresh = false) {
  const response = await fetch(`${API_BASE}/api/site/audit${refresh ? '?refresh=1' : ''}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo obtener la auditoría.');
  }
  return response.json();
}

/**
 * Sube las fotos propias del negocio (data URLs base64) durante el onboarding.
 * Devuelve { photos: [{ id }] } con los ids para incluirlos en el payload de generación.
 */
export async function uploadOnboardingImages(images) {
  const response = await fetch(`${API_BASE}/api/uploads`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ images }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudieron subir las imágenes.');
  }
  return response.json();
}

/**
 * Sube una imagen al proyecto en vivo del IDE. Devuelve { url } con la ruta pública
 * (`/avialo-uploads/<file>`) para referenciarla en el siguiente prompt de edición.
 */
export async function uploadJobImage(jobId, image) {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}/upload`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ image }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo subir la imagen.');
  }
  return response.json();
}

/**
 * Crea una sesión de suscripción Stripe a través del backend.
 * Protegido con JWT.
 */
export async function createCheckoutSession(payload) {
  const response = await fetch(`${API_BASE}/api/checkout`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * Abre el Customer Portal de Stripe para gestionar/cancelar la suscripción.
 * Devuelve { url } a la que se debe redirigir al usuario.
 */
export async function createBillingPortalSession() {
  const response = await fetch(`${API_BASE}/api/billing/portal`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo abrir el portal de facturación.');
  }
  return response.json();
}

/**
 * Recupera el historial de facturas reales de Stripe del usuario desde el backend.
 */
export async function getRealInvoices() {
  const response = await fetch(`${API_BASE}/api/billing/invoices`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudieron cargar las facturas reales.');
  }
  return response.json();
}

// ============================================
// SERVICIOS DE AUTENTICACIÓN REAL (NUEVO)
// ============================================

/**
 * Registro de nueva cuenta SaaS
 */
export async function register(name, email, password) {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar la cuenta.');
  }
  return response.json();
}

/**
 * Inicio de sesión
 */
export async function login(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Credenciales de acceso incorrectas.');
  }
  return response.json();
}

/**
 * Obtener datos del perfil actual actualizados desde el backend
 */
export async function getProfile() {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    throw new Error('Error al sincronizar perfil.');
  }
  return response.json();
}

/**
 * Actualizar las respuestas del onboarding de usuario
 */
export async function updateProfile(profileData) {
  const response = await fetch(`${API_BASE}/api/auth/update-profile`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(profileData),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al guardar el perfil.');
  }
  return response.json();
}

/**
 * URL del endpoint SSE de logs de un trabajo.
 * EventSource no permite cabeceras, así que el token JWT se pasa como query param.
 */
export function getJobLogsSSEUrl(jobId) {
  let token = '';
  const userStr = localStorage.getItem('avialo_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.token) token = user.token;
    } catch { /* token ausente o corrupto: continuar sin autenticación */ }
  }
  return `${API_BASE}/api/jobs/${jobId}/logs?token=${encodeURIComponent(token)}`;
}

/**
 * Obtiene la lista de archivos editables del sandbox.
 */
export async function getSandboxFiles(jobId) {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}/files`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al obtener archivos.');
  }
  return response.json();
}

/**
 * Obtiene el contenido de un archivo específico.
 */
export async function getSandboxFileContent(jobId, filePath) {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}/files/content?path=${encodeURIComponent(filePath)}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al leer archivo.');
  }
  return response.json();
}

/**
 * Envía una solicitud de edición al asistente de IA.
 */
export async function editJob(jobId, prompt) {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}/edit`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al iniciar edición.');
  }
  return response.json();
}

/**
 * Modo Asistente del IDE: hace una pregunta sobre la web y recibe la respuesta en STREAMING.
 * Llama a onToken(chunk) por cada fragmento de texto. Devuelve el texto completo al terminar.
 * @param {string} jobId
 * @param {string} message
 * @param {Array<{role:'user'|'assistant',content:string}>} history
 * @param {(chunk:string)=>void} onToken
 */
export async function streamAssistant(jobId, message, history, onToken) {
  const response = await fetch(`${API_BASE}/api/jobs/${jobId}/ask`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ message, history }),
  });
  if (!response.ok || !response.body) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Error HTTP ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) { full += chunk; onToken(chunk); }
  }
  return full;
}

/**
 * Autentica o registra un usuario utilizando Google OAuth.
 */
export async function loginWithGoogle(credential) {
  const response = await fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error en la autenticación con Google.');
  }
  return response.json();
}

/**
 * Comprueba disponibilidad de {baseName}.es (primario) y {baseName}.com (fallback).
 */
export async function checkDomainAvailability(baseName) {
  const response = await fetch(`${API_BASE}/api/domains/check`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ baseName }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al comprobar disponibilidad del dominio.');
  }
  return response.json();
}

/**
 * Registra el dominio (.es primario, .com fallback) y crea la zona DNS apuntando al droplet.
 */
export async function purchaseDomain(baseName) {
  const response = await fetch(`${API_BASE}/api/domains/purchase`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ baseName }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al registrar el dominio.');
  }
  return response.json();
}

// ============================================
// CORREOS CORPORATIVOS
// ============================================

export async function listEmailAccounts() {
  const response = await fetch(`${API_BASE}/api/email/accounts`, { headers: getHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al cargar los correos.');
  }
  return response.json();
}

export async function createEmailAccount(localPart, password) {
  const response = await fetch(`${API_BASE}/api/email/accounts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ localPart, password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al crear el correo.');
  }
  return response.json();
}

export async function deleteEmailAccount(id) {
  const response = await fetch(`${API_BASE}/api/email/accounts/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al eliminar el correo.');
  }
  return response.json();
}

export async function resetEmailPassword(id, password) {
  const response = await fetch(`${API_BASE}/api/email/accounts/${id}/reset-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al cambiar la contraseña del correo.');
  }
  return response.json();
}

/**
 * Comprueba el estado de propagación DNS de un dominio (polling).
 */
export async function checkDomainPropagation(domain) {
  const response = await fetch(`${API_BASE}/api/domains/propagation?domain=${encodeURIComponent(domain)}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al comprobar la propagación DNS.');
  }
  return response.json();
}

/**
 * Realiza una consulta DNS al backend para verificar si el dominio apunta a la IP de Avialo.
 */
export async function verifyDns(domain) {
  const response = await fetch(`${API_BASE}/api/auth/verify-dns`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ domain }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al verificar el dominio.');
  }
  return response.json();
}

/**
 * RGPD — Descarga todos los datos de la cuenta como JSON (portabilidad de datos).
 */
export async function exportMyData() {
  const response = await fetch(`${API_BASE}/api/auth/export-data`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudieron exportar los datos.');
  }
  return response.json();
}

/**
 * RGPD — Elimina la cuenta del usuario y todos sus datos asociados (derecho al olvido).
 */
export async function deleteMyAccount() {
  const response = await fetch(`${API_BASE}/api/auth/account`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo eliminar la cuenta.');
  }
  return response.json();
}

export async function changePassword(currentPassword, newPassword) {
  const response = await fetch(`${API_BASE}/api/auth/change-password`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Error al cambiar la contraseña.');
  }
  return response.json();
}

/**
 * Obtiene todas las sesiones de dispositivos activas del usuario actual.
 */
export async function getActiveSessions() {
  const response = await fetch(`${API_BASE}/api/auth/sessions`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudieron recuperar las sesiones activas.');
  }
  return response.json();
}

/**
 * Revoca y cierra la sesión de un dispositivo específico.
 */
export async function revokeSession(sessionId) {
  const response = await fetch(`${API_BASE}/api/auth/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo cerrar la sesión en el dispositivo.');
  }
  return response.json();
}

/**
 * Cierra la sesión en todos los demás dispositivos excepto el actual.
 */
export async function revokeOtherSessions() {
  const response = await fetch(`${API_BASE}/api/auth/sessions/logout-others`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudieron cerrar las demás sesiones.');
  }
  return response.json();
}


