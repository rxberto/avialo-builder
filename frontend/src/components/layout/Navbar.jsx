import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, Menu, X, Bell, LayoutDashboard, Settings, LogOut, ChevronDown,
  Sparkles, CheckCircle2, AlertCircle, Zap, Utensils, Stethoscope, Store,
  Calendar, CreditCard, Database, ArrowRight, Scissors
} from 'lucide-react';
import Logo from '../ui/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Curva de animación compartida (estilo "Emil Kowalski")
const EASE = [0.16, 1, 0.3, 1];

// Formatea una marca de tiempo ISO como tiempo relativo ("Hace 5 min").
// A nivel de módulo: depende del reloj (no idempotente), no debe vivir en render.
const formatTime = (timeStr) => {
  if (!timeStr) return '';
  try {
    const date = new Date(timeStr);
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 15) return 'Ahora mismo';
    if (diffSec < 60) return `Hace ${diffSec} seg`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `Hace ${diffHr} hora${diffHr > 1 ? 's' : ''}`;
    const diffDay = Math.floor(diffHr / 24);
    return `Hace ${diffDay} día${diffDay > 1 ? 's' : ''}`;
  } catch {
    return timeStr;
  }
};

// Estructura de datos de los mega-menús públicos
const MEGA_MENUS = {
  producto: {
    label: 'Producto',
    items: [
      { icon: Zap, color: 'text-brand', title: 'Algoritmo autónomo', desc: 'Tu web en 2 minutos, sin programar.', section: 'algoritmo' },
      { icon: Calendar, color: 'text-brand-accent', title: 'Reservas y citas', desc: 'Calendario en vivo para tu negocio.', section: 'algoritmo' },
      { icon: CreditCard, color: 'text-emerald-500', title: 'Cobros con tarjeta', desc: 'Pasarela Stripe segura, sin líos.', section: 'algoritmo' },
      { icon: Database, color: 'text-sky-500', title: 'Infraestructura real', desc: 'PostgreSQL aislado y código que es tuyo.', section: 'como-ayudamos' },
    ],
    featured: {
      title: 'Prueba el algoritmo gratis',
      desc: 'Crea tu primera web profesional en menos de 2 minutos.',
      cta: 'Empezar ahora',
    },
  },
  soluciones: {
    label: 'Soluciones',
    items: [
      { icon: Utensils, color: 'text-orange-500', title: 'Mesones y hostelería', desc: 'Reservas de mesa automáticas.', section: 'como-ayudamos' },
      { icon: Stethoscope, color: 'text-emerald-500', title: 'Clínicas y consultas', desc: 'Cita previa para tus pacientes.', section: 'como-ayudamos' },
      { icon: Store, color: 'text-brand', title: 'Comercio y tiendas', desc: 'Vende a toda España online.', section: 'como-ayudamos' },
      { icon: Scissors, color: 'text-brand-accent', title: 'Estética y servicios', desc: 'Agenda online para tu salón.', section: 'como-ayudamos' },
    ],
    featured: {
      title: '¿No ves tu sector?',
      desc: 'Funciona para cualquier negocio de barrio. Pruébalo gratis.',
      cta: 'Probar gratis',
    },
  },
};

export default function Navbar({ darkMode, toggleTheme, user, onLogout, onNavigate, notifications = [], onMarkRead, onMarkAllRead, onOpenNotifications }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);       // drawer móvil
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' ? window.scrollY > 300 : false);
  const [activeMenu, setActiveMenu] = useState(null);    // mega-menú abierto (desktop)
  const [mobileSection, setMobileSection] = useState(null); // acordeón móvil

  // Dropdowns de sesión iniciada
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const userRef = useRef(null);
  const notifRef = useRef(null);
  const closeTimer = useRef(null);

  // Cerrar dropdowns de sesión al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (userRef.current && !userRef.current.contains(event.target)) setUserDropdownOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Estado de scroll + cierre del mega-menú al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 300);
      if (window.scrollY > 300) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cerrar el mega-menú con la tecla Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setActiveMenu(null); setMenuOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Bloquear scroll del body cuando el drawer móvil está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Intención de hover: abrir al instante, cerrar con un pequeño respiro
  const openMega = (key) => { clearTimeout(closeTimer.current); setActiveMenu(key); };
  const scheduleClose = () => { closeTimer.current = setTimeout(() => setActiveMenu(null), 130); };
  const cancelClose = () => clearTimeout(closeTimer.current);

  // Navegar a una sección de la landing (con scroll suave)
  const goToSection = (e, id) => {
    if (e) e.preventDefault();
    setActiveMenu(null);
    setMenuOpen(false);
    if (location.pathname !== '/') {
      onNavigate('landing');
      setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 180);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNavClick = (e, target) => {
    if (e) e.preventDefault();
    setMenuOpen(false);
    setUserDropdownOpen(false);
    setNotifDropdownOpen(false);
    setActiveMenu(null);
    onNavigate(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isActive = (path) => location.pathname === path;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getPlanBadge = (plan) => {
    switch (plan?.toLowerCase()) {
      case 'basic':
      case 'corporativa':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] py-0 px-2 font-semibold">Plan Basic</Badge>;
      case 'pro':
      case 'dinamica':
        return <Badge variant="secondary" className="bg-brand/10 text-brand border-brand/20 text-[10px] py-0 px-2 font-semibold animate-pulse-glow">Plan Pro</Badge>;
      case 'ecommerce':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] py-0 px-2 font-semibold">Plan Ecommerce</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 px-2">Sin Suscripción</Badge>;
    }
  };

  const showSolidBar = scrolled || menuOpen || !!activeMenu;

  return (
    <>
      {/* ===== Scrim ligero: sutil cierre al hacer click fuera del mega-menú ===== */}
      <AnimatePresence>
        {activeMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
            onClick={() => setActiveMenu(null)}
            className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className="fixed top-0 left-0 w-full z-50 flex justify-center pointer-events-none">
        <nav
          className={cn(
            'pointer-events-auto flex items-center transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] select-none overflow-visible',
            showSolidBar
              ? 'mt-0 h-16 w-full max-w-[100vw] border-b border-border/70 bg-background/80 shadow-sm shadow-black/5 backdrop-blur-xl rounded-[0px]'
              : 'mt-6 h-14 w-[92%] max-w-[1024px] rounded-[32px] border border-white/20 bg-white/5 dark:bg-black/20 shadow-2xl backdrop-blur-md'
          )}
        >
          <div className={cn(
            "mx-auto flex w-full items-center justify-between transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
            showSolidBar ? "max-w-7xl px-6 lg:px-10" : "px-5 lg:px-8"
          )}>

          {/* ===== Logo ===== */}
          <button
            onClick={(e) => handleNavClick(e, user ? 'dashboard' : 'landing')}
            className="group flex shrink-0 items-center gap-2.5 outline-none"
          >
            <Logo className={cn(
              "transition-all duration-500 group-hover:scale-105",
              !showSolidBar && "text-white dark:text-white"
            )} />
            <span className={cn(
              "text-lg font-semibold tracking-tight transition-colors duration-500",
              showSolidBar ? "text-foreground" : "text-white"
            )}>
              Avialo<span className="text-brand">.</span>
            </span>
          </button>

          {/* ===== Navegación pública (mega-menú) ===== */}
          {!user && (
            <div
              className="hidden items-center gap-1 md:flex"
              onMouseLeave={scheduleClose}
              onMouseEnter={cancelClose}
            >
              {Object.entries(MEGA_MENUS).map(([key, menu]) => (
                <button
                  key={key}
                  onMouseEnter={() => openMega(key)}
                  onClick={() => setActiveMenu(activeMenu === key ? null : key)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                    activeMenu === key 
                      ? (showSolidBar ? 'text-foreground' : 'text-white') 
                      : (showSolidBar ? 'text-muted-foreground hover:text-foreground' : 'text-white/70 hover:text-white')
                  )}
                >
                  {menu.label}
                  <ChevronDown
                    size={14}
                    className={cn('transition-transform duration-300', activeMenu === key && 'rotate-180')}
                  />
                </button>
              ))}

              <a href="#pricing" onClick={(e) => goToSection(e, 'pricing')} onMouseEnter={() => openMega(null)}
                className={cn("rounded-lg px-3.5 py-2 text-sm font-medium transition-colors", showSolidBar ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white")}>
                Precios
              </a>
              <a href="#testimonios" onClick={(e) => goToSection(e, 'testimonios')} onMouseEnter={() => openMega(null)}
                className={cn("rounded-lg px-3.5 py-2 text-sm font-medium transition-colors", showSolidBar ? "text-muted-foreground hover:text-foreground" : "text-white/70 hover:text-white")}>
                Opiniones
              </a>
            </div>
          )}

          {/* ===== Navegación con sesión iniciada ===== */}
          {user && (
            <div className="hidden items-center gap-1.5 rounded-full border border-border/40 bg-muted/30 p-1 text-sm md:flex">
              <button
                onClick={(e) => handleNavClick(e, 'dashboard')}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-all duration-300',
                  isActive('/dashboard') ? 'border border-border/50 bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <LayoutDashboard size={14} className={isActive('/dashboard') ? 'text-brand' : 'text-muted-foreground'} />
                Panel de Control
              </button>
              <button
                onClick={(e) => handleNavClick(e, 'settings')}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-all duration-300',
                  isActive('/settings') ? 'border border-border/50 bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Settings size={14} className={isActive('/settings') ? 'text-brand' : 'text-muted-foreground'} />
                Configuración
              </button>
            </div>
          )}

          {/* ===== Acciones (desktop) ===== */}
          <div className="hidden items-center gap-3 md:flex">
            <button
              aria-label="Alternar tema"
              onClick={toggleTheme}
              className={cn(
                "rounded-lg border p-2 transition-all duration-300",
                showSolidBar ? "border-transparent text-muted-foreground hover:border-border/50 hover:bg-muted/50 hover:text-foreground" : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                {/* Notificaciones */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className={cn(
                      'relative rounded-lg border p-2 text-muted-foreground transition-all duration-300 hover:bg-muted/50 hover:text-foreground',
                      notifDropdownOpen ? 'border-border bg-muted text-foreground' : 'border-transparent'
                    )}
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-brand shadow-md shadow-brand/40" />}
                  </button>

                  <AnimatePresence>
                    {notifDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: EASE }}
                        className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-border/50 bg-popover py-2 text-sm shadow-xl"
                      >
                        <div className="flex items-center justify-between border-b border-border/40 bg-muted/10 px-4 py-2">
                          <span className="font-semibold text-foreground">Notificaciones</span>
                          {unreadCount > 0 ? (
                            <button onClick={(e) => { e.stopPropagation(); onMarkAllRead?.(); }} className="text-[10px] font-bold text-brand hover:text-brand-2">Marcar todo leído</button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Sin novedades</span>
                          )}
                        </div>
                        <div className="max-h-72 divide-y divide-border/20 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-muted-foreground">No tienes notificaciones pendientes.</div>
                          ) : (
                            notifications.map((notif) => (
                              <button
                                key={notif.id}
                                onClick={() => { setNotifDropdownOpen(false); onMarkRead?.(notif.id); }}
                                className={cn('flex w-full gap-3 p-4 text-left transition-colors hover:bg-muted/20', !notif.read && 'bg-brand/5 hover:bg-brand/10')}
                              >
                                <span className="mt-0.5">
                                  {notif.type === 'success' && <CheckCircle2 size={16} className="text-brand-success" />}
                                  {notif.type === 'info' && <Sparkles size={16} className="text-brand" />}
                                  {notif.type === 'warning' && <AlertCircle size={16} className="text-brand-warning" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-center justify-between gap-1 font-medium text-foreground">
                                    <span className="truncate pr-2">{notif.title}</span>
                                    {!notif.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
                                  </span>
                                  <span className="mt-1 block break-words text-xs leading-normal text-muted-foreground">{notif.message}</span>
                                  <span className="mt-1.5 block text-[10px] text-muted-foreground/60">{formatTime(notif.time)}</span>
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                        <button
                          onClick={() => { setNotifDropdownOpen(false); onOpenNotifications?.(); }}
                          className="w-full border-t border-border/40 bg-muted/10 px-4 py-2 text-center text-xs font-medium text-brand transition-colors hover:bg-muted/20 hover:text-brand-2"
                        >
                          Ver todas en el panel
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-4 w-px bg-border/60" />

                {/* Usuario */}
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border p-1.5 transition-all duration-300 hover:bg-muted/40',
                      userDropdownOpen ? 'border-border bg-muted' : 'border-border/60'
                    )}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-white shadow-md shadow-brand/10">
                      {getInitials(user.name)}
                    </span>
                    <span className="hidden max-w-[90px] truncate text-xs font-semibold text-foreground lg:block">{user.name || 'Usuario'}</span>
                    <ChevronDown size={14} className={cn('text-muted-foreground transition-transform duration-300', userDropdownOpen && 'rotate-180')} />
                  </button>

                  <AnimatePresence>
                    {userDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: EASE }}
                        className="absolute right-0 mt-3 w-64 rounded-2xl border border-border/50 bg-popover/95 py-2.5 text-sm shadow-xl backdrop-blur-xl"
                      >
                        <div className="flex flex-col gap-1.5 border-b border-border/40 px-4 py-3">
                          <span className="truncate font-semibold text-foreground">{user.name || 'Empresa'}</span>
                          <span className="truncate text-xs leading-none text-muted-foreground">{user.email}</span>
                          <span className="mt-1">{getPlanBadge(user.plan)}</span>
                        </div>
                        <div className="py-1.5">
                          <button onClick={(e) => handleNavClick(e, 'dashboard')} className="flex w-full items-center gap-2.5 px-4 py-2 text-muted-foreground transition-all hover:bg-muted/40 hover:text-foreground">
                            <LayoutDashboard size={15} className="text-brand/80" /> Mi Panel de Control
                          </button>
                          <button onClick={(e) => handleNavClick(e, 'billing')} className="flex w-full items-center gap-2.5 px-4 py-2 text-muted-foreground transition-all hover:bg-muted/40 hover:text-foreground">
                            <CreditCard size={15} className="text-emerald-500/80" /> Facturación
                          </button>
                          <button onClick={(e) => handleNavClick(e, 'settings')} className="flex w-full items-center gap-2.5 px-4 py-2 text-muted-foreground transition-all hover:bg-muted/40 hover:text-foreground">
                            <Settings size={15} className="text-brand-accent/80" /> Ajustes de Cuenta
                          </button>
                        </div>
                        <div className="my-1 border-t border-border/40" />
                        <div className="px-1.5 py-1">
                          <button onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left font-medium text-brand-danger transition-all hover:bg-red-500/5 hover:text-red-500">
                            <LogOut size={15} /> Cerrar Sesión
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={(e) => handleNavClick(e, 'login')} className={cn("text-sm font-medium transition-colors", showSolidBar ? "text-muted-foreground hover:text-foreground" : "text-white/80 hover:text-white hover:bg-white/10")}>
                  Iniciar Sesión
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => handleNavClick(e, 'register')}
                  className="group flex h-9 items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-md shadow-brand/20 transition-all hover:bg-brand/90 hover:shadow-brand/30"
                >
                  Empezar Gratis
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            )}
          </div>

          {/* ===== Acciones (móvil) ===== */}
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <button onClick={() => setNotifDropdownOpen(!notifDropdownOpen)} className={cn("relative rounded-lg p-2 transition-colors", showSolidBar ? "text-muted-foreground" : "text-white/80")}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand" />}
              </button>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Abrir menú"
              className={cn(
                "rounded-xl border p-2 transition-all",
                showSolidBar ? "border-border/40 bg-muted/60 text-foreground" : "border-white/10 bg-white/5 text-white"
              )}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* ===== Panel mega-menú — card flotante, no full-width ===== */}
        <AnimatePresence>
          {activeMenu && !user && (
            <motion.div
              key="mega-panel"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: EASE }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              className="absolute left-1/2 top-full z-50 mt-1.5 w-[680px] max-w-[calc(100vw-2rem)] -translate-x-1/2"
            >
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-xl shadow-black/8 backdrop-blur-xl dark:shadow-black/30">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeMenu}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.13, ease: EASE }}
                    className="grid grid-cols-[1fr_15rem] gap-0"
                  >
                    {/* Items en cuadrícula 2 columnas */}
                    <div className="grid grid-cols-2 gap-1 p-3">
                      {MEGA_MENUS[activeMenu].items.map((item) => (
                        <a
                          key={item.title}
                          href={`#${item.section}`}
                          onClick={(e) => goToSection(e, item.section)}
                          className="group/item flex items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-muted/60"
                        >
                          <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted transition-colors group-hover/item:bg-background', item.color)}>
                            <item.icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                            <span className="block text-xs leading-snug text-muted-foreground">{item.desc}</span>
                          </span>
                        </a>
                      ))}
                    </div>

                    {/* Tarjeta destacada */}
                    <div className="flex flex-col justify-between gap-4 border-l border-border/50 bg-muted/40 p-5">
                      <div className="h-5 w-5 rounded-md bg-brand/15 flex items-center justify-center">
                        <span className="h-2 w-2 rounded-full bg-brand" />
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-foreground">{MEGA_MENUS[activeMenu].featured.title}</span>
                        <span className="mt-1.5 block text-xs leading-relaxed text-muted-foreground">{MEGA_MENUS[activeMenu].featured.desc}</span>
                      </div>
                      <button
                        onClick={(e) => handleNavClick(e, 'register')}
                        className="group/cta inline-flex items-center gap-1.5 self-start rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-brand/20 transition-all hover:bg-brand/90 active:scale-95"
                      >
                        {MEGA_MENUS[activeMenu].featured.cta}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/cta:translate-x-0.5" />
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
      </div>

      {/* ===== Drawer móvil (totalmente responsive) ===== */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="fixed inset-0 z-40 flex flex-col bg-background/95 px-6 pb-8 pt-20 backdrop-blur-2xl md:hidden"
          >
            <div className="flex-1 overflow-y-auto">
              {user && (
                <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/30 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-sm font-bold text-white shadow-md">
                    {getInitials(user.name)}
                  </span>
                  <div className="flex-1 overflow-hidden">
                    <div className="truncate font-semibold text-foreground">{user.name || 'Mi Cuenta'}</div>
                    <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                  </div>
                  {getPlanBadge(user.plan)}
                </div>
              )}

              {!user ? (
                <div className="flex flex-col gap-2">
                  {/* Acordeones de mega-menú */}
                  {Object.entries(MEGA_MENUS).map(([key, menu]) => {
                    const open = mobileSection === key;
                    return (
                      <div key={key} className="overflow-hidden rounded-2xl border border-border/50 bg-card/50">
                        <button
                          onClick={() => setMobileSection(open ? null : key)}
                          className="flex w-full items-center justify-between p-4 text-left font-semibold text-foreground"
                        >
                          {menu.label}
                          <ChevronDown size={16} className={cn('text-muted-foreground transition-transform duration-300', open && 'rotate-180')} />
                        </button>
                        <AnimatePresence initial={false}>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: EASE }}
                            >
                              <div className="space-y-1 px-2 pb-2">
                                {menu.items.map((item) => (
                                  <a
                                    key={item.title}
                                    href={`#${item.section}`}
                                    onClick={(e) => goToSection(e, item.section)}
                                    className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-muted/60"
                                  >
                                    <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80', item.color)}>
                                      <item.icon className="h-4 w-4" />
                                    </span>
                                    <span>
                                      <span className="block text-sm font-semibold text-foreground">{item.title}</span>
                                      <span className="block text-xs leading-snug text-muted-foreground">{item.desc}</span>
                                    </span>
                                  </a>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}

                  <a href="#pricing" onClick={(e) => goToSection(e, 'pricing')} className="rounded-2xl border border-border/50 bg-card/50 p-4 font-semibold text-foreground">Precios</a>
                  <a href="#testimonios" onClick={(e) => goToSection(e, 'testimonios')} className="rounded-2xl border border-border/50 bg-card/50 p-4 font-semibold text-foreground">Opiniones</a>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button onClick={(e) => handleNavClick(e, 'dashboard')} className={cn('flex items-center justify-between rounded-xl border p-3.5 font-semibold transition-all', isActive('/dashboard') ? 'border-border/80 bg-muted text-foreground' : 'border-transparent text-muted-foreground')}>
                    <span className="flex items-center gap-2.5"><LayoutDashboard size={16} className="text-brand" /> Panel de Control</span>
                    <ChevronDown size={14} className="-rotate-90 text-muted-foreground" />
                  </button>
                  <button onClick={(e) => handleNavClick(e, 'billing')} className={cn('flex items-center justify-between rounded-xl border p-3.5 font-semibold transition-all', isActive('/billing') ? 'border-border/80 bg-muted text-foreground' : 'border-transparent text-muted-foreground')}>
                    <span className="flex items-center gap-2.5"><CreditCard size={16} className="text-emerald-500" /> Facturación</span>
                    <ChevronDown size={14} className="-rotate-90 text-muted-foreground" />
                  </button>
                  <button onClick={(e) => handleNavClick(e, 'settings')} className={cn('flex items-center justify-between rounded-xl border p-3.5 font-semibold transition-all', isActive('/settings') ? 'border-border/80 bg-muted text-foreground' : 'border-transparent text-muted-foreground')}>
                    <span className="flex items-center gap-2.5"><Settings size={16} className="text-brand-accent" /> Ajustes de Cuenta</span>
                    <ChevronDown size={14} className="-rotate-90 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>

            {/* Pie del drawer */}
            <div className="mt-6 flex flex-col gap-3 border-t border-border/40 pt-5">
              <button onClick={toggleTheme} className="flex w-full items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-3.5 font-semibold text-muted-foreground">
                <span>Tema</span>
                <span className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/80 px-3 py-1 text-xs text-foreground">
                  {darkMode ? <><Moon size={12} /> Oscuro</> : <><Sun size={12} /> Claro</>}
                </span>
              </button>

              {user ? (
                <Button variant="destructive" onClick={onLogout} className="w-full gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-6 font-semibold text-red-500 hover:bg-red-500/20">
                  <LogOut size={15} /> Cerrar Sesión
                </Button>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <Button variant="outline" onClick={(e) => handleNavClick(e, 'login')} className="w-full rounded-full border-border py-5 font-semibold">
                    Iniciar Sesión
                  </Button>
                  <Button onClick={(e) => handleNavClick(e, 'register')} className="group w-full gap-1.5 rounded-full bg-brand py-5 font-semibold text-white shadow-md shadow-brand/10 hover:bg-brand/90">
                    Empezar Gratis <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
