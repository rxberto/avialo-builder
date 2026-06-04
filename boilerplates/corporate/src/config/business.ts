// Configuración de negocio. Valores por defecto del boilerplate.
// El scaffold de Avialo Builder SOBRESCRIBE este archivo con los datos reales del cliente.
export const businessConfig = {
  name: "Tu Empresa",
  cif: "Pendiente",
  sector: "Servicios Profesionales",
  city: "España",
  contact: {
    phone: "+34 900 000 000",
    email: "contacto@tuempresa.es",
    address: "España",
  },
  social: {
    instagram: "",
    facebook: "",
    linkedin: "",
  },
  theme: {
    primaryColor: "#2563eb",
  },
  services: [
    { name: "Consulta inicial", price: 0, duration: "30 min" },
    { name: "Servicio estándar", price: 40, duration: "60 min" },
    { name: "Servicio premium", price: 80, duration: "90 min" },
  ],
  // SEO editable desde el panel ⚙️ (si vacío, el layout deriva title/description del negocio).
  seo: {
    title: "",
    description: "",
  },
  // Formulario de contacto. "formsubmit" envía los mensajes a formsubmit.co/ajax/<email>.
  forms: {
    provider: "none" as "none" | "formsubmit",
    email: "",
  },
};
