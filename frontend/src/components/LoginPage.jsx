import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Lock, LogIn, AlertCircle, Sparkles } from 'lucide-react';
import { login } from '../lib/api';
import Logo from './ui/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DotPattern } from '@/components/ui/dot-pattern';
import { cn } from '@/lib/utils';

export default function LoginPage({ onLogin }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleCredentialResponse = async (response) => {
    setError('');
    setLoading(true);
    try {
      const { loginWithGoogle } = await import('../lib/api');
      const result = await loginWithGoogle(response.credential);
      onLogin({ token: result.token, ...result.user }, result.isNewGoogleUser);
    } catch (err) {
      setError(err.message || 'Error al conectar con tu cuenta de Google.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Cargar SDK de Google de forma asíncrona
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && import.meta.env.VITE_GOOGLE_CLIENT_ID) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
        });

        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
          }
        );
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Por favor, introduce tu email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(email, password);
      onLogin({ token: result.token, ...result.user });
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas o servidor fuera de línea.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 overflow-hidden bg-background">
      {/* Dot pattern background */}
      <DotPattern
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]"
        )}
      />

      {/* Subtle brand glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[var(--brand-glow)] rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl p-8 overflow-hidden">

          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm font-medium mb-7 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Volver al inicio
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand-glow)] border border-[var(--brand)]/20 flex items-center justify-center">
                <Logo className="w-6 h-6" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Bienvenido de nuevo</h1>
            <p className="text-muted-foreground text-sm max-w-xs">
              Introduce tus credenciales para acceder a tu panel
            </p>
          </div>

          {/* Error alert */}
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
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@empresa.com"
                  className="pl-9"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  autoComplete="current-password"
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
                  <LogIn className="w-4 h-4" />
                  Acceder a la Plataforma
                </>
              )}
            </Button>
          </form>

          {/* Google Sign-in Separator & Button */}
          {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">O continuar con</span>
                </div>
              </div>
              <div id="google-signin-btn" className="w-full flex justify-center overflow-hidden rounded-xl border border-border" />
            </>
          ) : (
            <div className="my-6 text-center text-xs text-muted-foreground">
              Google Sign-In no configurado
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 text-center border-t border-border pt-5">
            <p className="text-muted-foreground text-sm">
              ¿No tienes una cuenta?{' '}
              <button
                onClick={() => navigate('/register')}
                className="font-semibold text-[var(--brand)] hover:underline underline-offset-4 transition-colors"
              >
                Registrarse gratis
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
