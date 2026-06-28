import { businessConfig } from "@/config/business";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Política de Privacidad" };

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de Privacidad">
      <p>
        De acuerdo con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica
        3/2018 (LOPDGDD), {businessConfig.name} es responsable del tratamiento de
        los datos personales facilitados a través de este sitio.
      </p>
      <p>
        Los datos que nos proporciones al realizar un pedido (nombre, dirección,
        email y teléfono) se utilizan únicamente para gestionar la compra, el
        envío y la facturación, y no se ceden a terceros salvo obligación legal o
        para la prestación del servicio (pasarela de pago y transporte).
      </p>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión y
        oposición escribiendo a {businessConfig.contact.email}.
      </p>
    </LegalPage>
  );
}
