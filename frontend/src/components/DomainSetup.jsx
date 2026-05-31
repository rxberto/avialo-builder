import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Loader2, Globe, CheckCircle2, XCircle, Search, ShoppingCart, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { checkDomainAvailability, purchaseDomain, checkDomainPropagation } from '@/lib/api';

/**
 * Flujo de automatización de dominios (Openprovider):
 *  1) Comprobar disponibilidad de {base}.es (primario) y {base}.com (fallback)
 *  2) Registrar el dominio elegido (+ zona DNS apuntando al droplet)
 *  3) Polling de propagación DNS hasta que resuelva al servidor de Avialo
 */
export default function DomainSetup({ defaultBase = '', onRegistered }) {
  const [base, setBase] = useState(defaultBase);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [recommended, setRecommended] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [registeredDomain, setRegisteredDomain] = useState(null);
  const [propagated, setPropagated] = useState(false);
  const pollRef = useRef(null);

  // Polling de propagación cada 15s una vez registrado.
  useEffect(() => {
    if (!registeredDomain || propagated) return;

    const poll = async () => {
      try {
        const res = await checkDomainPropagation(registeredDomain);
        if (res.propagated) {
          setPropagated(true);
          toast.success('¡Dominio propagado!', { description: `${registeredDomain} ya apunta a Avialo.` });
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* silencioso, se reintenta */ }
    };

    poll();
    pollRef.current = setInterval(poll, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [registeredDomain, propagated]);

  const handleCheck = async () => {
    if (!base.trim()) return;
    setChecking(true);
    setResults(null);
    setRecommended(null);
    try {
      const res = await checkDomainAvailability(base);
      setResults(res.results || []);
      setRecommended(res.recommended);
      if (!res.recommended) {
        toast.error('Sin disponibilidad', { description: 'Ni .es ni .com están libres. Prueba otro nombre.' });
      }
    } catch (e) {
      toast.error('Error al comprobar', { description: e.message });
    } finally {
      setChecking(false);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const res = await purchaseDomain(base);
      setRegisteredDomain(res.domain);
      toast.success('Dominio registrado', { description: res.message });
      onRegistered?.(res.domain);
    } catch (e) {
      toast.error('No se pudo registrar', { description: e.message });
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Card className="border-zinc-200 dark:border-zinc-800 rounded-2xl">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-indigo-500" />
          <h3 className="text-sm font-bold">Tu dominio profesional</h3>
        </div>

        {!registeredDomain && (
          <>
            <div className="flex gap-2">
              <input
                value={base}
                onChange={(e) => setBase(e.target.value)}
                placeholder="miempresa"
                className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleCheck()}
              />
              <Button onClick={handleCheck} disabled={checking || !base.trim()} className="gap-2 rounded-xl">
                {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Comprobar
              </Button>
            </div>

            {results && (
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.domain} className="flex items-center justify-between text-xs font-semibold p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                    <span className="font-mono">{r.domain}</span>
                    {r.available ? (
                      <span className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="w-3.5 h-3.5" /> Disponible</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500"><XCircle className="w-3.5 h-3.5" /> Ocupado</span>
                    )}
                  </div>
                ))}

                {recommended && (
                  <Button onClick={handlePurchase} disabled={purchasing} className="w-full gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                    {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    Registrar {recommended}
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {registeredDomain && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <span className="text-sm font-mono font-bold">{registeredDomain}</span>
              {propagated ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" /> Activo
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Propagando…
                </span>
              )}
            </div>
            {!propagated && (
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Estamos comprobando la propagación DNS automáticamente cada 15 segundos. Puede tardar
                desde unos minutos hasta 24-48h según el registrador.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
