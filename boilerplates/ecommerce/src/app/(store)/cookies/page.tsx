import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Política de Cookies" };

export default function CookiesPage() {
  return (
    <LegalPage title="Política de Cookies">
      <p>
        Este sitio utiliza cookies propias y de terceros para garantizar el
        correcto funcionamiento de la tienda (gestión del carrito y de la sesión)
        y, con tu consentimiento, para fines analíticos.
      </p>
      <p>
        Las cookies técnicas son imprescindibles y no requieren consentimiento.
        Puedes aceptarlas o rechazarlas desde el banner de cookies y, en
        cualquier momento, borrarlas desde la configuración de tu navegador.
      </p>
    </LegalPage>
  );
}
