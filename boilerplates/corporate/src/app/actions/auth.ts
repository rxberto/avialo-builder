"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

/**
 * Registra un nuevo CLIENTE del negocio. El admin se siembra aparte (Avialo Builder).
 */
export async function registerClient(data: { name: string; email: string; password: string }) {
  const name = (data.name || "").trim();
  const email = (data.email || "").trim().toLowerCase();
  const password = data.password || "";

  if (!name || !email || password.length < 6) {
    return { error: "Revisa los datos: nombre, email y contraseña (mínimo 6 caracteres)." };
  }

  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "Ya existe una cuenta con ese email. Inicia sesión." };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.user.create({
      data: { name, email, passwordHash, role: "client" },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error al registrar cliente:", error);
    return { error: "No se pudo crear la cuenta. Inténtalo de nuevo." };
  }
}
