import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken() {
  try {
    const u = JSON.parse(localStorage.getItem('avialo_user') || '{}');
    return u.token || '';
  } catch { return ''; }
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` };
}

const PLAN_OPTIONS = ['none', 'basic', 'pro', 'enterprise'];

export default function AdminPage({ user, onLogout }) {
  const navigate = useNavigate();

  // Redirect if not admin
  useEffect(() => {
    if (!user || user.role !== 'admin') navigate('/login', { replace: true });
  }, [user, navigate]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [editCredits, setEditCredits] = useState({});
  const [confirmModal, setConfirmModal] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', email: '', password: '', plan: 'pro', aiCredits: 1500, profession: ''
  });
  const [creating, setCreating] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al cargar usuarios');
      const data = await res.json();
      setUsers(data.users);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleConfirm = async () => {
    const { type, userId, userName } = confirmModal;
    setConfirmModal(null);

    if (type === 'delete_user') {
      try {
        const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
          method: 'DELETE', headers: authHeaders(),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast(`✅ Usuario "${userName}" eliminado.`);
        fetchUsers();
      } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
    }

    if (type === 'delete_site') {
      try {
        const res = await fetch(`${API_BASE}/api/admin/users/${userId}/site`, {
          method: 'DELETE', headers: authHeaders(),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        showToast(`🗑️ Web de "${userName}" eliminada.`);
        fetchUsers();
      } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
    }
  };

  const handleUpdateCredits = async (userId, userName) => {
    const val = parseInt(editCredits[userId]);
    if (isNaN(val) || val < 0) { showToast('Introduce un número válido', 'error'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/credits`, {
        method: 'PATCH', headers: authHeaders(),
        body: JSON.stringify({ credits: val }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      showToast(`💳 Créditos de "${userName}" → ${val}`);
      fetchUsers();
      setEditCredits(prev => { const n = { ...prev }; delete n[userId]; return n; });
    } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          ...createForm,
          aiCredits: parseInt(createForm.aiCredits) || 1500,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`✅ Usuario "${createForm.email}" creado con plan "${createForm.plan}".`);
      setCreateForm({ name: '', email: '', password: '', plan: 'pro', aiCredits: 1500, profession: '' });
      setShowCreateForm(false);
      fetchUsers();
    } catch (e) { showToast(`❌ ${e.message}`, 'error'); }
    finally { setCreating(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('avialo_user');
    if (onLogout) onLogout();
    navigate('/login', { replace: true });
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const planBadge = (plan) => {
    const colors = { pro: '#10b981', none: '#6b7280', basic: '#3b82f6', enterprise: '#8b5cf6', admin: '#ef4444' };
    return (
      <span style={{
        background: colors[plan] || '#6b7280', color: '#fff',
        padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
        letterSpacing: '0.05em', textTransform: 'uppercase',
      }}>{plan || 'none'}</span>
    );
  };

  const statusBadge = (status) => {
    const map = {
      deployed: { bg: '#10b981', label: 'Desplegada' },
      generating: { bg: '#f59e0b', label: 'Generando' },
      pending: { bg: '#3b82f6', label: 'Pendiente' },
      failed: { bg: '#ef4444', label: 'Error' },
      none: { bg: '#374151', label: 'Sin web' },
    };
    const s = map[status] || map.none;
    return (
      <span style={{ background: s.bg, color: '#fff', padding: '2px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
        {s.label}
      </span>
    );
  };

  if (!user || user.role !== 'admin') return null;

  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px', padding: '10px 14px', color: '#e5e7eb',
    fontSize: '14px', outline: 'none',
  };

  const labelStyle = { fontSize: '12px', fontWeight: 600, color: '#9ca3af', marginBottom: '6px', display: 'block' };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0d1117 100%)',
      fontFamily: "'Inter', sans-serif",
      color: '#e5e7eb',
    }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.type === 'error' ? 'rgba(239,68,68,0.97)' : 'rgba(16,185,129,0.97)',
          color: '#fff', padding: '14px 22px', borderRadius: '12px',
          fontSize: '14px', fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)',
          animation: 'slideIn 0.3s ease',
        }}>{toast.msg}</div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1f2937, #111827)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px',
            padding: '32px', maxWidth: '420px', width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px' }}>
              {confirmModal.type === 'delete_user' ? '🗑️' : '🌐'}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, textAlign: 'center', color: '#f9fafb', marginBottom: '10px' }}>
              {confirmModal.type === 'delete_user' ? '¿Eliminar usuario?' : '¿Eliminar web?'}
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
              {confirmModal.type === 'delete_user'
                ? `Eliminarás permanentemente a "${confirmModal.userName}". No se puede deshacer.`
                : `La web de "${confirmModal.userName}" será eliminada. Podrá crear una nueva.`}
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setConfirmModal(null)} style={{
                flex: 1, padding: '12px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#9ca3af', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              }}>Cancelar</button>
              <button onClick={handleConfirm} style={{
                flex: 1, padding: '12px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 700,
                boxShadow: '0 4px 15px rgba(239,68,68,0.4)',
              }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1f2937, #111827)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px',
            padding: '32px', maxWidth: '500px', width: '90%', boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f9fafb', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>➕</span> Crear nuevo usuario
            </h3>
            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelStyle}>Nombre *</label>
                  <input style={inputStyle} required value={createForm.name}
                    onChange={e => setCreateForm(p => ({ ...p, name: e.target.value }))} placeholder="Nombre completo" />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input style={inputStyle} type="email" required value={createForm.email}
                    onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} placeholder="email@ejemplo.com" />
                </div>
                <div>
                  <label style={labelStyle}>Contraseña *</label>
                  <input style={inputStyle} type="password" required value={createForm.password}
                    onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <label style={labelStyle}>Profesión</label>
                  <input style={inputStyle} value={createForm.profession}
                    onChange={e => setCreateForm(p => ({ ...p, profession: e.target.value }))} placeholder="ej: Diseñador" />
                </div>
                <div>
                  <label style={labelStyle}>Plan</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={createForm.plan}
                    onChange={e => setCreateForm(p => ({ ...p, plan: e.target.value }))}>
                    {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Créditos IA</label>
                  <input style={inputStyle} type="number" min="0" value={createForm.aiCredits}
                    onChange={e => setCreateForm(p => ({ ...p, aiCredits: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowCreateForm(false)} style={{
                  flex: 1, padding: '12px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#9ca3af', cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                }}>Cancelar</button>
                <button type="submit" disabled={creating} style={{
                  flex: 2, padding: '12px', borderRadius: '10px',
                  background: creating ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none', color: '#fff', cursor: creating ? 'not-allowed' : 'pointer',
                  fontSize: '14px', fontWeight: 700, boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                }}>
                  {creating ? 'Creando...' : '✅ Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar + Content layout */}
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* Sidebar */}
        <div style={{
          width: '220px', flexShrink: 0,
          background: 'rgba(255,255,255,0.02)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', flexDirection: 'column',
          padding: '28px 0',
        }}>
          <div style={{ padding: '0 20px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>⚡</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#f9fafb' }}>
                Avialo <span style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>Admin</span>
              </span>
            </div>
          </div>

          <nav style={{ flex: 1 }}>
            <div style={{
              padding: '10px 20px', margin: '0 8px', borderRadius: '10px',
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              fontSize: '14px', fontWeight: 600, color: '#a5b4fc',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              👥 Usuarios
            </div>
          </nav>

          <div style={{ padding: '20px' }}>
            <div style={{
              padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)', marginBottom: '10px',
              fontSize: '12px', color: '#6b7280',
            }}>
              <div style={{ fontWeight: 600, color: '#9ca3af', marginBottom: '2px' }}>{user.name}</div>
              <div>{user.email}</div>
              <div style={{ marginTop: '4px', fontSize: '11px', color: '#4b5563' }}>Administrador</div>
            </div>
            <button onClick={handleLogout} style={{
              width: '100%', padding: '9px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            }}>
              🚪 Cerrar sesión
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '32px', overflow: 'auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f9fafb', margin: 0 }}>Usuarios</h1>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: '4px 0 0' }}>Gestión completa de clientes</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={fetchUsers} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '8px 16px', color: '#9ca3af',
                cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              }}>🔄 Actualizar</button>
              <button onClick={() => setShowCreateForm(true)} style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', borderRadius: '10px', padding: '9px 18px',
                color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                boxShadow: '0 4px 15px rgba(99,102,241,0.35)',
              }}>➕ Nuevo usuario</button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total', val: users.length, icon: '👥', color: '#6366f1' },
              { label: 'Plan Pro', val: users.filter(u => u.plan === 'pro').length, icon: '⭐', color: '#f59e0b' },
              { label: 'Con web', val: users.filter(u => u.siteStatus === 'deployed').length, icon: '🌐', color: '#10b981' },
              { label: 'Sin plan', val: users.filter(u => !u.plan || u.plan === 'none').length, icon: '🔒', color: '#6b7280' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '14px', padding: '18px',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{s.icon}</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div style={{ marginBottom: '16px' }}>
            <input type="text" placeholder="🔍  Buscar por nombre o email..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                maxWidth: '380px', width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', padding: '10px 16px', color: '#e5e7eb', fontSize: '14px', outline: 'none',
              }} />
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px', color: '#6b7280' }}>Cargando usuarios...</div>
          ) : error ? (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '20px', color: '#ef4444', textAlign: 'center' }}>
              ❌ {error}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
              {/* TH */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 80px 85px 90px 140px 170px',
                padding: '12px 20px', background: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                fontSize: '11px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>
                <span>Usuario</span><span>Email</span><span>Plan</span><span>Créditos</span><span>Web</span><span>Ajustar créditos</span><span>Acciones</span>
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>No hay usuarios.</div>
              ) : filtered.map((u, i) => (
                <div key={u.id} style={{
                  display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 80px 85px 90px 140px 170px',
                  padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  alignItems: 'center', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#f9fafb' }}>{u.name}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>#{u.id}</div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  <div>{planBadge(u.plan)}</div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: u.aiCredits < 500 ? '#ef4444' : '#10b981' }}>{u.aiCredits}</div>
                  <div>{statusBadge(u.siteStatus)}</div>

                  {/* Credits editor */}
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input type="number" min="0" placeholder={String(u.aiCredits)}
                      value={editCredits[u.id] ?? ''}
                      onChange={e => setEditCredits(prev => ({ ...prev, [u.id]: e.target.value }))}
                      style={{
                        width: '58px', background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
                        padding: '5px 8px', color: '#e5e7eb', fontSize: '13px', outline: 'none',
                      }} />
                    <button
                      onClick={() => handleUpdateCredits(u.id, u.name)}
                      disabled={editCredits[u.id] === '' || editCredits[u.id] === undefined}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        border: 'none', borderRadius: '8px', padding: '5px 10px',
                        color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                        opacity: (editCredits[u.id] === '' || editCredits[u.id] === undefined) ? 0.4 : 1,
                      }}>✓</button>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {u.siteStatus !== 'none' && (
                      <button onClick={() => setConfirmModal({ type: 'delete_site', userId: u.id, userName: u.name })}
                        style={{
                          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                          borderRadius: '8px', padding: '5px 10px', color: '#f59e0b',
                          cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                        }}>🌐 Web</button>
                    )}
                    <button onClick={() => setConfirmModal({ type: 'delete_user', userId: u.id, userName: u.name })}
                      style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '8px', padding: '5px 10px', color: '#ef4444',
                        cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                      }}>🗑️ Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        input::placeholder { color: #4b5563 !important; }
        select option { background: #1f2937; color: #e5e7eb; }
      `}</style>
    </div>
  );
}
