import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Check, Calendar, MessageSquare, Wrench, FileText, CreditCard, Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createPageUrl } from '@/utils';

const iconMap = {
  calendar_event: { Icon: Calendar, bg: 'bg-purple-100', color: 'text-purple-600' },
  payment_reminder: { Icon: CreditCard, bg: 'bg-green-100', color: 'text-green-600' },
  message: { Icon: MessageSquare, bg: 'bg-blue-100', color: 'text-blue-600' },
  agreement: { Icon: FileText, bg: 'bg-orange-100', color: 'text-orange-600' },
  maintenance: { Icon: Wrench, bg: 'bg-yellow-100', color: 'text-yellow-600' },
  invitation: { Icon: Home, bg: 'bg-pink-100', color: 'text-pink-600' },
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

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const effectiveRole = user?.active_role || user?.user_role || localStorage.getItem('user_role_override');

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id, effectiveRole],
    queryFn: async () => {
      const all = await base44.entities.Notification.filter({ user_id: user?.id }, '-created_date', 20);
      return all.filter(n => !n.role || n.role === effectiveRole);
    },
    enabled: !!user?.id && !!effectiveRole,
    refetchInterval: 30000
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
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
      setOpen(false);
      navigate(createPageUrl(destination));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/20">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-semibold text-slate-900">Varsler</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600"
              onClick={() => markAllReadMutation.mutate()}
            >
              <Check className="w-3 h-3 mr-1" /> Marker alle lest
            </Button>
          )}
        </div>
        <ScrollArea className="h-[320px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              Ingen varsler ennå
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => {
                const config = iconMap[notification.type] || { Icon: Bell, bg: 'bg-slate-100', color: 'text-slate-600' };
                const { Icon } = config;
                const destination = getDestinationPage(notification, effectiveRole);
                const isNavigable = !!destination;

                return (
                  <div
                    key={notification.id}
                    className={`p-3 flex gap-3 transition-colors
                      ${!notification.read ? 'bg-blue-50' : 'bg-white'}
                      ${isNavigable ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100' : ''}
                    `}
                    onClick={() => isNavigable && handleNotificationClick(notification)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-tight ${!notification.read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(notification.created_date).toLocaleDateString('no', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full" />
                      )}
                      {isNavigable && (
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-blue-600 text-sm"
            onClick={() => {
              setOpen(false);
              navigate(createPageUrl('Notifications'));
            }}
          >
            Se alle varsler
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}