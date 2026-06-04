"use client";

import { useState } from "react";
import { Calendar, Clock, CreditCard, ChevronLeft, ShieldCheck, Check } from "lucide-react";
import Link from "next/link";
import { createAppointment } from "@/app/actions/booking";
import { businessConfig } from "@/config/business";

// Servicios reservables del negocio (inyectados por el scaffold según el sector).
const SERVICIOS = (businessConfig.services && businessConfig.services.length > 0)
  ? businessConfig.services
  : [{ name: "Consulta inicial", price: 0, duration: "30 min" }];

const HUECOS = ["09:00", "10:30", "12:00", "16:00", "17:30"];

export default function ReservarCitaPage() {
  const [selectedService, setSelectedService] = useState(SERVICIOS[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      setError("Por favor, selecciona una fecha y una hora.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await createAppointment({
      serviceName: selectedService.name,
      price: selectedService.price,
      dateStr: date,
      timeStr: time,
      notes,
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
    } else {
      setError(res.error || "Ocurrió un error inesperado al procesar la cita.");
    }
  };

  if (success) {
    return (
      <div className="flex-1 bg-muted/10 py-20 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-card border border-border p-8 rounded-3xl shadow-xl text-center">
          <div className="mx-auto h-16 w-16 bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center rounded-2xl mb-6 border border-emerald-200 dark:border-emerald-800">
            <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-black text-foreground">¡Cita Solicitada con Éxito!</h2>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Hemos recibido tu reserva para <strong>{selectedService.name}</strong>. Nuestro equipo validará el hueco y te confirmará por correo electrónico a la mayor brevedad.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-md"
            >
              Volver al Panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-muted/10 py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Enlace atrás */}
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6">
          <ChevronLeft size={16} /> Volver al panel de cliente
        </Link>

        {/* Título */}
        <div className="border-b border-border pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Reservar Cita</h1>
          <p className="text-sm text-muted-foreground mt-1">Elige el servicio profesional y el horario que mejor te convenga.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* 1. SELECCIONAR SERVICIO */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-primary" /> 1. Elige un Servicio Profesional
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {SERVICIOS.map((serv) => (
                <div
                  key={serv.name}
                  onClick={() => setSelectedService(serv)}
                  className={`p-4 border rounded-2xl cursor-pointer flex items-center justify-between transition-all ${
                    selectedService.name === serv.name
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                      : "border-border hover:border-primary/20 bg-background"
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{serv.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Duración estimada: {serv.duration}</p>
                  </div>
                  <span className="font-extrabold text-foreground">{serv.price > 0 ? `${serv.price.toFixed(2)}€` : "Gratis"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. ELEGIR FECHA Y HORA */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-primary" /> 2. Configura tu Horario
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha disponible</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Hora (Huecos disponibles)</label>
                <div className="flex flex-wrap gap-2">
                  {HUECOS.map((hueco) => (
                    <button
                      key={hueco}
                      type="button"
                      onClick={() => setTime(hueco)}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-all ${
                        time === hueco
                          ? "bg-primary border-primary text-primary-foreground shadow-sm"
                          : "border-border hover:border-primary/20 bg-background"
                      }`}
                    >
                      {hueco}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. NOTAS ADICIONALES */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <Clock size={18} className="text-primary" /> 3. Notas Adicionales (Opcional)
            </h3>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe aquí cualquier detalle, síntoma o requerimiento especial para tu cita..."
              className="block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* MENSAJES DE ERROR */}
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-400 p-4 rounded-2xl text-xs font-medium">
              {error}
            </div>
          )}

          {/* BOTÓN DE RESERVA */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Procesando..." : "Confirmar Cita Especializada"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
