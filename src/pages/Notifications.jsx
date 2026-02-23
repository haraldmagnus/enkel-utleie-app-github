import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Calendar, MessageSquare, Wrench, FileText, CreditCard } from 'lucide-react';
import { createPageUrl } from '@/utils';

const ICON_MAP = {
  calendar_event: { Icon: Calendar, bg: 'bg-purple-100', color: 'text-purple-600' },
  payment_reminder: { Icon: CreditCard, bg: 'bg-green-100', color: 'text-green-600' },
  message: { Icon: MessageSquare, bg: 'bg-blue-100', color: 'text-blue-600' },
  agreement: { Icon: FileText, bg: 'bg-orange-100', color: 'text-orange-600' },
  maintenance: { Icon: Wrench, bg: 'bg-yellow-100', color: 'text-yellow-600' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications-page', user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id }, '-created_date', 50),
    enabled: !!user?.id
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications-page'] })
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications-page'] }); queryClient.invalidateQueries({ queryKey: ['notifsBell'] }); }
  });

  const handleClick = (n) => {
    if (!n.read) markReadMutation.mutate(n.id);
    const role = user?.active_role || user?.user_role;
    if (n.type === 'message' && n.rental_unit_id) navigate(createPageUrl(`Chat?propertyId=${n.rental_unit_id}`));
    else if (n.type === 'agreement' && n.related_id) navigate(createPageUrl(`SignAgreement?id=${n.related_id}`));
    else if (n.type === 'maintenance' && n.rental_unit_id && role === 'landlord') navigate(createPageUrl(`PropertyDetail?id=${n.rental_unit_id}`));
    else if (n.type === 'calendar_event') navigate(createPageUrl('CalendarPage'));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{unreadCount} uleste</p>
          <button onClick={() => markAllMutation.mutate()} className="flex items-center gap-1.5 text-blue-600 text-sm font-medium hover:text-blue-700">
            <Check className="w-4 h-4" /> Marker alle lest
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Ingen varsler ennå</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const cfg = ICON_MAP[n.type] || { Icon: Bell, bg: 'bg-gray-100', color: 'text-gray-600' };
            const { Icon } = cfg;
            return (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`bg-white rounded-2xl shadow-sm border p-4 flex items-start gap-3 cursor-pointer hover:shadow-md transition-all ${!n.read ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-gray-300 mt-1">{new Date(n.created_date).toLocaleDateString('no', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}