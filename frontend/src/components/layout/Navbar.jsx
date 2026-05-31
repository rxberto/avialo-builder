import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon, Menu, X, Bell, LayoutDashboard, Settings, LogOut, ChevronDown, User, Sparkles, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Layers, Zap, Cpu, Utensils, Stethoscope, Store } from 'lucide-react';
import Logo from '../ui/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Navbar({ darkMode, toggleTheme, user, onLogout, onNavigate, notifications = [], onMarkRead, onMarkAllRead, onOpenNotifications }) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Dropdown states
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  
  const userRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userRef.current && !userRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, target) => {
    e.preventDefault();
    setMenuOpen(false);
    setUserDropdownOpen(false);
    setNotifDropdownOpen(false);
    onNavigate(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isActive = (path) => location.pathname === path;

  // Relative Time Formatter
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      const diffMs = Date.now() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 15) return 'Ahora mismo';
      if (diffSec < 60) return `Hace ${diffSec} seg`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `Hace ${diffMin} min`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `Hace ${diffHr} hora${diffHr > 1 ? 's' : ''}`;
      const diffDay = Math.floor(diffHr / 24);
      return `Hace ${diffDay} día${diffDay > 1 ? 's' : ''}`;
    } catch (e) {
      return timeStr;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Initials Helper for Avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Plan Color Helper
  const getPlanBadge = (plan) => {
    switch (plan?.toLowerCase()) {
      case 'basic':
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/15 border-blue-500/20 text-[10px] py-0 px-2 font-semibold">Plan Basic</Badge>;
      case 'pro':
        return <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/15 border-purple-500/20 text-[10px] py-0 px-2 font-semibold animate-pulse-glow">Plan Pro</Badge>;
      case 'ecommerce':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 border-amber-500/20 text-[10px] py-0 px-2 font-semibold">Plan Ecommerce</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 px-2">Sin Suscripción</Badge>;
    }
  };

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 w-full z-50 transition-all duration-300 border-b select-none h-16 flex items-center",
          scrolled || menuOpen
            ? "bg-background/80 backdrop-blur-xl border-border/80 shadow-md shadow-black/5"
            : "bg-transparent border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto w-full px-6 lg:px-10 flex justify-between items-center">
          
          {/* Brand Logo */}
          <div
            onClick={(e) => handleNavClick(e, user ? 'dashboard' : 'landing')}
            className="group flex items-center gap-2.5 cursor-pointer outline-none shrink-0"
          >
            <Logo className="transition-transform group-hover:scale-105 duration-500" />
            <span className="font-bold text-lg tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75">
              Avialo<span className="text-brand">.</span>
            </span>
          </div>

          {/* Desktop Central Public Links (If NOT logged in) */}
          {!user && (
            <div className="hidden md:flex items-center gap-7 text-xs font-black uppercase tracking-wider text-muted-foreground/80">
              {/* Product category with Resend/Stripe-like dropdown */}
              <div className="relative group/nav">
                <button className="flex items-center gap-1 hover:text-foreground transition-colors py-2 outline-none cursor-pointer">
                  <span>Producto</span>
                  <ChevronDown size={12} className="group-hover/nav:rotate-180 transition-transform duration-300" />
                </button>
                {/* Dropdown Menu */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-xl p-4 opacity-0 scale-95 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:scale-100 group-hover/nav:pointer-events-auto transition-all duration-300 origin-top z-50">
                  <div className="space-y-3">
                    <a href="#algoritmo" className="flex items-start gap-3 p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all text-left">
                      <Zap className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[11px] font-black text-zinc-900 dark:text-white block uppercase tracking-wider">Algoritmo Autónomo</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block leading-normal lowercase font-medium">Digitaliza tu negocio tradicional en 2 minutos sin programar.</span>
                      </div>
                    </a>
                    <a href="#como-ayudamos" className="flex items-start gap-3 p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all text-left">
                      <Cpu className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[11px] font-black text-zinc-900 dark:text-white block uppercase tracking-wider">Citas y Cobros</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block leading-normal lowercase font-medium">Reservas automáticas para comensales, pacientes y pasarela Stripe.</span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              {/* How we help category */}
              <div className="relative group/nav">
                <button className="flex items-center gap-1 hover:text-foreground transition-colors py-2 outline-none cursor-pointer">
                  <span>Cómo ayudamos</span>
                  <ChevronDown size={12} className="group-hover/nav:rotate-180 transition-transform duration-300" />
                </button>
                {/* Dropdown Menu */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-xl p-4 opacity-0 scale-95 pointer-events-none group-hover/nav:opacity-100 group-hover/nav:scale-100 group-hover/nav:pointer-events-auto transition-all duration-300 origin-top z-50">
                  <div className="space-y-3">
                    <a href="#como-ayudamos" className="flex items-start gap-3 p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all text-left">
                      <Utensils className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[11px] font-black text-zinc-900 dark:text-white block uppercase tracking-wider">Mesones y Hostelería</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block leading-normal lowercase font-medium">Reservas de mesa online autónomas y control de comensales.</span>
                      </div>
                    </a>
                    <a href="#como-ayudamos" className="flex items-start gap-3 p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all text-left">
                      <Stethoscope className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[11px] font-black text-zinc-900 dark:text-white block uppercase tracking-wider">Clínicas y Consultas</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block leading-normal lowercase font-medium">Cita previa para dentistas, fisios, estéticas y servicios de barrio.</span>
                      </div>
                    </a>
                    <a href="#como-ayudamos" className="flex items-start gap-3 p-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-all text-left">
                      <Store className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[11px] font-black text-zinc-900 dark:text-white block uppercase tracking-wider">Comercio y Zapaterías</span>
                        <span className="text-[10px] text-zinc-450 dark:text-zinc-500 block leading-normal lowercase font-medium">Cobros seguros con tarjeta para vender calzado y productos a toda España.</span>
                      </div>
                    </a>
                  </div>
                </div>
              </div>

              {/* Pricing direct link */}
              <a href="#pricing" className="hover:text-foreground transition-colors py-2">
                Precios
              </a>

              {/* Nosotros */}
              <a href="#testimonios" className="hover:text-foreground transition-colors py-2">
                Nosotros
              </a>
            </div>
          )}

          {/* Desktop Central Links (Only if logged in) */}
          {user && (
            <div className="hidden md:flex items-center gap-1.5 bg-muted/30 border border-border/40 p-1 rounded-full text-sm">
              <a
                href="#"
                onClick={(e) => handleNavClick(e, 'dashboard')}
                className={cn(
                  "px-4 py-1.5 rounded-full transition-all duration-300 font-medium flex items-center gap-2",
                  isActive('/dashboard') 
                    ? "bg-background text-foreground shadow-sm shadow-black/5 border border-border/50" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutDashboard size={14} className={cn(isActive('/dashboard') ? "text-brand" : "text-muted-foreground")} />
                Panel de Control
              </a>
              <a
                href="#"
                onClick={(e) => handleNavClick(e, 'settings')}
                className={cn(
                  "px-4 py-1.5 rounded-full transition-all duration-300 font-medium flex items-center gap-2",
                  isActive('/settings') 
                    ? "bg-background text-foreground shadow-sm shadow-black/5 border border-border/50" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Settings size={14} className={cn(isActive('/settings') ? "text-brand" : "text-muted-foreground")} />
                Configuración
              </a>
            </div>
          )}

          {/* Desktop Action Section */}
          <div className="hidden md:flex items-center gap-4">
            
            {/* Theme Toggle */}
            <button
              aria-label="Alternar tema"
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent hover:border-border/50 transition-all duration-300 relative group cursor-pointer"
            >
              {darkMode ? <Sun size={16} className="rotate-0 scale-100 transition-all duration-500" /> : <Moon size={16} className="rotate-0 scale-100 transition-all duration-500" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                
                {/* Notification Bell Center */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className={cn(
                      "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 border transition-all duration-300 relative cursor-pointer",
                      notifDropdownOpen ? "bg-muted border-border text-foreground" : "border-transparent"
                    )}
                  >
                    <Bell size={16} />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full animate-pulse shadow-md shadow-brand/40" />
                    )}
                  </button>

                  {/* Dropdown Menu for Notifications */}
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-border/50 shadow-xl py-2 z-50 animate-scale-in text-sm overflow-hidden bg-background">
                      <div className="px-4 py-2 border-b border-border/40 flex justify-between items-center bg-muted/10">
                        <span className="font-semibold text-foreground">Notificaciones</span>
                        {unreadCount > 0 ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onMarkAllRead) onMarkAllRead();
                            }}
                            className="text-[10px] text-brand hover:text-brand-2 font-bold cursor-pointer transition-colors outline-none"
                          >
                            Marcar todo leído
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">Sin novedades</span>
                        )}
                      </div>
                      
                      <div className="max-h-72 overflow-y-auto divide-y divide-border/20">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-muted-foreground">
                            No tienes ninguna notificación pendiente.
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => {
                                setNotifDropdownOpen(false);
                                if (onMarkRead) onMarkRead(notif.id);
                              }}
                              className={cn(
                                "p-4 hover:bg-muted/20 transition-colors flex gap-3 cursor-pointer",
                                !notif.read ? "bg-brand/5 hover:bg-brand/10" : ""
                              )}
                            >
                              <div className="mt-0.5">
                                {notif.type === 'success' && <CheckCircle2 size={16} className="text-brand-success shrink-0" />}
                                {notif.type === 'info' && <Sparkles size={16} className="text-brand shrink-0" />}
                                {notif.type === 'warning' && <AlertCircle size={16} className="text-brand-warning shrink-0" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-foreground flex justify-between items-center gap-1">
                                  <span className="truncate pr-2">{notif.title}</span>
                                  {!notif.read && <span className="w-1.5 h-1.5 bg-brand rounded-full shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-normal break-words">{notif.message}</p>
                                <span className="text-[10px] text-muted-foreground/60 block mt-1.5">{formatTime(notif.time)}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div 
                        onClick={(e) => {
                          e.preventDefault();
                          setNotifDropdownOpen(false);
                          if (onOpenNotifications) onOpenNotifications();
                        }}
                        className="px-4 py-2 border-t border-border/40 text-center text-xs text-brand hover:text-brand-2 font-medium cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors"
                      >
                        Ver todas en el panel
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-4 w-px bg-border/60" />

                {/* User Dropdown */}
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded-full border hover:bg-muted/40 transition-all duration-300 cursor-pointer",
                      userDropdownOpen ? "bg-muted border-border" : "border-border/60"
                    )}
                  >
                    {/* User Initials Avatar */}
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-brand/10">
                      {getInitials(user.name)}
                    </div>
                    <span className="text-xs font-semibold text-foreground max-w-[90px] truncate hidden lg:block">
                      {user.name || 'Usuario'}
                    </span>
                    <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-300", userDropdownOpen && "rotate-180")} />
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl glass border border-border/50 shadow-xl py-2.5 z-50 animate-scale-in text-sm">
                      <div className="px-4 py-3 border-b border-border/40 flex flex-col gap-1.5">
                        <div className="font-semibold text-foreground truncate">{user.name || 'Empresa'}</div>
                        <div className="text-xs text-muted-foreground truncate leading-none">{user.email}</div>
                        <div className="mt-1">{getPlanBadge(user.plan)}</div>
                      </div>
                      
                      <div className="py-1.5">
                        <a
                          href="#"
                          onClick={(e) => handleNavClick(e, 'dashboard')}
                          className="flex items-center gap-2.5 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
                        >
                          <LayoutDashboard size={15} className="text-brand/80" />
                          Mi Panel de Control
                        </a>
                        <a
                          href="#"
                          onClick={(e) => handleNavClick(e, 'settings')}
                          className="flex items-center gap-2.5 px-4 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
                        >
                          <Settings size={15} className="text-brand-accent/80" />
                          Ajustes de Cuenta
                        </a>
                      </div>

                      <div className="border-t border-border/40 my-1" />

                      <div className="px-1.5 py-1">
                        <button
                          onClick={onLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-brand-danger hover:bg-red-500/5 hover:text-red-500 rounded-xl transition-all cursor-pointer text-left font-medium"
                        >
                          <LogOut size={15} />
                          Cerrar Sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleNavClick(e, 'login')}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-300"
                >
                  Iniciar Sesión
                </Button>
                <Button
                  size="sm"
                  onClick={(e) => handleNavClick(e, 'register')}
                  className="text-xs font-semibold relative overflow-hidden group shadow-md shadow-brand/10 hover:shadow-brand/20 bg-brand hover:bg-brand/90 text-white rounded-full px-5 h-9 flex items-center gap-1.5"
                >
                  Empezar Gratis
                  <ChevronDown size={14} className="-rotate-90 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Layout Actions */}
          <div className="md:hidden flex items-center gap-2">
            {user && (
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-lg text-muted-foreground relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full" />}
              </button>
            )}
            
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-foreground bg-muted/60 border border-border/40 rounded-xl transition-all"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

        </div>
      </nav>

      {/* Mobile Drawer (Glassmorphic Slide-down) */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur-2xl pt-20 px-6 md:hidden flex flex-col animate-fade-in text-sm select-none">
          
          {user && (
            <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border/40 rounded-2xl mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center text-white text-sm font-bold shadow-md">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-semibold text-foreground truncate">{user.name || 'Mi Cuenta'}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
              </div>
              <div>{getPlanBadge(user.plan)}</div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!user ? (
              <a
                href="#"
                onClick={(e) => handleNavClick(e, 'landing')}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border font-medium transition-all",
                  isActive('/') ? "bg-muted border-border/80 text-foreground" : "border-transparent text-muted-foreground"
                )}
              >
                Inicio
                <ChevronDown size={14} className="-rotate-90 text-muted-foreground" />
              </a>
            ) : (
              <>
                <a
                  href="#"
                  onClick={(e) => handleNavClick(e, 'dashboard')}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border font-semibold transition-all",
                    isActive('/dashboard') ? "bg-muted border-border/80 text-foreground" : "border-transparent text-muted-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <LayoutDashboard size={16} className="text-brand" />
                    Panel de Control
                  </span>
                  <ChevronDown size={14} className="-rotate-90 text-muted-foreground" />
                </a>

                <a
                  href="#"
                  onClick={(e) => handleNavClick(e, 'settings')}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border font-semibold transition-all",
                    isActive('/settings') ? "bg-muted border-border/80 text-foreground" : "border-transparent text-muted-foreground"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Settings size={16} className="text-brand-accent" />
                    Ajustes de Cuenta
                  </span>
                  <ChevronDown size={14} className="-rotate-90 text-muted-foreground" />
                </a>
              </>
            )}
          </div>

          <div className="mt-auto mb-10 flex flex-col gap-3">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-muted/10 font-semibold text-muted-foreground"
            >
              <span>Tema actual</span>
              <div className="flex items-center gap-1.5 text-foreground bg-muted/80 py-1 px-3 border border-border rounded-lg text-xs">
                {darkMode ? <><Moon size={12} /> Oscuro</> : <><Sun size={12} /> Claro</>}
              </div>
            </button>

            {user ? (
              <Button
                variant="destructive"
                onClick={onLogout}
                className="w-full py-6 rounded-xl gap-2 font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 hover:border-red-500/30"
              >
                <LogOut size={15} /> Cerrar Sesión
              </Button>
            ) : (
              <div className="flex flex-col gap-2.5">
                <Button
                  variant="outline"
                  onClick={(e) => handleNavClick(e, 'login')}
                  className="w-full py-5 rounded-full font-semibold border-border"
                >
                  Iniciar Sesión
                </Button>
                <Button
                  onClick={(e) => handleNavClick(e, 'register')}
                  className="w-full py-5 rounded-full font-semibold bg-brand hover:bg-brand/90 text-white shadow-md shadow-brand/10"
                >
                  Empezar Gratis
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
