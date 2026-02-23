import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Check, Calendar, MessageSquare, Wrench, FileText, CreditCard, Trash2, Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';

const iconMap = {
  calendar_event: { Icon: Calendar, bg: 'bg-purple-100', color: 'text-purple-600' },
  payment_reminder: { Icon: CreditCard, bg: 'bg-green-100', color: 'text-green-600' },
  message: { Icon: MessageSquare, bg: 'bg-blue-100', color: 'text-blue-600' },
  agreement: { Icon: FileText, bg: 'bg-orange-100', color: 'text-orange-600' },
  maintenance: { Icon: Wrench, bg: 'bg-yellow-100', color: 'text-yellow-600' },
  invitation: { Icon: Home, bg: 'bg-pink-100', color: 'text-pink-600' },
};

const typeLabels = {
  calendar_event: 'Kalender',
  payment_reminder: 'Betaling',
  message: 'Melding',
  agreement: 'Avtale',
  maintenance: 'Vedlikehold',
  invitation: 'Invitasjon',
};

function getDestinationPage(notification, effectiveRole) {
  switch (notification.type) {
    case 'message':
      if (notification.rental_unit_id) return `Chat?propertyId=${notification.rental_unit_id}`;
      return 'Chat';
    case 'agreement':
      if (notification.related_id) return `SignAgreement?id=${notification.related_id}`;
      return effectiveRole === 'tenant' ? 'TenantDashboard' : 'Dashboard';
    case 'calendar_event':
      return 'CalendarPage';
    case 'maintenance':
      if (effectiveRole === 'landlord' && notification.rental_unit_id)
        return `PropertyDetail?id=${notification.rental_unit_id}`;
      return 'TenantDashboard';
    case 'payment_reminder':
      if (effectiveRole === 'landlord' && notification.rental_unit_id)
        return `PropertyDetail?id=${notification.rental_unit_id}`;
      return 'TenantDashboard';
    case 'invitation':
      return 'TenantDashboard';
    default:
      if (notification.rental_unit_id) {
        return effectiveRole === 'landlord'
          ? `PropertyDetail?id=${notification.rental_unit_id}`
          : 'TenantDashboard';
      }
      return null;
  }
}

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const effectiveRole = user?.active_role || user?.user_role || localStorage.getItem('user_role_override');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id, effectiveRole],
    queryFn: async () => {
      const all = await base44.entities.Notification.filter({ user_id: user?.id }, '-created_date', 50);
      return all.filter(n => !n.role || n.role === effectiveRole);
    },
    enabled: !!user?.id && !!effectiveRole
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markReadMutation.mutate(notification.id);
    }
    const destination = getDestinationPage(notification, effectiveRole);
    if (destination) {
      navigate(createPageUrl(destination));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-bold text-slate-900">Varsler</h1>
          {unreadCount > 0 && (
            <Badge className="bg-blue-600 text-white text-xs px-2">{unreadCount} nye</Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 text-sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Check className="w-4 h-4 mr-1" /> Marker alle lest
          </Button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Laster varsler...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-14 h-14 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Ingen varsler ennå</p>
          </div>
        ) : (
          notifications.map(notification => {
            const config = iconMap[notification.type] || { Icon: Bell, bg: 'bg-slate-100', color: 'text-slate-600' };
            const { Icon } = config;
            const destination = getDestinationPage(notification, effectiveRole);
            const isNavigable = !!destination;

            return (
              <div
                key={notification.id}
                className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-all
                  ${!notification.read ? 'border-blue-200 bg-blue-50/40' : 'border-gray-100'}
                  ${isNavigable ? 'cursor-pointer active:scale-[0.99] hover:shadow-sm' : ''}
                `}
                onClick={() => isNavigable && handleNotificationClick(notification)}
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-sm font-semibold ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                      {notification.title}
                    </span>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {typeLabels[notification.type] || 'Varsel'}
                    </Badge>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full inline-block" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500 leading-snug">{notification.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(notification.created_date).toLocaleDateString('no', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {!notification.read && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-500 hover:text-blue-700"
                      onClick={() => markReadMutation.mutate(notification.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-300 hover:text-red-500"
                    onClick={() => deleteMutation.mutate(notification.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {isNavigable && (
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}