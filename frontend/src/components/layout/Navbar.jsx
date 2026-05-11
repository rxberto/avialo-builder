import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Menu, X, Activity, HelpCircle } from 'lucide-react';
import { SITE_CONFIG } from '../../data/siteConfig';
import Logo from '../ui/Logo';
import { cn } from "@/lib/utils";

export default function Navbar({ darkMode, toggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e) => {
    e.preventDefault();
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <nav 
        className={cn(
          "fixed top-0 left-0 w-full z-50 transition-all duration-500 select-none",
          scrolled 
            ? "py-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-800/50 shadow-sm" 
            : "py-6 bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex justify-between items-center">
          
          {/* Brand Logo Group */}
          <Link 
            to="/" 
            className="group flex items-center gap-3 outline-none" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Logo className="transition-transform group-hover:scale-105 duration-300" />
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-600 dark:from-zinc-50 dark:via-zinc-200 dark:to-zinc-400">
              {SITE_CONFIG.general.name}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <nav className="flex items-center gap-6 text-sm font-medium">
              <a 
                href="#" 
                onClick={handleNavClick} 
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
              >
                Inicio
              </a>
              <a 
                href="#" 
                onClick={handleNavClick} 
                className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors group"
              >
                <Activity size={14} className="group-hover:animate-pulse text-emerald-500 dark:text-emerald-400" />
                Constructor
              </a>
            </nav>

            <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1" />

            <div className="flex items-center gap-3">
              <a 
                href="mailto:soporte@avialo.com" 
                className="px-4 py-2 text-xs font-semibold rounded-full border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <HelpCircle size={12} /> Soporte
              </a>

              <button 
                aria-label={darkMode ? "Activar modo claro" : "Activar modo oscuro"} 
                onClick={toggleTheme} 
                className="p-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all shadow-inner"
              >
                {darkMode ? <Sun size={16} className="animate-in spin-in-90 duration-300" /> : <Moon size={16} className="animate-in spin-in-90 duration-300" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden flex items-center gap-3">
            <button 
              onClick={toggleTheme}
              className="p-2 text-zinc-500 dark:text-zinc-400"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              aria-label="Menu" 
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-zinc-900 dark:text-zinc-50 bg-zinc-100 dark:bg-zinc-900 rounded-lg shadow-sm"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Fullscreen Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-white/98 dark:bg-zinc-950/98 backdrop-blur-xl pt-24 px-8 lg:hidden animate-in fade-in slide-in-from-top-10 duration-300 flex flex-col">
          <div className="flex flex-col gap-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            <a href="#" onClick={handleNavClick} className="flex items-center justify-between group">
              Inicio
              <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
            <a href="#" onClick={handleNavClick} className="flex items-center justify-between group">
              Constructor
              <span className="w-2 h-2 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          </div>
          
          <div className="mt-auto mb-10 flex flex-col gap-4 pt-6 border-t border-zinc-100 dark:border-zinc-900">
            <a href="mailto:soporte@avialo.com" className="w-full py-3 text-center font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center gap-2">
              <HelpCircle size={16} /> Soporte Técnico
            </a>
          </div>
        </div>
      )}
    </>
  );
}
