"use server";

import { db } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createAppointment(data: {
  serviceName: string;
  price: number;
  dateStr: string;
  timeStr: string;
  notes?: string;
}) {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return { success: false, error: "Usuario no autenticado." };
    }

    const userId = session.user.id;
    const dateTime = new Date(`${data.dateStr}T${data.timeStr}:00`);

    if (isNaN(dateTime.getTime())) {
      return { success: false, error: "Fecha u hora inválida." };
    }

    const appointment = await db.appointment.create({
      data: {
        userId,
        serviceName: data.serviceName,
        price: data.price,
        date: dateTime,
        notes: data.notes,
        status: "pending",
      },
    });

    revalidatePath("/dashboard");
    
    return { success: true, appointmentId: appointment.id };
  } catch (error: any) {
    console.error("Error al crear cita:", error);
    return { success: false, error: error.message || "Error interno del servidor." };
  }
}

