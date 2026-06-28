import { businessConfig } from "@/config/business";
import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Aviso Legal" };

export default function AvisoLegalPage() {
  return (
    <LegalPage title="Aviso Legal">
      <p>
        En cumplimiento de la Ley 34/2002 de Servicios de la Sociedad de la
        Información y de Comercio Electrónico (LSSI-CE), se informa que este
        sitio web es titularidad de {businessConfig.name} (CIF{" "}
        {businessConfig.cif}), con domicilio en {businessConfig.contact.address}.
      </p>
      <p>
        Puede contactar con nosotros en el correo {businessConfig.contact.email}{" "}
        o en el teléfono {businessConfig.contact.phone}.
      </p>
      <p>
        El acceso y uso de este sitio atribuye la condición de usuario y supone
        la aceptación de las condiciones recogidas en este Aviso Legal.
      </p>
    </LegalPage>
  );
}
