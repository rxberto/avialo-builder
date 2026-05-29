import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Lock, User, UserPlus, AlertCircle } from 'lucide-react';
import { register } from '../lib/api';
import Logo from './ui/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from '@/lib/utils';

export default function RegisterPage({ onRegister }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('Por favor, completa todos los campos requeridos.');
      return;
    }
    setLoading(true);
    try {
      const result = await register(name, email, password);
      onRegister(result);
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta. El correo podría estar en uso.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 overflow-hidden bg-background">
      {/* Dot pattern */}
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
        )}
      />

      {/* Brand glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[var(--brand-glow)] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl p-8 overflow-hidden">

          {/* Back */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium mb-7 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Volver al inicio
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[var(--brand-glow)] border border-[var(--brand)]/20 flex items-center justify-center mb-4">
              <Logo className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Crea tu cuenta</h1>
            <p className="text-muted-foreground text-sm max-w-xs">
              Estás a unos pasos de desplegar tu sitio web gestionado por IA
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex gap-2.5 items-center"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="register-name">Nombre completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="pl-9"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@empresa.com"
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pl-9"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 font-semibold"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Crear cuenta y continuar
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center border-t border-border pt-5">
            <p className="text-muted-foreground text-sm">
              ¿Ya tienes una cuenta?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-semibold text-[var(--brand)] hover:underline underline-offset-4 transition-colors"
              >
                Iniciar sesión
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
