import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Bell, Check, Calendar, MessageSquare, Wrench, FileText, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

const iconMap = {
  calendar_event: Calendar,
  payment_reminder: CreditCard,
  message: MessageSquare,
  agreement: FileText,
  maintenance: Wrench,
  tenant_invitation: FileText
};

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id }, '-created_date', 20),
    enabled: !!user?.id
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-white hover:bg-white/20">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <span className="font-semibold">Varsler</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs text-blue-600"
              onClick={() => markAllReadMutation.mutate()}
            >
              <Check className="w-3 h-3 mr-1" /> Marker alle som lest
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              Ingen varsler ennå
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => {
                const Icon = iconMap[notification.type] || Bell;
                return (
                  <div 
                    key={notification.id} 
                    className={`p-3 flex gap-3 cursor-pointer hover:bg-slate-50 ${!notification.read ? 'bg-blue-50' : ''}`}
                    onClick={() => !notification.read && markReadMutation.mutate(notification.id)}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notification.type === 'payment_reminder' ? 'bg-green-100' :
                      notification.type === 'calendar_event' ? 'bg-purple-100' :
                      notification.type === 'message' ? 'bg-blue-100' :
                      'bg-slate-100'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        notification.type === 'payment_reminder' ? 'text-green-600' :
                        notification.type === 'calendar_event' ? 'text-purple-600' :
                        notification.type === 'message' ? 'text-blue-600' :
                        'text-slate-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>{notification.title}</p>
                      <p className="text-xs text-slate-500 truncate">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(notification.created_date).toLocaleDateString('no', { 
                          day: 'numeric', 
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}