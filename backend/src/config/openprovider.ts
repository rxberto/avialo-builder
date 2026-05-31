// ============================================
// CONFIGURACIÓN DE OPENPROVIDER (registro de dominios)
// ============================================
// Openprovider se eligió porque soporta .es a precio coste (~7-10€ registro y renovación)
// vía su modelo Membership. Namecheap no soporta .es; Gandi renueva a ~38€/año.
// Docs: https://developers.openprovider.eu/
//
// Todos los dominios se registran bajo la cuenta/handle de Avialo (un único owner handle
// reutilizado), por lo que el cliente no necesita cuenta propia en Openprovider.

export const openproviderConfig = {
  baseUrl: process.env.OPENPROVIDER_BASE_URL || "https://api.openprovider.eu/v1beta",
  username: process.env.OPENPROVIDER_USERNAME,
  password: process.env.OPENPROVIDER_PASSWORD,
  // Handle de contacto/owner de Avialo ya creado en el panel de Openprovider (reutilizado).
  ownerHandle: process.env.OPENPROVIDER_OWNER_HANDLE,
  // IP del droplet a la que apuntan los registros A de los dominios de clientes.
  dnsTargetIp: process.env.DNS_TARGET_IP || "159.69.110.22",
  // Nameservers de Openprovider (DNS gestionado).
  nameServers: (process.env.OPENPROVIDER_NS || "ns1.openprovider.nl,ns2.openprovider.be,ns3.openprovider.eu")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean),
};

export function isOpenproviderConfigured(): boolean {
  return Boolean(
    openproviderConfig.username &&
    openproviderConfig.password &&
    openproviderConfig.ownerHandle
  );
}
