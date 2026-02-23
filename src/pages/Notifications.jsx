import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Bell, Check, Calendar, MessageSquare, Wrench, FileText, CreditCard, Trash2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createPageUrl } from '@/utils';
import { useLogger } from '@/components/useLogger';
import NotificationErrorBoundary from '@/components/NotificationErrorBoundary';

const iconMap = {
  calendar_event: Calendar,
  payment_reminder: CreditCard,
  message: MessageSquare,
  agreement: FileText,
  maintenance: Wrench,
  invitation: Home,
};

function getNotificationUrl(notification, effectiveRole) {
  if (notification.type === 'message' && notification.rental_unit_id) {
    return createPageUrl(`Chat?propertyId=${notification.rental_unit_id}`);
  }
  if (notification.type === 'agreement' && notification.related_id) {
    return createPageUrl(`SignAgreement?id=${notification.related_id}`);
  }
  if (notification.type === 'calendar_event') {
    return createPageUrl('CalendarPage');
  }
  if (notification.type === 'maintenance' && notification.rental_unit_id) {
    return effectiveRole === 'landlord'
      ? createPageUrl(`PropertyDetail?id=${notification.rental_unit_id}`)
      : createPageUrl('TenantDashboard');
  }
  if (notification.type === 'payment_reminder' && notification.rental_unit_id) {
    return effectiveRole === 'landlord'
      ? createPageUrl(`PropertyDetail?id=${notification.rental_unit_id}`)
      : createPageUrl('TenantDashboard');
  }
  if (notification.rental_unit_id) {
    return effectiveRole === 'landlord'
      ? createPageUrl(`PropertyDetail?id=${notification.rental_unit_id}`)
      : createPageUrl('TenantDashboard');
  }
  if (notification.type === 'invitation' || (notification.title && notification.title.toLowerCase().includes('invitasjon'))) {
    return createPageUrl('TenantDashboard');
  }
  return null;
}

const typeLabels = {
  calendar_event: 'Kalender',
  payment_reminder: 'Betaling',
  message: 'Melding',
  agreement: 'Avtale',
  maintenance: 'Vedlikehold',
};

function NotificationsInner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const effectiveRole = user?.active_role || user?.user_role || localStorage.getItem('user_role_override');

  const logger = useLogger({ route: 'Notifications', userId: user?.id });

  // Log page mount
  useEffect(() => {
    logger.info('PAGE_MOUNT', 'Notifications page mounted', {
      effectiveRole,
      userId: user?.id,
      route: window.location.pathname,
      search: window.location.search,
    });
    return () => {
      logger.info('PAGE_UNMOUNT', 'Notifications page unmounted');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log when user/role is resolved
  useEffect(() => {
    if (user?.id) {
      logger.info('USER_RESOLVED', 'User and role determined', {
        effectiveRole,
        hasActiveRole: !!user?.active_role,
        hasUserRole: !!user?.user_role,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, effectiveRole]);

  const { data: notifications = [], isLoading, error: notifError } = useQuery({
    queryKey: ['notifications', user?.id, effectiveRole],
    queryFn: async () => {
      return logger.loggedCall('FETCH_NOTIFICATIONS', async () => {
        const all = await base44.entities.Notification.filter({ user_id: user?.id }, '-created_date', 50);
        const filtered = all.filter(n => !n.role || n.role === effectiveRole);
        logger.info('FETCH_NOTIFICATIONS_RESULT', `Fetched ${filtered.length} notifications`, {
          total: all.length,
          filtered: filtered.length,
          effectiveRole,
        });
        return filtered;
      }, { userId: user?.id, effectiveRole });
    },
    enabled: !!user?.id && !!effectiveRole
  });

  // Log fetch error if it occurs
  useEffect(() => {
    if (notifError) {
      logger.error('FETCH_NOTIFICATIONS_FAILED', 'Failed to load notifications', notifError, {
        userId: user?.id,
        effectiveRole,
      });
    }
  }, [notifError]);

  const markReadMutation = useMutation({
    mutationFn: async (id) => {
      return logger.loggedCall('MARK_READ', () => base44.entities.Notification.update(id, { read: true }), { notificationId: id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (err, id) => logger.error('MARK_READ_FAILED', 'Failed to mark notification as read', err, { notificationId: id })
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return logger.loggedCall('DELETE_NOTIFICATION', () => base44.entities.Notification.delete(id), { notificationId: id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (err, id) => logger.error('DELETE_NOTIFICATION_FAILED', 'Failed to delete notification', err, { notificationId: id })
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return logger.loggedCall('MARK_ALL_READ', async () => {
        const unread = notifications.filter(n => !n.read);
        await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
      }, { unreadCount: notifications.filter(n => !n.read).length });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (err) => logger.error('MARK_ALL_READ_FAILED', 'Failed to mark all as read', err)
  });

  const handleNotificationClick = (notification) => {
    const url = getNotificationUrl(notification, effectiveRole);
    logger.info('NOTIFICATION_CLICK', 'User clicked notification', {
      notificationId: notification.id,
      notificationType: notification.type,
      notificationTitle: notification.title,
      hasUrl: !!url,
      targetUrl: url,
      rentalUnitId: notification.rental_unit_id,
      relatedId: notification.related_id,
      effectiveRole,
    });

    if (url) {
      if (!notification.read) markReadMutation.mutate(notification.id);
      logger.info('NAVIGATE', `Navigating to ${url}`, { targetUrl: url });
      navigate(url);
    } else {
      logger.warn('NOTIFICATION_NO_URL', 'Notification has no navigable URL', {
        notificationId: notification.id,
        notificationType: notification.type,
        rentalUnitId: notification.rental_unit_id,
        relatedId: notification.related_id,
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="pb-20">
      {logger.debugMode && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-700 font-mono">
          🐛 Debug mode | correlationId: <strong>{logger.correlationId}</strong>
        </div>
      )}

      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              logger.info('NAV_BACK', 'User navigated back from Notifications');
              navigate(-1);
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">Varsler</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-slate-500">{unreadCount} uleste</p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logger.info('MARK_ALL_READ_CLICK', 'User clicked mark all as read', { unreadCount });
                markAllReadMutation.mutate();
              }}
            >
              <Check className="w-4 h-4 mr-1" /> Marker alle
            </Button>
          )}
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">Laster...</div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Ingen varsler ennå</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map(notification => {
              const Icon = iconMap[notification.type] || Bell;
              const url = getNotificationUrl(notification, effectiveRole);
              return (
                <Card
                  key={notification.id}
                  className={`${!notification.read ? 'border-blue-200 bg-blue-50/50' : ''} ${url ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notification.type === 'payment_reminder' ? 'bg-green-100' :
                        notification.type === 'calendar_event' ? 'bg-purple-100' :
                        notification.type === 'message' ? 'bg-blue-100' :
                        notification.type === 'maintenance' ? 'bg-yellow-100' :
                        notification.type === 'invitation' ? 'bg-orange-100' :
                        'bg-slate-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          notification.type === 'payment_reminder' ? 'text-green-600' :
                          notification.type === 'calendar_event' ? 'text-purple-600' :
                          notification.type === 'message' ? 'text-blue-600' :
                          notification.type === 'maintenance' ? 'text-yellow-600' :
                          notification.type === 'invitation' ? 'text-orange-600' :
                          'text-slate-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notification.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[notification.type] || 'Varsel'}
                          </Badge>
                          {url && (
                            <Badge className="text-xs bg-blue-100 text-blue-700">Trykk for å åpne →</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {new Date(notification.created_date).toLocaleDateString('no', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1" onClick={e => e.stopPropagation()}>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              logger.info('MARK_READ_CLICK', 'User clicked mark single as read', { notificationId: notification.id });
                              markReadMutation.mutate(notification.id);
                            }}
                          >
                            <Check className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                          onClick={() => {
                            logger.info('DELETE_CLICK', 'User clicked delete notification', { notificationId: notification.id });
                            deleteMutation.mutate(notification.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Notifications() {
  return (
    <NotificationErrorBoundary>
      <NotificationsInner />
    </NotificationErrorBoundary>
  );
}