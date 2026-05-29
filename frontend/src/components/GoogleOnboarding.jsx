import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, User } from 'lucide-react';
import { updateProfile } from '../lib/api';
import Logo from './ui/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from '@/lib/utils';

export default function GoogleOnboarding({ user, onUpdateUser }) {
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, introduce tu nombre.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Usamos el endpoint update-profile extendido para actualizar el nombre
      const updatedUser = await updateProfile({ name });
      onUpdateUser(updatedUser);
      // Redirigir al onboarding de SaaS principal (rol, profesión, etc.)
      navigate('/onboarding');
    } catch (err) {
      setError(err.message || 'Ocurrió un error al guardar tu nombre.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 overflow-hidden bg-background">
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
        )}
      />

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[var(--brand-glow)] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        <div className="relative rounded-3xl border border-border bg-card/60 backdrop-blur-2xl shadow-3xl p-10 overflow-hidden">
          
          {/* Top Logo and Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-14 h-14 rounded-2xl bg-[var(--brand-glow)] border border-[var(--brand)]/20 flex items-center justify-center mb-5"
            >
              <Logo className="w-7 h-7" />
            </motion.div>
            
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-3">
              Te damos la bienvenida a Avialo
            </h1>
            <p className="text-muted-foreground text-base max-w-md">
              Para empezar a dar forma a tus proyectos de IA, nos encantaría conocerte un poco mejor.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold tracking-wide text-foreground/80 flex items-center gap-1.5 justify-center mb-2">
                <Sparkles className="w-4 h-4 text-[var(--brand)]" />
                ¿CÓMO DEBERÍAMOS LLAMARTE?
              </label>
              
              <div className="relative max-w-md mx-auto">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre o alias"
                  className="h-14 pl-12 pr-4 text-lg font-medium text-center bg-background/50 border-border focus:ring-2 focus:ring-[var(--brand)]/50 rounded-2xl"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-destructive text-sm font-medium text-center mt-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex justify-center pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-14 px-8 text-base font-bold tracking-wide rounded-2xl bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] transition-all duration-300 shadow-lg shadow-[var(--brand)]/20 flex items-center gap-2 group"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    Continuar a Onboarding
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>

        </div>
      </motion.div>
    </div>
  );
}
