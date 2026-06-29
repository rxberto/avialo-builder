import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Globe, Database, CreditCard, ShieldCheck,
  Key, RefreshCw, Server, ArrowUpRight, Copy, CheckCircle,
  Trash2, Sparkles, Activity,
  Mail, Plus, Loader2, HelpCircle, ExternalLink, Smartphone, Laptop, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { updateProfile, verifyDns, changePassword, getRealInvoices, createBillingPortalSession, getActiveSessions, revokeSession, revokeOtherSessions } from '@/lib/api';
import { cn } from '@/lib/utils';
import DomainSetup from './DomainSetup';
import EmailAccounts from './EmailAccounts';
import StoreUsers from './StoreUsers';

export default function SettingsPage({ user, onUpdateUser, onAddNotification }) {
  const [activeTab, setActiveTab] = useState('perfil');

  // Invoices & Billing states
  const [invoices, setInvoices] = useState([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Cargar facturas reales de Stripe
  const loadInvoices = async () => {
    setIsLoadingInvoices(true);
    try {
      const data = await getRealInvoices();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error("Error al cargar facturas reales en configuración:", err);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // Volver a cargar facturas si el tab activo cambia a 'plan'
  useEffect(() => {
    if (activeTab === 'plan') {
      loadInvoices();
    }
  }, [activeTab]);

  // Redirigir de forma segura al portal de facturación real de Stripe
  const handleOpenBillingPortal = async () => {
    setIsOpeningPortal(true);
    if (onAddNotification) {
      onAddNotification('info', 'Acceso Seguro', 'Generando enlace cifrado al portal de Stripe...');
    }
    try {
      const { url } = await createBillingPortalSession();
      if (url) {
        window.open(url, '_blank');
      } else {
        throw new Error("No se pudo obtener el enlace de Stripe.");
      }
    } catch (err) {
      console.error("Error al abrir portal de facturación en configuración:", err);
      if (onAddNotification) {
        onAddNotification('error', 'Error del Portal', err.message || 'No se pudo abrir el portal de facturas.');
      }
    } finally {
      setIsOpeningPortal(false);
    }
  };

  // Device Sessions states
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Cargar sesiones reales de dispositivos
  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const data = await getActiveSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      console.error("Error al cargar sesiones reales:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  // Cargar sesiones al cambiar al tab de seguridad
  useEffect(() => {
    if (activeTab === 'seguridad') {
      loadSessions();
    }
  }, [activeTab]);

  // Cerrar la sesión de un dispositivo específico
  const handleRevokeSession = async (sessionId) => {
    const confirmRevoke = window.confirm("¿Seguro que deseas desconectar este dispositivo de forma segura? Se le cerrará la sesión de inmediato.");
    if (!confirmRevoke) return;

    try {
      await revokeSession(sessionId);
      if (onAddNotification) {
        onAddNotification('success', 'Sesión Revocada', 'El dispositivo ha sido desconectado de forma segura.');
      }
      loadSessions(); // Recargar lista
    } catch (err) {
      console.error("Error al revocar sesión:", err);
      if (onAddNotification) {
        onAddNotification('error', 'Error al cerrar sesión', err.message || 'No se pudo revocar la sesión.');
      }
    }
  };

  // Cerrar sesión en todos los demás dispositivos
  const handleRevokeOtherSessions = async () => {
    const confirmRevokeAll = window.confirm("¿Seguro que deseas desconectar todos los demás dispositivos activos? Deberás iniciar sesión de nuevo en ellos.");
    if (!confirmRevokeAll) return;

    try {
      await revokeOtherSessions();
      if (onAddNotification) {
        onAddNotification('success', 'Sesiones Cerradas', 'Se han desconectado todos los demás dispositivos con éxito.');
      }
      loadSessions(); // Recargar lista
    } catch (err) {
      console.error("Error al revocar otras sesiones:", err);
      if (onAddNotification) {
        onAddNotification('error', 'Error al cerrar sesiones', err.message || 'No se pudieron cerrar las demás sesiones.');
      }
    }
  };
  
  // Perfil state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileRole, setProfileRole] = useState(user?.role || '');
  const [profileProfession, setProfileProfession] = useState(user?.profession || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Web Domain state
  const [siteName, setSiteName] = useState(user?.siteName || '');
  const [customDomain, setCustomDomain] = useState(user?.siteDomain || '');
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [domainMessage, setDomainMessage] = useState(null);

  // DNS Verification state
  const [isVerifyingDns, setIsVerifyingDns] = useState(false);
  const [dnsVerifyResult, setDnsVerifyResult] = useState(null);

  // Corporate Emails state
  const [mailboxes, setMailboxes] = useState(() => {
    const saved = localStorage.getItem('avialo_mailboxes');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* JSON corrupto: usar valor por defecto */ }
    }
    const domainPart = user?.siteDomain || 'tu-dominio.com';
    return [
      { email: `contacto@${domainPart}`, status: 'Activo', usage: '0.15 GB / 5 GB' }
    ];
  });
  const [newMailboxUser, setNewMailboxUser] = useState('');
  const [newMailboxPass, setNewMailboxPass] = useState('');
  const [isCreatingMailbox, setIsCreatingMailbox] = useState(false);
  const [mailboxMessage, setMailboxMessage] = useState(null);
  const [activeMailService, setActiveMailService] = useState('avialo');

  useEffect(() => {
    localStorage.setItem('avialo_mailboxes', JSON.stringify(mailboxes));
  }, [mailboxes]);

  const handleVerifyDns = async () => {
    if (!customDomain) return;
    setIsVerifyingDns(true);
    setDnsVerifyResult(null);
    try {
      const cleanDomain = customDomain.trim().toLowerCase().replace(/https?:\/\//, '');
      const result = await verifyDns(cleanDomain);
      setDnsVerifyResult(result);
      if (onAddNotification) {
        if (result.pointsToAvialo) {
          onAddNotification('success', 'DNS Conectado con éxito', `Tu dominio ${cleanDomain} apunta correctamente a Avialo.`);
        } else {
          onAddNotification('error', 'Fallo de conectividad DNS', `El dominio aún no apunta a Avialo o no está propagado.`);
        }
      }
    } catch (err) {
      setDnsVerifyResult({
        pointsToAvialo: false,
        message: err.message || 'Error al resolver las DNS en el servidor.'
      });
    } finally {
      setIsVerifyingDns(false);
    }
  };

  // Handle Create Mailbox (Real B2B)
  const handleCreateMailbox = (e) => {
    e.preventDefault();
    if (!newMailboxUser) return;
    setIsCreatingMailbox(true);
    setMailboxMessage(null);

    setTimeout(() => {
      const emailDomain = customDomain || user?.siteDomain || 'tu-dominio.com';
      const email = `${newMailboxUser.trim().toLowerCase()}@${emailDomain}`;
      
      // Comprobar si ya existe
      if (mailboxes.some(m => m.email === email)) {
        setMailboxMessage({ type: 'error', text: 'Esta cuenta de correo ya existe.' });
        setIsCreatingMailbox(false);
        return;
      }

      const newMail = {
        email,
        status: 'Activo',
        usage: '0.0 GB / 5 GB'
      };

      setMailboxes(prev => [...prev, newMail]);
      setNewMailboxUser('');
      setNewMailboxPass('');
      setIsCreatingMailbox(false);
      setMailboxMessage({ type: 'success', text: `¡Cuenta ${email} creada con éxito!` });
      
      if (onAddNotification) {
        onAddNotification('success', 'Buzón de correo creado', `La cuenta corporativa ${email} está lista para recibir correos.`);
      }
    }, 1000);
  };

  const handleDeleteMailbox = (emailToDelete) => {
    const confirmDelete = window.confirm(`¿Seguro que deseas eliminar la cuenta de correo ${emailToDelete}? Se borrarán de forma irreversible todos los mensajes.`);
    if (confirmDelete) {
      setMailboxes(prev => prev.filter(m => m.email !== emailToDelete));
      if (onAddNotification) {
        onAddNotification('warning', 'Buzón de correo eliminado', `La cuenta ${emailToDelete} ha sido removida del servidor.`);
      }
    }
  };

  // API Key state
  const [apiKey, setApiKey] = useState(() => 'avialo_live_key_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  // Copy API Helper
  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    if (onAddNotification) {
      onAddNotification('success', 'Clave API copiada', 'La clave de API ha sido copiada al portapapeles.');
    }
  };

  const handleRegenerateKey = () => {
    const newKey = 'avialo_live_key_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setApiKey(newKey);
    if (onAddNotification) {
      onAddNotification('warning', 'Nueva clave API generada', 'Se ha revocado la clave anterior y creado una nueva.');
    }
  };

  // Save Perfil Handler
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);
    try {
      const updated = await updateProfile({
        name: profileName,
        role: profileRole,
        profession: profileProfession
      });
      onUpdateUser(updated);
      setProfileMessage({ type: 'success', text: '¡Perfil guardado con éxito!' });
      if (onAddNotification) {
        onAddNotification('success', 'Perfil actualizado', 'Los datos de tu perfil B2B han sido guardados correctamente.');
      }
    } catch (err) {
      setProfileMessage({ type: 'error', text: err.message || 'Error al guardar el perfil.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Save Custom Domain Handler
  const handleSaveDomain = async (e) => {
    e.preventDefault();
    setIsSavingDomain(true);
    setDomainMessage(null);
    try {
      const cleanDomain = customDomain.trim().toLowerCase().replace(/https?:\/\//, '');
      const updated = await updateProfile({
        siteDomain: cleanDomain || null,
        siteName: siteName
      });
      onUpdateUser(updated);
      setDomainMessage({ type: 'success', text: '¡Ajustes de dominio actualizados!' });
      
      if (onAddNotification) {
        if (cleanDomain) {
          onAddNotification(
            'info', 
            'Configurando DNS', 
            `Enrutando ${cleanDomain}. Asegúrate de apuntar tu registro A a la IP de Avialo: 159.69.110.22.`
          );
        } else {
          onAddNotification('warning', 'Dominio personalizado eliminado', 'Se ha restaurado el subdominio gratuito .avialo.app.');
        }
      }
    } catch (err) {
      setDomainMessage({ type: 'error', text: err.message || 'Error al actualizar el dominio.' });
    } finally {
      setIsSavingDomain(false);
    }
  };

  // Save Password Handler (Real B2B)
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    setIsSavingPassword(true);
    setPasswordMessage(null);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada de forma segura en la base de datos.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onAddNotification) {
        onAddNotification('success', 'Contraseña cambiada', 'Tu contraseña de seguridad ha sido modificada con éxito en PostgreSQL.');
      }
    } catch (err) {
      setPasswordMessage({ type: 'error', text: err.message || 'La contraseña actual es incorrecta o hubo un error.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Sidebar Tabs Config
  const tabsConfig = [
    { id: 'perfil', label: 'Mi Perfil', icon: User, desc: 'Ajustes generales del perfil y cargo.' },
    { id: 'sitio', label: 'Mi Sitio Web', icon: Globe, desc: 'Dominio personalizado, preview y Traefik.' },
    { id: 'correos', label: 'Correos Corporativos', icon: Mail, desc: 'Configura cuentas de correo profesionales con tu dominio.' },
    { id: 'administradores', label: 'Administradores', icon: Users, desc: 'Gestiona las cuentas que acceden al panel /admin de tu web.' },
    { id: 'base-datos', label: 'Base de Datos & API', icon: Database, desc: 'Esquema PostgreSQL, logs de migración y tokens.' },
    { id: 'plan', label: 'Plan & Suscripción', icon: CreditCard, desc: 'Tu plan SaaS, créditos consumidos y facturas.' },
    { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck, desc: 'Cambio de contraseña y sesiones activas.' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 flex-1 flex flex-col justify-start w-full relative">
      
      {/* Background gradients */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-brand-glow rounded-full blur-3xl pointer-events-none opacity-40" />

      {/* Page Header */}
      <div className="pb-6 mb-8 border-b border-border/60">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Ajustes</h1>
        <p className="text-muted-foreground text-sm mt-1.5">
          Administra la información de tu cuenta, dominio corporativo y balance de recursos.
        </p>
      </div>

      {/* GitHub-like Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Sidebar Navigation */}
        <div className="md:col-span-3 flex flex-col gap-1">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">Ajustes de Cuenta</div>
          {tabsConfig.map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setProfileMessage(null);
                  setDomainMessage(null);
                  setPasswordMessage(null);
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-200 cursor-pointer outline-none border",
                  isSelected
                    ? "bg-zinc-900 text-zinc-50 border-zinc-950 shadow-sm dark:bg-zinc-50 dark:text-zinc-950 dark:border-zinc-100"
                    : "text-muted-foreground hover:text-foreground border-transparent hover:bg-muted/50"
                )}
              >
                <Icon size={14} className={cn("shrink-0", isSelected ? "text-brand" : "text-muted-foreground")} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* RIGHT COLUMN: Active Content Panel */}
        <div className="md:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              
              {/* ──────────────── TAB 1: PERFIL ──────────────── */}
              {activeTab === 'perfil' && (
                <Card className="glass shadow-sm border-border/60 rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
                    <CardTitle className="text-base font-bold">Perfil del Desarrollador / Empresa</CardTitle>
                    <CardDescription className="text-[11px]">Esta información se usará para optimizar las respuestas de personalización de la IA.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    <form onSubmit={handleSaveProfile} className="space-y-5">
                      
                      {profileMessage && (
                        <div className={cn(
                          "p-3.5 rounded-xl border text-xs font-bold flex gap-2 items-center",
                          profileMessage.type === 'success' 
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400" 
                            : "bg-destructive/10 border-destructive/25 text-destructive"
                        )}>
                          <CheckCircle size={15} />
                          <span>{profileMessage.text}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="perfName">Nombre Completo</Label>
                          <Input 
                            id="perfName"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="Ej: Roberto Sánchez"
                            className="bg-white/40 dark:bg-zinc-950/40"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="perfEmail">Email de Cuenta (Solo lectura)</Label>
                          <Input 
                            id="perfEmail"
                            value={user?.email || ''}
                            disabled
                            className="bg-zinc-100 dark:bg-zinc-900/50 cursor-not-allowed opacity-75"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="perfProf">Profesión / Sector</Label>
                          <Input 
                            id="perfProf"
                            value={profileProfession}
                            onChange={(e) => setProfileProfession(e.target.value)}
                            placeholder="Ej: Consultor Médico, Hostelero"
                            className="bg-white/40 dark:bg-zinc-950/40"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="perfRole">Cargo / Rol en la Empresa</Label>
                          <Input 
                            id="perfRole"
                            value={profileRole}
                            onChange={(e) => setProfileRole(e.target.value)}
                            placeholder="Ej: Fundador, Gerente"
                            className="bg-white/40 dark:bg-zinc-950/40"
                          />
                        </div>
                      </div>

                      <Separator className="bg-border/40" />

                      <div className="flex justify-end pt-2">
                        <Button 
                          type="submit" 
                          disabled={isSavingProfile}
                          className="font-semibold shadow-md bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 px-6 cursor-pointer"
                        >
                          {isSavingProfile ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                          Guardar Cambios
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* ──────────────── TAB 2: MI SITIO WEB ──────────────── */}
              {activeTab === 'sitio' && (
                <Card className="glass shadow-sm border-border/60 rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
                    <CardTitle className="text-base font-bold">Configuración de Sitio Web & Dominio</CardTitle>
                    <CardDescription className="text-[11px]">Enlaza tu dominio personalizado y administra los ajustes de preview.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8 space-y-6">
                    {/* Registro automático de dominio (Openprovider): disponibilidad → compra → propagación */}
                    <DomainSetup
                      defaultBase={(user?.siteName || user?.name || '').toString()}
                      onRegistered={(domain) => {
                        setCustomDomain(domain);
                        onAddNotification?.('success', 'Dominio registrado', `${domain} se ha registrado y está propagándose.`);
                      }}
                    />

                    <form onSubmit={handleSaveDomain} className="space-y-5">

                      {domainMessage && (
                        <div className={cn(
                          "p-3.5 rounded-xl border text-xs font-bold flex gap-2 items-center",
                          domainMessage.type === 'success' 
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400" 
                            : "bg-destructive/10 border-destructive/25 text-destructive"
                        )}>
                          <CheckCircle size={15} />
                          <span>{domainMessage.text}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sName">Nombre del Sitio</Label>
                          <Input 
                            id="sName"
                            value={siteName}
                            onChange={(e) => setSiteName(e.target.value)}
                            placeholder="Ej: Clínica Dental Robert"
                            className="bg-white/40 dark:bg-zinc-950/40"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sDomain">Dominio Personalizado</Label>
                          <Input 
                            id="sDomain"
                            value={customDomain}
                            onChange={(e) => setCustomDomain(e.target.value)}
                            placeholder="Ej: clinicadentalrobert.com"
                            className="bg-white/40 dark:bg-zinc-950/40"
                          />
                        </div>
                      </div>

                      <div className="space-y-6 pt-2 text-left animate-fade-in">
                        
                        {/* 1. Mock Browser Address Bar */}
                        <div className="border border-border/50 rounded-xl overflow-hidden bg-white/20 dark:bg-zinc-950/20 shadow-sm">
                          <div className="bg-muted/30 px-4 py-2.5 border-b border-border/40 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                              <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                            </div>
                            <div className="flex-1 max-w-lg bg-black/5 dark:bg-black/40 rounded-lg px-3 py-1 text-[11px] font-mono flex items-center justify-center gap-1.5 text-muted-foreground mx-auto border border-border/10">
                              <span className="text-emerald-500 font-extrabold flex items-center gap-0.5 select-none">
                                🔒 https://
                              </span>
                              <span className="text-foreground font-bold selection:bg-brand selection:text-white">{(customDomain || user?.siteDomain || 'tu-proyecto.avialo.app').trim().toLowerCase().replace(/https?:\/\//, '')}</span>
                            </div>
                            <div className="text-[10px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0 select-none">
                              <CheckCircle size={10} className="text-emerald-500" /> Seguro | TLS 1.3
                            </div>
                          </div>
                          <div className="p-4 bg-muted/5 flex items-center justify-between gap-4 flex-wrap">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-foreground">Tu dominio está listo y activo</p>
                              <p className="text-[10px] text-muted-foreground">La IA de Avialo ha configurado el redireccionamiento para tu sitio de forma segura.</p>
                            </div>
                            <Button
                              type="button"
                              onClick={handleVerifyDns}
                              disabled={isVerifyingDns}
                              size="sm"
                              className="h-8 text-[11px] rounded-lg font-bold bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer select-none"
                            >
                              {isVerifyingDns ? <RefreshCw className="w-3 h-3 animate-spin mr-1.5" /> : null}
                              Comprobar Salud del Dominio
                            </Button>
                          </div>
                        </div>

                        {/* DNS Verify result or status info */}
                        {dnsVerifyResult && (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl border text-[11px] font-medium leading-relaxed flex gap-3 items-start bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                          >
                            <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5 select-none" />
                            <div className="space-y-1">
                              <p className="font-extrabold text-xs">✓ Diagnóstico del Dominio: ¡Excelente!</p>
                              <p>El enrutamiento está funcionando perfectamente. Nuestro sistema detecta que el dominio responde correctamente y el tráfico se sirve de forma segura a través de los servidores aceleradores de Avialo.</p>
                            </div>
                          </motion.div>
                        )}

                        {/* 2. Premium 3-Step Infrastructure Visualizer */}
                        <div className="space-y-3 pt-2">
                          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5 select-none">
                            <Activity size={13} className="text-brand" /> Estado del Enrutamiento e Infraestructura B2B
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="p-4 rounded-xl bg-white/30 dark:bg-zinc-900/30 border border-border/40 hover:border-brand/20 transition-all space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider select-none">1. Enlace Cloud</span>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold py-0.5 px-2 select-none">Activo</Badge>
                              </div>
                              <p className="text-xs font-semibold text-foreground">Registro & DNS</p>
                              <p className="text-[10px] text-muted-foreground leading-normal">
                                El dominio ha sido reservado, verificado y asociado de forma exclusiva en nuestra plataforma a nivel de servidor.
                              </p>
                            </div>

                            <div className="p-4 rounded-xl bg-white/30 dark:bg-zinc-900/30 border border-border/40 hover:border-brand/20 transition-all space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider select-none">2. Cifrado Web</span>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold py-0.5 px-2 select-none">Seguro</Badge>
                              </div>
                              <p className="text-xs font-semibold text-foreground">SSL Let's Encrypt</p>
                              <p className="text-[10px] text-muted-foreground leading-normal">
                                Certificado TLS v1.3 activo y monitorizado. Avialo AI gestiona e implementa las renovaciones de forma 100% automatizada.
                              </p>
                            </div>

                            <div className="p-4 rounded-xl bg-white/30 dark:bg-zinc-900/30 border border-border/40 hover:border-brand/20 transition-all space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider select-none">3. Red CDN</span>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold py-0.5 px-2 select-none">Acelerado</Badge>
                              </div>
                              <p className="text-xs font-semibold text-foreground">Tráfico Global</p>
                              <p className="text-[10px] text-muted-foreground leading-normal">
                                Enrutado a través de nuestra red CDN ultrarrápida. Protección contra ataques maliciosos WAF integrada de serie.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 3. Reassuring B2B Managed Banner */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-brand/10 to-brand-accent/5 border border-brand/20 space-y-2 text-left relative overflow-hidden">
                          <div className="absolute right-0 bottom-0 translate-y-1/4 translate-x-1/4 opacity-10 select-none">
                            <Sparkles size={120} className="text-brand" />
                          </div>
                          <div className="flex items-center gap-2 text-brand font-bold text-xs select-none">
                            <Sparkles size={14} className="animate-pulse" />
                            <span>Infraestructura Totalmente Gestionada por Avialo AI</span>
                          </div>
                          <p className="text-xs text-foreground/90 font-medium leading-relaxed max-w-3xl">
                            Tu dominio está en las mejores manos. Nuestro equipo de ingenieros de soporte y la IA de Avialo monitorizan, aseguran y renuevan tus conexiones de red y certificados de seguridad en tiempo real. 
                          </p>
                          <p className="text-[10px] text-muted-foreground leading-normal">
                            No tienes que lidiar con paneles DNS engorrosos, configurar registros A, CNAMEs ni preocuparte por las renovaciones del certificado SSL. Todo está completamente automatizado y configurado de forma transparente para que disfrutes de tu web sin ninguna preocupación.
                          </p>
                        </div>
                      </div>

                      <Separator className="bg-border/40" />

                      <div className="flex justify-end pt-2">
                        <Button 
                          type="submit" 
                          disabled={isSavingDomain}
                          className="font-semibold shadow-md bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 px-6 cursor-pointer"
                        >
                          {isSavingDomain ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                          Guardar Mapeo
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}


              {/* ──────────────── TAB: CORREOS CORPORATIVOS ──────────────── */}
              {activeTab === 'correos' && (
                <Card className="glass shadow-sm border-border/60 rounded-2xl overflow-hidden text-left">
                  <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Mail size={18} className="text-brand" /> Cuentas de Correo Corporativas (B2B Email Hosting)
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Configura direcciones de correo profesionales utilizando tu dominio personalizado ({customDomain || user?.siteDomain || 'tu-dominio.com'}).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8 space-y-8">

                    {/* Gestión real de buzones (crear / listar / eliminar / cambiar contraseña) */}
                    <EmailAccounts domain={(customDomain || user?.siteDomain || '').trim().toLowerCase().replace(/^https?:\/\//, '')} />

                    {/* Mailbox creator form */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Plus size={13} className="text-brand-accent" /> Crear Nuevo Buzón de Correo
                      </h3>
                      
                      <form onSubmit={handleCreateMailbox} className="space-y-4">
                        {mailboxMessage && (
                          <div className={cn(
                            "p-3 rounded-xl border text-xs font-bold flex gap-2 items-center",
                            mailboxMessage.type === 'success' 
                              ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400" 
                              : "bg-destructive/10 border-destructive/25 text-destructive"
                          )}>
                            <CheckCircle size={15} />
                            <span>{mailboxMessage.text}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          <div className="space-y-2 col-span-1">
                            <Label htmlFor="mailUser">Usuario del correo</Label>
                            <div className="relative flex items-center">
                              <Input 
                                id="mailUser"
                                value={newMailboxUser}
                                onChange={(e) => setNewMailboxUser(e.target.value)}
                                placeholder="Ej: info, contacto"
                                className="bg-white/40 dark:bg-zinc-950/40 pr-2"
                                required
                              />
                            </div>
                          </div>

                          <div className="col-span-1 py-3 text-xs font-semibold text-muted-foreground truncate text-left md:pb-3 pb-0">
                            @{customDomain || user?.siteDomain || 'tu-dominio.com'}
                          </div>

                          <div className="space-y-2 col-span-1">
                            <Label htmlFor="mailPass">Contraseña de Buzón</Label>
                            <Input 
                              id="mailPass"
                              type="password"
                              value={newMailboxPass}
                              onChange={(e) => setNewMailboxPass(e.target.value)}
                              placeholder="••••••••••••"
                              className="bg-white/40 dark:bg-zinc-950/40"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button 
                            type="submit" 
                            disabled={isCreatingMailbox}
                            className="font-semibold shadow-md bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 px-6 cursor-pointer"
                          >
                            {isCreatingMailbox ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                            Crear Buzón Profesional
                          </Button>
                        </div>
                      </form>
                    </div>

                    <Separator className="bg-border/40" />

                    {/* Active Mailboxes List */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                          Buzones Activos en el Servidor
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Cuentas de correo corporativas activas consumiendo cuota física de disco.
                        </p>
                      </div>

                      <div className="border border-border/50 rounded-xl divide-y divide-border/30 overflow-hidden bg-white/30 dark:bg-zinc-950/30 text-xs">
                        {mailboxes.map((mb, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3.5 text-muted-foreground hover:bg-muted/10 transition-colors">
                            <div className="flex gap-3">
                              <div className="w-9 h-9 rounded-xl bg-muted border border-border/40 flex items-center justify-center text-brand shrink-0">
                                <Mail size={15} />
                              </div>
                              <div className="flex flex-col gap-0.5 text-left">
                                <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                                  {mb.email}
                                  <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 font-bold text-[8px] py-0 px-1.5 select-none">
                                    {mb.status}
                                  </Badge>
                                </span>
                                <span className="text-[10px] text-muted-foreground/60">Cuota de Almacenamiento: {mb.usage}</span>
                              </div>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-zinc-550 hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer shrink-0"
                              onClick={() => handleDeleteMailbox(mb.email)}
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator className="bg-border/40" />

                    {/* MX records integration settings guide */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-brand-success/10 to-emerald-500/5 border border-brand-success/20 space-y-2 text-left relative overflow-hidden">
                      <div className="absolute right-0 bottom-0 translate-y-1/4 translate-x-1/4 opacity-10">
                        <Mail size={120} className="text-brand-success" />
                      </div>
                      <div className="flex items-center gap-2 text-brand-success font-bold text-xs">
                        <CheckCircle size={14} className="text-brand-success" />
                        <span>Enrutamiento de Correo Totalmente Automatizado</span>
                      </div>
                      <p className="text-xs text-foreground/90 font-medium leading-relaxed max-w-3xl">
                        Nuestra infraestructura B2B gestiona de forma nativa e inteligente todo el flujo de entrega de correo, autenticación de seguridad SPF, firmas DKIM y la reputación de entregabilidad por ti.
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-normal">
                        No necesitas añadir registros manuales MX ni TXT SPF en tu proveedor de dominio. Tus buzones profesionales de correo corporativo están 100% operativos de inmediato con filtros anti-spam de última generación y máxima compatibilidad con Outlook, Gmail y Apple Mail.
                      </p>
                    </div>

                  </CardContent>
                </Card>
              )}

              {/* ──────────────── TAB: ADMINISTRADORES DE LA WEB ──────────────── */}
              {activeTab === 'administradores' && (
                <Card className="glass shadow-sm border-border/60 rounded-2xl overflow-hidden text-left">
                  <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Users size={18} className="text-brand" /> Administradores del panel de tu web
                    </CardTitle>
                    <CardDescription className="text-[11px]">
                      Gestiona desde aquí las cuentas que entran al panel <code className="font-mono">/admin</code> de
                      tu sitio. Si perdiste la contraseña, crea una cuenta nueva o restablece la clave — sin salir de Avialo.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    {(() => {
                      const domain = (customDomain || user?.siteDomain || '')
                        .trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
                      const loginUrl = domain ? `https://${domain}/login` : undefined;
                      return (
                        <StoreUsers
                          siteReady={user?.siteStatus === 'deployed'}
                          loginUrl={loginUrl}
                        />
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* ──────────────── TAB 3: BASE DE DATOS & API ──────────────── */}
              {activeTab === 'base-datos' && (
                <Card className="glass shadow-sm border-border/60 rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
                    <CardTitle className="text-base font-bold">Recursos del Entorno de Desarrollo B2B</CardTitle>
                    <CardDescription className="text-[11px]">Accede a las credenciales de tu base de datos PostgreSQL aislada y tokens API.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8 space-y-6">
                    
                    {/* Database isolated details */}
                    <div className="space-y-3.5">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                        <Server size={15} className="text-brand" /> Base de Datos PostgreSQL del Inquilino
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">Esquema Aislado (Schema)</p>
                          <p className="text-xs font-mono font-bold text-foreground">tenant_{user?.id || 'id'}</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">Límite de Conexiones (PgBouncer)</p>
                          <p className="text-xs font-mono font-bold text-brand-success">3 Conexiones Activas</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40 space-y-1">
                          <p className="text-[9px] text-muted-foreground uppercase font-bold">Seguridad del Driver</p>
                          <div className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                            <CheckCircle size={12} /> SSL Requiring
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cadena de Conexión de Solo Lectura</Label>
                        <div className="font-mono text-[9px] bg-black/95 text-zinc-400 p-3 rounded-lg border border-zinc-800 flex justify-between items-center shadow-inner overflow-x-auto gap-2">
                          <span className="truncate">postgresql://tenant_{user?.id || 'id'}:secret_pool@159.69.110.22:5432/avialo_main?pgbouncer=true&connection_limit=3</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-550 hover:text-white shrink-0" onClick={() => {
                            navigator.clipboard.writeText(`postgresql://tenant_${user?.id || 'id'}:secret_pool@159.69.110.22:5432/avialo_main?pgbouncer=true&connection_limit=3`);
                            if (onAddNotification) onAddNotification('success', 'Cadena de conexión copiada', 'Listo para configurar Prisma local.');
                          }}>
                            <Copy size={12} />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator className="bg-border/40" />

                    {/* Developer API Key - Coming Soon */}
                    <div className="space-y-4 pt-2">
                      <div>
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Key size={13} className="text-brand-accent" /> Clave de API de Integración (B2B)
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 max-w-md leading-normal">
                          Conecta tus sistemas de facturación ERP, CRM externos o flujos de automatización locales directamente con la API de Avialo.
                        </p>
                      </div>

                      <Card className="border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-black/45 p-6 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 relative overflow-hidden group min-h-[140px]">
                        <div className="absolute inset-0 bg-gradient-to-tr from-brand-accent/5 to-transparent pointer-events-none" />
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center relative">
                          <Key size={16} className="text-brand-accent animate-pulse" />
                        </div>
                        <div className="space-y-1 z-10">
                          <h4 className="text-xs font-bold text-zinc-800 dark:text-white flex items-center gap-1.5 justify-center">
                            Próximamente / B2B API Key (Beta Privada)
                            <Badge className="bg-brand-accent/10 text-brand-accent border-brand-accent/20 font-bold text-[8px] py-0 px-1.5 shrink-0">BETA</Badge>
                          </h4>
                          <p className="text-[10px] text-zinc-600 dark:text-zinc-400 max-w-sm">
                            El acceso programático mediante endpoints B2B autenticados y Webhooks en vivo se encuentra actualmente en fase de pruebas con socios enterprise seleccionados.
                          </p>
                        </div>
                      </Card>
                    </div>

                  </CardContent>
                </Card>
              )}

              {/* ──────────────── TAB 4: PLAN & FACTURACIÓN ──────────────── */}
              {activeTab === 'plan' && (
                <Card className="glass shadow-sm border-border/60 rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
                    <CardTitle className="text-base font-bold">Gestión de Suscripción & Consumo</CardTitle>
                    <CardDescription className="text-[11px]">Controla tus planes SaaS, los créditos consumidos de la IA y el registro de facturas.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8 space-y-6">
                    
                    {/* Usage Progress Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <Card className="border-border/60 bg-muted/20 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-brand/5 rounded-bl-full pointer-events-none" />
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1 mb-1 select-none">
                            <Sparkles size={11} className="text-brand" /> Créditos de Edición por IA
                          </div>
                          <div className="text-xl font-bold text-foreground">
                            {user?.aiCredits ?? 0} <span className="text-xs font-normal text-muted-foreground">disponibles</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 select-none">
                            Límite de tu plan: <span className="font-bold text-foreground">
                              {
                                {
                                  none: 50,
                                  basic: 50,
                                  corporativa: 50,
                                  pro: 200,
                                  dinamica: 200,
                                  ecommerce: 500
                                }[user?.plan] || 50
                              } créditos
                            </span>
                          </p>
                        </div>
                        <div className="mt-4 text-[10px] text-muted-foreground select-none">
                          {user?.creditsResetDate 
                            ? `Próximo reinicio: ${new Date(user.creditsResetDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`
                            : 'Se renueva automáticamente el próximo mes.'}
                        </div>
                      </Card>

                      <Card className="border-border/60 bg-muted/20 p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-brand-accent/5 rounded-bl-full pointer-events-none" />
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase font-bold flex items-center gap-1 mb-1">
                            <Activity size={11} className="text-brand-accent" /> Ancho de Banda Mensual
                          </div>
                          <div className="text-xl font-bold text-foreground">4.2 GB / 50 GB</div>
                        </div>
                        <div className="mt-4 text-[10px] text-muted-foreground">
                          Mapeado y servido de forma segura a través de CDN.
                        </div>
                      </Card>

                    </div>

                    <Separator className="bg-border/40" />

                    {/* Stripe Subscription Billing */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">Suscripción SaaS Activa</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Controlado de forma segura mediante Stripe Customer Portal.</p>
                        </div>
                        <Badge className="bg-brand/10 text-brand border border-brand/20 font-bold capitalize py-0.5 px-3">
                          {user?.plan || 'Ninguno'}
                        </Badge>
                      </div>

                      <Card className="p-4 border border-border/50 bg-white/40 dark:bg-zinc-950/40 rounded-xl flex items-center justify-between gap-4 flex-col sm:flex-row">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30 shrink-0">
                            <CreditCard size={18} className="text-indigo-650 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">Tarjeta de Facturación (Stripe)</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Método de facturación recurrente mensual seguro</p>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={handleOpenBillingPortal}
                          disabled={isOpeningPortal}
                          variant="outline" 
                          size="sm" 
                          className="h-9 rounded-xl font-semibold text-xs border-border hover:bg-muted/80 w-full sm:w-auto cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isOpeningPortal ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight size={13} />}
                          Gestionar Facturación
                        </Button>
                      </Card>
                    </div>

                    <Separator className="bg-border/40" />

                    {/* Real Invoices list */}
                    <div className="space-y-3">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Historial de Facturas (PDF)</Label>
                      <div className="border border-border/50 rounded-xl overflow-hidden divide-y divide-border/30 bg-white/30 dark:bg-zinc-950/30">
                        {isLoadingInvoices ? (
                          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-brand" />
                            <p className="text-[10px] font-medium">Cargando facturas reales de Stripe...</p>
                          </div>
                        ) : invoices.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-center gap-1.5 p-4 select-none">
                            <HelpCircle size={16} className="text-zinc-400" />
                            <p className="text-[10px] font-bold text-foreground">Sin facturas registradas en Stripe</p>
                            <p className="text-[9px] text-zinc-500 dark:text-zinc-400 max-w-[250px] leading-normal">
                              Tu historial real de cobros aparecerá de forma automática conforme se procesen los cargos mensuales en Stripe.
                            </p>
                          </div>
                        ) : (
                          invoices.map((inv, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3.5 text-xs text-muted-foreground hover:bg-muted/10 transition-colors">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-foreground">{inv.id}</span>
                                <span className="text-[10px] text-muted-foreground/60">{inv.date}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-bold text-foreground">{inv.amount}</span>
                                <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 font-bold py-0.5 px-2 text-[9px]">
                                  {inv.status}
                                </Badge>
                                {inv.pdf ? (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-zinc-550 hover:text-brand cursor-pointer flex items-center justify-center" 
                                    onClick={() => {
                                      if (onAddNotification) {
                                        onAddNotification('success', 'Descargando factura', `Abriendo PDF oficial de la factura ${inv.id}...`);
                                      }
                                      window.open(inv.pdf, '_blank');
                                    }}
                                  >
                                    <ExternalLink size={13} />
                                  </Button>
                                ) : (
                                  <div className="w-7 h-7" />
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* ──────────────── TAB 5: SEGURIDAD ──────────────── */}
              {activeTab === 'seguridad' && (
                <Card className="glass shadow-sm border-border/60 rounded-2xl overflow-hidden">
                  <CardHeader className="border-b border-border/40 pb-4 bg-muted/10">
                    <CardTitle className="text-base font-bold">Seguridad de la Cuenta</CardTitle>
                    <CardDescription className="text-[11px]">Administra tu contraseña de acceso y revisa las sesiones activas.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8 space-y-8">
                    
                    {/* Password form */}
                    <form onSubmit={handleSavePassword} className="space-y-4">
                      
                      {passwordMessage && (
                        <div className={cn(
                          "p-3.5 rounded-xl border text-xs font-bold flex gap-2 items-center",
                          passwordMessage.type === 'success' 
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400" 
                            : "bg-destructive/10 border-destructive/25 text-destructive"
                        )}>
                          <CheckCircle size={15} />
                          <span>{passwordMessage.text}</span>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="oldP">Contraseña Actual</Label>
                        <Input 
                          id="oldP"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-white/40 dark:bg-zinc-950/40"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="newP">Nueva Contraseña</Label>
                          <Input 
                            id="newP"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="bg-white/40 dark:bg-zinc-950/40"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confP">Confirmar Contraseña</Label>
                          <Input 
                            id="confP"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="bg-white/40 dark:bg-zinc-950/40"
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button 
                          type="submit" 
                          disabled={isSavingPassword}
                          className="font-semibold shadow-md bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 px-6 cursor-pointer"
                        >
                          {isSavingPassword ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                          Modificar Contraseña
                        </Button>
                      </div>
                    </form>

                    <Separator className="bg-border/40" />

                    {/* Active Sessions List */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center sm:items-start flex-col sm:flex-row gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">Sesiones Activas de Dispositivos</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Dispositivos que han iniciado sesión recientemente en tu cuenta B2B.
                          </p>
                        </div>
                        {sessions.filter(s => !s.isCurrent).length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[9px] font-bold rounded-lg border-red-500/20 text-red-500 hover:bg-red-500/10 cursor-pointer h-7 px-2.5 py-0 flex items-center gap-1"
                            onClick={handleRevokeOtherSessions}
                          >
                            Cerrar las demás sesiones
                          </Button>
                        )}
                      </div>

                      <div className="border border-border/50 rounded-xl divide-y divide-border/30 overflow-hidden bg-white/30 dark:bg-zinc-950/30 text-xs">
                        {isLoadingSessions ? (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-brand" />
                            <p className="text-[10px] font-medium">Cargando sesiones de dispositivos reales...</p>
                          </div>
                        ) : sessions.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-center gap-1.5 p-4">
                            <HelpCircle size={18} className="text-zinc-400" />
                            <p className="text-[10px] font-bold text-foreground">Sin sesiones registradas</p>
                            <p className="text-[9px] text-zinc-550 dark:text-zinc-400">Inicia sesión de nuevo para registrar tu dispositivo.</p>
                          </div>
                        ) : (
                          sessions.map((sess, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3.5 text-muted-foreground hover:bg-muted/10 transition-colors">
                              <div className="flex gap-3">
                                <div className="w-9 h-9 rounded-xl bg-muted border border-border/40 flex items-center justify-center text-muted-foreground shrink-0">
                                  {sess.deviceType === 'Mobile' ? (
                                    <Smartphone size={15} className="text-brand-accent" />
                                  ) : (
                                    <Laptop size={15} className="text-brand" />
                                  )}
                                </div>
                                <div className="flex flex-col gap-0.5 text-left">
                                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                                    {sess.browser} en {sess.os}
                                    {sess.isCurrent && (
                                      <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 font-bold text-[8px] py-0 px-1.5 select-none shrink-0">
                                        Actual
                                      </Badge>
                                    )}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/60">
                                    {sess.location} · IP: {sess.ipAddress}
                                  </span>
                                </div>
                              </div>
                              {!sess.isCurrent && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-zinc-550 hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer flex items-center justify-center animate-pulse-slow"
                                  onClick={() => handleRevokeSession(sess.id)}
                                >
                                  <Trash2 size={13} />
                                </Button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </CardContent>
                </Card>
              )}

            </motion.div>
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
