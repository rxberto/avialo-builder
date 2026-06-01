import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
// LandingPage y Navbar se cargan eager: son la entrada pública (LCP/SEO).
import LandingPage from './components/LandingPage';
import Navbar from './components/layout/Navbar';
import NotificationsModal from './components/NotificationsModal';
// El resto de rutas (auth, panel, IDE) se cargan bajo demanda (code-splitting).
const LoginPage = lazy(() => import('./components/LoginPage'));
const RegisterPage = lazy(() => import('./components/RegisterPage'));
const UserOnboarding = lazy(() => import('./components/UserOnboarding'));
const DashboardPage = lazy(() => import('./components/DashboardPage'));
const OnboardingFlow = lazy(() => import('./components/onboarding/OnboardingFlow'));
const CheckoutPage = lazy(() => import('./components/CheckoutPage'));
const JobProgressPage = lazy(() => import('./components/JobProgressPage'));
const IDEPage = lazy(() => import('./components/IDEPage'));
const GoogleOnboarding = lazy(() => import('./components/GoogleOnboarding'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const IAInfoPage = lazy(() => import('./components/IAInfoPage'));
import { createJob, getProfile, updateProfile } from './lib/api';
import { readStoredJSON } from './lib/utils';

// Fallback mientras se descarga el chunk de una ruta diferida
const RouteFallback = () => (
  <div className="flex-1 flex items-center justify-center py-32">
    <Loader2 className="w-8 h-8 animate-spin text-brand" />
  </div>
);

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser]               = useState(() => readStoredJSON('avialo_user', null));
  const [clientData, setClientData]   = useState(null);
  const [jobId, setJobId]             = useState(null);
  const [jobError, setJobError]       = useState(null);
  const [darkMode, setDarkMode]       = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Real Notifications State
  const [notifications, setNotifications] = useState(() => {
    const saved = readStoredJSON('avialo_notifications', null);
    if (saved) return saved;
    return [
      {
        id: 'welcome',
        type: 'info',
        title: '¡Bienvenido a Avialo!',
        message: 'Tu espacio de trabajo dedicado multi-tenant ha sido aprovisionado.',
        time: new Date().toISOString(),
        read: false
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('avialo_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const handleAddNotification = (type, title, message) => {
    const newNotif = {
      id: Date.now().toString(),
      type,
      title,
      message,
      time: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleMarkNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDeleteNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
  };

  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);

  // Sincronizar el perfil del usuario en tiempo real con PostgreSQL
  const syncProfile = useCallback(async (currentUser) => {
    const activeUser = currentUser || readStoredJSON('avialo_user', null);
    if (activeUser && activeUser.token) {
      try {
        const profile = await getProfile();
        
        // Prevent accidental downgrade if the Stripe webhook hasn't processed yet
        if (activeUser.plan && activeUser.plan !== 'none' && profile.plan === 'none') {
          profile.plan = activeUser.plan;
        }
        
        const syncedUser = { ...activeUser, ...profile };
        setUser(syncedUser);
        localStorage.setItem('avialo_user', JSON.stringify(syncedUser));
        localStorage.setItem('avialo_plan', profile.plan || 'none');
        return syncedUser;
      } catch (err) {
        console.warn('⚠️ No se pudo sincronizar el perfil con el backend:', err);
      }
    }
    return activeUser;
  }, []);

  useEffect(() => {
    syncProfile();
  }, [syncProfile]);

  // Escuchar retorno de Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const selectedPlan = localStorage.getItem('avialo_selected_plan');

    if (payment === 'success' && user) {
      const plan = selectedPlan || 'pro';
      const updatedUser = { ...user, plan };
      setUser(updatedUser);
      localStorage.setItem('avialo_user', JSON.stringify(updatedUser));
      localStorage.setItem('avialo_plan', plan);
      localStorage.removeItem('avialo_selected_plan');
      
      // Guardar de forma persistente en la base de datos de PostgreSQL real
      updateProfile({ plan }).then((updatedProfile) => {
        // Sincronizar inmediatamente para obtener el balance y fecha de reinicio calculada
        setUser(prev => ({ ...prev, ...updatedProfile }));
        localStorage.setItem('avialo_user', JSON.stringify({ ...updatedUser, ...updatedProfile }));
      }).catch(err => console.error('⚠️ Error al registrar plan real de Stripe en la base de datos:', err));
      
      window.history.replaceState({}, '', window.location.pathname);
      navigate('/dashboard');
    } else if (payment === 'cancel') {
      window.history.replaceState({}, '', window.location.pathname);
      navigate('/dashboard');
    }
  }, [user]);

  // Aplicar tema oscuro/claro
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleLogin = (loggedInUser, isNewGoogleUser = false) => {
    setUser(loggedInUser);
    localStorage.setItem('avialo_user', JSON.stringify(loggedInUser));
    handleAddNotification('success', 'Sesión iniciada', `Conexión segura como ${loggedInUser.name || loggedInUser.email}.`);

    // Admin va directo al panel, nunca al flujo SaaS
    if (loggedInUser.role === 'admin') {
      navigate('/admin');
      return;
    }
    
    // Validar si tiene onboarding completo o si es un registro nuevo de Google
    if (isNewGoogleUser) {
      navigate('/google-onboarding');
    } else if (!loggedInUser.profession || !loggedInUser.role) {
      navigate('/user-onboarding');
    } else if (!loggedInUser.plan || loggedInUser.plan === 'none') {
      const selectedPlan = localStorage.getItem('avialo_selected_plan') || 'pro';
      setClientData({
        businessContext: { name: 'Suscripción SaaS Avialo' },
        websiteArchitecture: { type: selectedPlan === 'basic' ? 'corporativa' : selectedPlan }
      });
      navigate('/checkout');
    } else {
      navigate('/dashboard');
    }
  };

  const handleRegister = (registeredUser, isNewGoogleUser = false) => {
    setUser(registeredUser);
    localStorage.setItem('avialo_user', JSON.stringify(registeredUser));
    handleAddNotification('success', 'Cuenta creada', '¡Bienvenido a Avialo! Perfil inicializado con éxito.');
    
    if (isNewGoogleUser) {
      navigate('/google-onboarding');
    } else {
      // Obligar a ir a Onboarding de Usuario
      navigate('/user-onboarding');
    }
  };

  const handleUserOnboardingComplete = (data) => {
    // Guardar todas las respuestas recopiladas en la sesión del usuario
    const updatedUser = { 
      ...user, 
      plan: 'none', 
      profession: data.profession, 
      role: data.role 
    };
    setUser(updatedUser);
    localStorage.setItem('avialo_user', JSON.stringify(updatedUser));
    localStorage.setItem('avialo_selected_plan', data.plan);

    // Mandar a pasarela
    setClientData({
      businessContext: { name: 'Suscripción SaaS Avialo' },
      websiteArchitecture: { type: data.plan === 'basic' ? 'corporativa' : data.plan }
    });
    navigate('/checkout');
  };

  const handleLogout = () => {
    setUser(null);
    setClientData(null);
    setJobId(null);
    localStorage.removeItem('avialo_user');
    localStorage.removeItem('avialo_plan');
    localStorage.removeItem('avialo_current_site');
    localStorage.removeItem('avialo_selected_plan');
    navigate('/');
  };

  // Al completar Onboarding de la web
  const handleOnboardingComplete = async (onboardingData) => {
    setClientData(onboardingData);
    navigate('/progress');
    setJobError(null);

    const cleanDomain = onboardingData.customDomain?.trim().toLowerCase().replace(/https?:\/\//, '') || '';
    const finalDomain = cleanDomain || `${onboardingData.businessContext.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.avialo.app`;

    const newSite = {
      businessName: onboardingData.businessContext.name,
      webType: onboardingData.websiteArchitecture.type,
      dominio: finalDomain,
      jobId: null
    };

    // Pre-guardar el nombre del sitio y el dominio en PostgreSQL para consistencia inmediata
    try {
      await updateProfile({
        siteName: onboardingData.businessContext.name,
        siteDomain: finalDomain
      });
    } catch (err) {
      console.warn('⚠️ No se pudo pre-guardar el dominio en PostgreSQL:', err);
    }

    handleAddNotification('info', 'Compilación Iniciada', `El agente Avialo IA está construyendo tu sitio "${onboardingData.businessContext.name}".`);
    
    if (cleanDomain) {
      handleAddNotification('success', 'Dominio configurado', `Tu sitio se desplegará en tu dominio personalizado: ${cleanDomain}.`);
    } else {
      handleAddNotification('warning', 'Dominio temporal asignado', `Tu sitio se desplegará en ${finalDomain}. Añade un dominio personalizado propio en Ajustes.`);
    }

    try {
      let finalPayload = { ...onboardingData };
      try {
        const billingStr = localStorage.getItem('avialo_billing_data');
        if (billingStr) {
          finalPayload.billingData = JSON.parse(billingStr);
        }
      } catch { /* datos de facturación corruptos: continuar sin ellos */ }

      const result = await createJob(finalPayload);
      setJobId(result.jobId);
      newSite.jobId = result.jobId;
      localStorage.setItem('avialo_current_site', JSON.stringify(newSite));
      
      // Sincronizar de inmediato para reflejar el estado "pending" en el perfil local
      await syncProfile();
    } catch (err) {
      setJobError(err.message || 'Error al conectar con el orquestador.');
    }
  };

  // Saltar pago (DEV Mode)
  const handleSkipPayment = async () => {
    const selectedPlan = localStorage.getItem('avialo_selected_plan') || 'pro';
    try {
      // Guardar el plan simulado en la base de datos de PostgreSQL
      await updateProfile({ plan: selectedPlan });
      
      const updatedUser = { ...user, plan: selectedPlan };
      setUser(updatedUser);
      localStorage.setItem('avialo_user', JSON.stringify(updatedUser));
      localStorage.setItem('avialo_plan', selectedPlan);
      localStorage.removeItem('avialo_selected_plan');
      navigate('/dashboard');
    } catch (err) {
      console.error('⚠️ No se pudo guardar el plan simulado en la base de datos:', err);
    }
  };

  const handleReset = async () => {
    await syncProfile();
    navigate('/dashboard');
    setJobId(null);
    setJobError(null);
  };



  const isIDERoute = location.pathname === '/ide';

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {!isIDERoute && (
        <Navbar
          darkMode={darkMode}
          toggleTheme={toggleTheme}
          user={user}
          onLogout={handleLogout}
          onNavigate={(path) => navigate(path === 'landing' ? '/' : `/${path}`)}
          notifications={notifications}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onOpenNotifications={() => setIsNotificationsModalOpen(true)}
        />
      )}

      <main className={`flex-1 flex flex-col relative z-0 ${isIDERoute ? '' : 'pt-16'}`}>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Landing pública */}
          <Route path="/" element={<LandingPage onNavigate={(path) => navigate(path === '' ? '/' : `/${path}`)} />} />
          <Route path="/creditos" element={<IAInfoPage onNavigate={(path) => navigate(path === '' ? '/' : `/${path}`)} />} />

          {/* Rutas sin sesión */}
          <Route path="/login" element={
            <RequireNoAuth user={user}>
              <LoginPage onLogin={handleLogin} />
            </RequireNoAuth>
          } />
          
          <Route path="/register" element={
            <RequireNoAuth user={user}>
              <RegisterPage onRegister={handleRegister} />
            </RequireNoAuth>
          } />

          {/* Rutas con sesión + Protección de Onboarding SaaS estricto */}
          <Route path="/user-onboarding" element={
            <RequireAuth user={user} location={location}>
              <UserOnboarding onComplete={handleUserOnboardingComplete} />
            </RequireAuth>
          } />

          <Route path="/google-onboarding" element={
            <RequireAuth user={user} location={location}>
              <GoogleOnboarding user={user} onUpdateUser={(updated) => {
                setUser(updated);
                localStorage.setItem('avialo_user', JSON.stringify(updated));
              }} />
            </RequireAuth>
          } />

          <Route path="/dashboard" element={
            <RequireAuth user={user} location={location}>
              <DashboardPage
                user={user}
                onLogout={handleLogout}
                onCreateNewSite={() => navigate('/onboarding')}
                onOpenSiteIDE={(site) => {
                  setJobId(site.jobId);
                  navigate('/ide');
                }}
                onOpenProgress={(jid) => {
                  setJobId(jid);
                  navigate('/progress');
                }}
                onUpdateUser={(updated) => {
                  setUser(updated);
                  localStorage.setItem('avialo_user', JSON.stringify(updated));
                }}
                onAddNotification={handleAddNotification}
              />
            </RequireAuth>
          } />

          <Route path="/onboarding" element={
            <RequireAuth user={user} location={location}>
              <OnboardingFlow user={user} onComplete={handleOnboardingComplete} onSyncProfile={syncProfile} />
            </RequireAuth>
          } />

          <Route path="/settings" element={
            <RequireAuth user={user} location={location}>
              <SettingsPage 
                user={user} 
                onUpdateUser={(updated) => {
                  setUser(updated);
                  localStorage.setItem('avialo_user', JSON.stringify(updated));
                }}
                onAddNotification={handleAddNotification}
              />
            </RequireAuth>
          } />

          <Route path="/checkout" element={
            <RequireAuth user={user} location={location}>
              <CheckoutPage
                clientData={clientData}
                onSkipPayment={handleSkipPayment}
                onPreRedirect={() => {}}
              />
            </RequireAuth>
          } />

          <Route path="/progress" element={
            <RequireAuth user={user} location={location}>
              <JobProgressPage
                jobId={jobId}
                clientData={clientData}
                error={jobError}
                onReset={handleReset}
                onSyncProfile={() => syncProfile()}
                onAddNotification={handleAddNotification}
              />
            </RequireAuth>
          } />

          <Route path="/ide" element={
            <RequireAuth user={user} location={location}>
              <IDEPage
                jobId={jobId}
                user={user}
                onReset={handleReset}
                onSyncProfile={syncProfile}
                onUpdateUser={setUser}
                darkMode={darkMode}
                toggleTheme={toggleTheme}
              />
            </RequireAuth>
          } />

          {/* Admin — role=admin va directo aquí, sin acceso a rutas normales */}
          <Route path="/admin" element={
            !user ? <Navigate to="/login" replace /> :
            user.role === 'admin' ? <AdminPage user={user} onLogout={handleLogout} /> :
            <Navigate to="/dashboard" replace />
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </main>

      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onDeleteNotification={handleDeleteNotification}
        onClearAll={handleClearAllNotifications}
      />
    </div>
  );
}

// Guardias de seguridad para flujos SaaS estrictos
const RequireAuth = ({ children, user, location }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin NUNCA entra al flujo normal — siempre al panel admin
  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  // Si está logueado pero no ha completado el Onboarding de Usuario, forzar a ir allí
  if ((!user.profession || !user.role) && location.pathname !== '/user-onboarding' && location.pathname !== '/google-onboarding') {
    return <Navigate to="/user-onboarding" replace />;
  }

  // Si tiene Onboarding completo pero no ha pagado, forzar a ir a Checkout
  if (user.profession && user.role && (!user.plan || user.plan === 'none') && location.pathname !== '/checkout' && location.pathname !== '/user-onboarding') {
    return <Navigate to="/checkout" replace />;
  }

  return children;
};

const RequireNoAuth = ({ children, user }) => {
  return !user ? children : <Navigate to="/dashboard" replace />;
};

export default App;