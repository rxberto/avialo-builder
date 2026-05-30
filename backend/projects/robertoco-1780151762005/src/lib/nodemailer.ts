import nodemailer from "nodemailer";

// Definición de interfaces estrictas para asegurar tipado robusto sin usar "any"
export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Crea y devuelve el transportador de correo SMTP utilizando variables de entorno de forma segura.
 * Configuración adaptada para correos transaccionales en España.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Si faltan variables clave, alertamos en consola pero no rompemos el hilo de ejecución de la app
  if (!host || !user || !pass) {
    console.warn("⚠️ Advertencia: Variables de entorno SMTP ausentes. Los correos se imprimirán en consola.");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true para puerto 465, false para otros puertos
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Envía un correo electrónico transaccional general.
 * Si no hay SMTP configurado, imprime el correo en consola para desarrollo seguro.
 */
export async function sendTransactionalEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || "soporte@avialo.app";

    if (!transporter) {
      console.log("-----------------------------------------");
      console.log(`📧 MOCK EMAIL SENT (Sin SMTP configurado)`);
      console.log(`De: ${from}`);
      console.log(`Para: ${options.to}`);
      console.log(`Asunto: ${options.subject}`);
      console.log(`Cuerpo: ${options.text}`);
      console.log("-----------------------------------------");
      return { success: true, messageId: "mock-message-id" };
    }

    const info = await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || `<p>${options.text}</p>`,
    });

    console.log(`✅ Correo enviado con éxito a ${options.to}. ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("❌ Error al enviar correo transaccional:", error);
    return { success: false, error: error.message || "Error al enviar el email." };
  }
}

/**
 * Helper para notificar confirmación de cita a un cliente
 */
export async function sendAppointmentConfirmation(email: string, clientName: string, serviceName: string, dateStr: string): Promise<boolean> {
  const subject = `Confirmación de tu Cita: ${serviceName}`;
  const text = `Hola ${clientName},\n\nTu cita para el servicio de "${serviceName}" ha sido agendada con éxito para el día ${dateStr}.\n\nSi necesitas realizar cualquier modificación, accede a tu panel privado o ponte en contacto con nosotros.\n\nUn cordial saludo,\nEl equipo técnico de Avialo.`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #2563eb;">¡Tu cita está agendada! 🎉</h2>
      <p>Hola <strong>${clientName}</strong>,</p>
      <p>Te confirmamos que hemos reservado con éxito tu cita para el servicio especial de <strong>${serviceName}</strong>.</p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
        <p style="margin: 0; font-weight: bold;">Detalles de la cita:</p>
        <p style="margin: 6px 0 0 0;">📅 Fecha y Hora: ${dateStr}</p>
        <p style="margin: 4px 0 0 0;">🛠️ Servicio: ${serviceName}</p>
      </div>
      <p>Si necesitas realizar cualquier cambio, accede a tu <a href="https://avialo.app/dashboard" style="color: #2563eb; text-decoration: underline;">Panel de Cliente</a>.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #64748b;">Este correo es meramente transaccional. Por favor, no respondas directamente a este mensaje.</p>
    </div>
  `;

  const result = await sendTransactionalEmail({ to: email, subject, text, html });
  return result.success;
}
