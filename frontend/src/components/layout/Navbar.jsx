import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, Menu, X, Activity, LogIn, LogOut, User, ChevronRight } from 'lucide-react';
import { SITE_CONFIG } from '../../data/siteConfig';
import Logo from '../ui/Logo';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BorderBeam } from '@/components/ui/border-beam';

export default function Navbar({ darkMode, toggleTheme, user, onLogout, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e, target) => {
    e.preventDefault();
    setMenuOpen(false);
    onNavigate(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 w-full z-50 transition-all duration-500 select-none",
          scrolled
            ? "py-3 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
            : "py-5 bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex justify-between items-center">

          {/* Brand */}
          <div
            onClick={(e) => handleNavClick(e, user ? 'dashboard' : 'landing')}
            className="group flex items-center gap-2.5 cursor-pointer outline-none"
          >
            <Logo className="transition-transform group-hover:scale-105 duration-300" />
            <span className="font-bold text-base tracking-tight text-foreground">
              {SITE_CONFIG.general.name}
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-7">
            <nav className="flex items-center gap-5 text-sm">
              <a
                href="#"
                onClick={(e) => handleNavClick(e, user ? 'dashboard' : 'landing')}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Inicio
              </a>
              {user && (
                <a
                  href="#"
                  onClick={(e) => handleNavClick(e, 'dashboard')}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-medium group"
                >
                  <Activity size={13} className="text-emerald-500 group-hover:animate-pulse" />
                  Mi Panel
                </a>
              )}
            </nav>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"}
                onClick={toggleTheme}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {user ? (
                <>
                  <div className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-muted text-muted-foreground rounded-lg border border-border">
                    <User size={11} />
                    <span className="max-w-[100px] truncate">{user.name || user.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLogout}
                    className="text-xs gap-1.5"
                  >
                    <LogOut size={12} /> Salir
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleNavClick(e, 'login')}
                    className="text-xs gap-1.5"
                  >
                    <LogIn size={12} /> Iniciar Sesión
                  </Button>
                   <Button
                     size="sm"
                     onClick={(e) => handleNavClick(e, 'register')}
                     className="text-xs font-semibold gap-1.5"
                   >
                     Empezar Gratis
                     <ChevronRight size={12} />
                   </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Toggle */}
          <div className="lg:hidden flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-muted-foreground">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              aria-label="Menu"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-foreground bg-muted rounded-lg border border-border"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-background/98 backdrop-blur-2xl pt-20 px-8 lg:hidden flex flex-col animate-in fade-in slide-in-from-top-8 duration-300">
          <div className="flex flex-col gap-5 text-xl font-semibold text-foreground">
            <a
              href="#"
              onClick={(e) => handleNavClick(e, user ? 'dashboard' : 'landing')}
              className="flex items-center justify-between py-1 border-b border-border/50 group"
            >
              Inicio
              <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </a>
            {user && (
              <a
                href="#"
                onClick={(e) => handleNavClick(e, 'dashboard')}
                className="flex items-center justify-between py-1 border-b border-border/50 group"
              >
                <span className="flex items-center gap-2">
                  <Activity size={16} className="text-emerald-500" />
                  Mi Panel
                </span>
                <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </a>
            )}
          </div>

          <div className="mt-auto mb-12 flex flex-col gap-3">
            {user ? (
              <Button
                variant="destructive"
                onClick={onLogout}
                className="w-full gap-2"
              >
                <LogOut size={15} /> Cerrar Sesión
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={(e) => handleNavClick(e, 'login')}
                  className="w-full gap-2"
                >
                  <LogIn size={15} /> Iniciar Sesión
                </Button>
                <Button
                  onClick={(e) => handleNavClick(e, 'register')}
                  className="w-full gap-2 font-semibold"
                >
                  Empezar Gratis
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
