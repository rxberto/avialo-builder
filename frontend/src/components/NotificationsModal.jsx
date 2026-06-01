import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Bell, CheckCircle2, AlertCircle, Sparkles,
  Trash2, Search, Check, Inbox
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function NotificationsModal({ 
  isOpen, 
  onClose, 
  notifications, 
  onMarkRead, 
  onMarkAllRead, 
  onDeleteNotification,
  onClearAll
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'success' | 'warning' | 'info'

  // Filtered notifications
  const filtered = notifications.filter(notif => {
    const matchesSearch = notif.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || notif.type === filterType;
    return matchesSearch && matchesType;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatFullTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeStr;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-xl flex items-center justify-center p-4"
        >
          {/* Backdrop click close */}
          <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_0_55px_-10px_rgba(0,0,0,0.3)] rounded-3xl max-w-2xl w-full relative overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            
            {/* Glowing background highlights */}
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-brand/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-brand-accent/10 rounded-full blur-2xl pointer-events-none" />

            {/* Modal Header */}
            <div className="p-6 border-b border-border/40 flex items-center justify-between gap-4 relative z-10 bg-muted/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center relative">
                  <Bell className="w-5 h-5 text-brand" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand rounded-full animate-ping" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    Centro de Notificaciones B2B
                    {unreadCount > 0 && (
                      <Badge className="bg-brand text-brand-foreground text-[10px] px-1.5 py-0">
                        {unreadCount} Pendientes
                      </Badge>
                    )}
                  </h2>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-0.5">Historial de alertas y despliegues en tiempo real</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={16} />
              </Button>
            </div>

            {/* Filters and Search Bar */}
            <div className="p-4 border-b border-border/20 bg-muted/5 flex flex-col sm:flex-row gap-3 relative z-10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar notificaciones por título o mensaje..."
                  className="pl-9 h-10 text-xs bg-white/50 dark:bg-zinc-950/50"
                />
              </div>

              <div className="flex gap-2 items-center">
                {[
                  { id: 'all', label: 'Ver Todas' },
                  { id: 'success', label: 'Éxitos' },
                  { id: 'warning', label: 'Alertas' },
                  { id: 'info', label: 'Info' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer",
                      filterType === tab.id
                        ? "bg-zinc-900 text-zinc-50 border-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 dark:border-zinc-100"
                        : "bg-white dark:bg-zinc-950 text-muted-foreground border-border hover:bg-muted/50"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notifications Main List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/20 relative z-10 min-h-[250px]">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 px-6 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Inbox size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Bandeja de notificaciones vacía</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      {searchQuery || filterType !== 'all' 
                        ? 'No se encontraron notificaciones que coincidan con los filtros aplicados.' 
                        : 'No tienes alertas pendientes de tu entorno de desarrollo.'}
                    </p>
                  </div>
                </div>
              ) : (
                filtered.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && onMarkRead(notif.id)}
                    className={cn(
                      "p-5 hover:bg-muted/10 transition-all flex gap-4 items-start justify-between group",
                      !notif.read ? "bg-brand/5 border-l-2 border-brand" : "border-l-2 border-transparent"
                    )}
                  >
                    <div className="flex gap-4 items-start">
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'success' && (
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                        {notif.type === 'info' && (
                          <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center border border-brand/20">
                            <Sparkles size={16} />
                          </div>
                        )}
                        {notif.type === 'warning' && (
                          <div className="w-8 h-8 rounded-lg bg-brand-warning/10 text-brand-warning flex items-center justify-center border border-brand-warning/20">
                            <AlertCircle size={16} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-xs text-foreground flex items-center gap-2">
                          <span className="truncate">{notif.title}</span>
                          {!notif.read && (
                            <Badge className="bg-brand text-brand-foreground text-[8px] px-1 py-0 select-none">
                              Nuevo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">{notif.message}</p>
                        <span className="text-[9px] text-muted-foreground/60 block pt-1">{formatFullTime(notif.time)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notif.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead(notif.id);
                          }}
                          className="h-8 w-8 text-zinc-550 hover:text-brand rounded-lg hover:bg-brand/10 cursor-pointer"
                          title="Marcar como leída"
                        >
                          <Check size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteNotification) onDeleteNotification(notif.id);
                        }}
                        className="h-8 w-8 text-zinc-550 hover:text-destructive rounded-lg hover:bg-destructive/10 cursor-pointer"
                        title="Eliminar notificación"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-border/40 flex justify-between items-center bg-muted/10 relative z-10">
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button
                    onClick={onMarkAllRead}
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-xl font-semibold text-xs border-border hover:bg-muted/80 cursor-pointer"
                  >
                    Marcar todo leído
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button
                    onClick={onClearAll}
                    variant="ghost"
                    size="sm"
                    className="h-9 rounded-xl font-semibold text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                  >
                    Vaciar historial
                  </Button>
                )}
              </div>

              <Button
                onClick={onClose}
                className="h-9 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-50 dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 px-5 cursor-pointer"
              >
                Entendido
              </Button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
