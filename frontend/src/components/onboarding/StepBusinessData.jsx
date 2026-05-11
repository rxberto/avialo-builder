import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Check, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTORES = [
  'Restaurante / Bar', 'Fontanería', 'Electricidad', 'Clínica / Salud',
  'Peluquería / Estética', 'Academia / Formación', 'Tienda local',
  'Asesoría / Gestoría', 'Inmobiliaria', 'Taller mecánico',
  'Construcción / Reformas', 'Otro'
];

export default function StepBusinessData({ datos, updateData }) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateData('logoBase64', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChangeFile = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const isEmailInvalid = datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="space-y-2 text-center md:text-left mb-2">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Cuéntanos sobre tu negocio</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">La IA utilizará esta información para redactar y estructurar tu web.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <div className="col-span-1 md:col-span-2 space-y-2">
          <Label htmlFor="businessName">Nombre del negocio *</Label>
          <Input
            id="businessName"
            placeholder="Ej: Restaurante Casa Paco"
            value={datos.businessName}
            onChange={e => updateData('businessName', e.target.value)}
            className="h-11 bg-white/50 dark:bg-zinc-900/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sector">Sector *</Label>
          <Select 
            value={datos.sector} 
            onValueChange={val => updateData('sector', val)}
          >
            <SelectTrigger id="sector" className="h-11 bg-white/50 dark:bg-zinc-900/50">
              <SelectValue placeholder="Selecciona tu sector" />
            </SelectTrigger>
            <SelectContent>
              {SECTORES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {datos.sector === 'Otro' ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="space-y-2"
          >
            <Label htmlFor="sectorOtro">Especifica tu sector *</Label>
            <Input
              id="sectorOtro"
              placeholder="Ej: Organización de eventos"
              value={datos.sectorOtro}
              onChange={e => updateData('sectorOtro', e.target.value)}
              className="h-11 bg-white/50 dark:bg-zinc-900/50"
            />
          </motion.div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad *</Label>
            <Input
              id="city"
              placeholder="Ej: Madrid"
              value={datos.city}
              onChange={e => updateData('city', e.target.value)}
              className="h-11 bg-white/50 dark:bg-zinc-900/50"
            />
          </div>
        )}

        {datos.sector === 'Otro' && (
           <div className="col-span-1 md:col-span-2 space-y-2">
            <Label htmlFor="city-otro">Ciudad *</Label>
            <Input
              id="city-otro"
              placeholder="Ej: Madrid"
              value={datos.city}
              onChange={e => updateData('city', e.target.value)}
              className="h-11 bg-white/50 dark:bg-zinc-900/50"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="Ej: 612 345 678"
            value={datos.phone}
            onChange={e => updateData('phone', e.target.value)}
            className="h-11 bg-white/50 dark:bg-zinc-900/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className={cn(isEmailInvalid && "text-destructive")}>Email de contacto *</Label>
          <Input
            id="email"
            type="email"
            placeholder="Ej: info@tunegocio.es"
            value={datos.email}
            onChange={e => updateData('email', e.target.value)}
            className={cn(
              "h-11 bg-white/50 dark:bg-zinc-900/50 transition-colors",
              isEmailInvalid && "border-destructive focus-visible:ring-destructive"
            )}
          />
          {isEmailInvalid && (
            <span className="text-xs font-medium text-destructive mt-1 block">Introduce un email válido.</span>
          )}
        </div>

        <div className="col-span-1 md:col-span-2 space-y-2 pt-2">
          <Label>Logo de tu empresa <span className="font-normal text-zinc-400 dark:text-zinc-500">(opcional)</span></Label>
          
          {!datos.logoBase64 ? (
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "mt-1 flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 bg-white/50 dark:bg-zinc-900/20 hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                dragActive ? "border-zinc-900 bg-zinc-50 dark:bg-zinc-900/40" : "border-zinc-200 dark:border-zinc-800"
              )}
            >
              <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-3 text-zinc-500">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Sube un archivo o arrastra
              </div>
              <p className="text-xs text-zinc-400 mt-1">PNG, JPG o SVG (hasta 2MB)</p>
              <input 
                ref={fileInputRef} 
                type="file" 
                className="hidden" 
                accept="image/png, image/jpeg, image/svg+xml"
                onChange={handleChangeFile}
              />
            </div>
          ) : (
            <div className="mt-1 flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 overflow-hidden flex items-center justify-center p-2">
                  <img src={datos.logoBase64} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Logo cargado</p>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                    <Check size={12} className="text-emerald-500" /> Listo para integrar
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => updateData('logoBase64', '')}
                className="text-zinc-400 hover:text-destructive rounded-lg hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="col-span-1 md:col-span-2 space-y-2">
          <Label htmlFor="description">
            Describe tu negocio <span className="font-normal text-zinc-400 dark:text-zinc-500">(máxima descripción, mejor resultado)</span>
          </Label>
          <Textarea
            id="description"
            rows={4}
            placeholder="Ej: Somos un restaurante familiar especializado en cocina mediterránea..."
            value={datos.description}
            onChange={e => updateData('description', e.target.value)}
            className="bg-white/50 dark:bg-zinc-900/50 resize-none min-h-[100px]"
          />
        </div>
      </div>
    </motion.div>
  );
}
