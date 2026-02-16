import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Bell, Check, Calendar, MessageSquare, Wrench, FileText, CreditCard, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const iconMap = {
  calendar_event: Calendar,
  payment_reminder: CreditCard,
  message: MessageSquare,
  agreement: FileText,
  maintenance: Wrench,
};

const typeLabels = {
  calendar_event: 'Kalender',
  payment_reminder: 'Betaling',
  message: 'Melding',
  agreement: 'Avtale',
  maintenance: 'Vedlikehold',
};

export default function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id }, '-created_date', 50),
    enabled: !!user?.id
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="pb-20">
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
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
              onClick={() => markAllReadMutation.mutate()}
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
              return (
                <Card 
                  key={notification.id} 
                  className={`${!notification.read ? 'border-blue-200 bg-blue-50/50' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notification.type === 'payment_reminder' ? 'bg-green-100' :
                        notification.type === 'calendar_event' ? 'bg-purple-100' :
                        notification.type === 'message' ? 'bg-blue-100' :
                        notification.type === 'maintenance' ? 'bg-yellow-100' :
                        'bg-slate-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          notification.type === 'payment_reminder' ? 'text-green-600' :
                          notification.type === 'calendar_event' ? 'text-purple-600' :
                          notification.type === 'message' ? 'text-blue-600' :
                          notification.type === 'maintenance' ? 'text-yellow-600' :
                          'text-slate-600'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${!notification.read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {notification.title}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[notification.type]}
                          </Badge>
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
                      <div className="flex flex-col gap-1">
                        {!notification.read && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => markReadMutation.mutate(notification.id)}
                          >
                            <Check className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                          onClick={() => deleteMutation.mutate(notification.id)}
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