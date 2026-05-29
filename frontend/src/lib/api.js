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
    } catch (e) {}
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
 */
export function getJobLogsSSEUrl(jobId) {
  return `${API_BASE}/api/jobs/${jobId}/logs`;
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
