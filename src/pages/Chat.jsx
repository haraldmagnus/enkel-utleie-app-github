import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Building2, ArrowLeft, BedDouble } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/components/LanguageContext';
import PendingInvitations from '@/components/PendingInvitations';

export default function Chat() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const messagesEndRef = useRef(null);
  
  const [selectedProperty, setSelectedProperty] = useState(null);
  // For shared housing: selectedRoom = { id, name } or null (means property-level chat)
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // CRITICAL: Use activeRole as single source of truth
  const roleOverride = typeof window !== 'undefined' ? localStorage.getItem('user_role_override') : null;
  const effectiveRole = user?.active_role || user?.user_role || roleOverride;
  const isLandlord = effectiveRole === 'landlord';

  // Debug logging
  useEffect(() => {
    if (user) {
      console.log('🔵 [CHAT MOUNT] Role detection:', {
        userId: user.id,
        email: user.email,
        active_role: user.active_role,
        user_role: user.user_role,
        roleOverride,
        EFFECTIVE_ROLE: effectiveRole,
        isLandlord,
        timestamp: new Date().toISOString()
      });
    }
  }, [user, effectiveRole]);

  const { data: allProperties = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.list('-created_date', 100),
    enabled: !!user?.id
  });

  // Filter properties where user is involved (any role)
  const properties = allProperties.filter(p => {
    if (isLandlord) {
      return p.landlord_id === user?.id || (p.landlord_ids || []).includes(user?.id);
    } else {
      return p.tenant_id === user?.id || 
             (p.tenant_ids || []).includes(user?.id) ||
             p.tenant_email === user?.email ||
             (p.tenant_emails || []).includes(user?.email);
    }
  });

  // Determine which room (if any) this user is assigned to in a shared housing
  const getMyRoom = (property) => {
    if (!property?.is_shared_housing || !property?.rooms) return null;
    return property.rooms.find(r =>
      r.tenant_id === user?.id || r.tenant_email === user?.email
    ) || null;
  };

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedProperty?.id, selectedRoom?.id ?? null],
    queryFn: async () => {
      const filter = { rental_unit_id: selectedProperty?.id };
      if (selectedRoom?.id) filter.room_id = selectedRoom.id;
      const msgs = await base44.entities.ChatMessage.filter(filter, 'created_date', 100);
      return msgs;
    },
    enabled: !!selectedProperty?.id
  });

  // Real-time subscription
  useEffect(() => {
    if (!selectedProperty?.id) return;
    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      if (event.data.rental_unit_id === selectedProperty.id) {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedProperty.id, selectedRoom?.id ?? null] });
        if (event.type === 'create' && event.data.sender_id !== user?.id) {
          queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
        }
      }
    });
    return unsubscribe;
  }, [selectedProperty?.id, selectedRoom?.id, user?.id]);

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.ChatMessage.create(data);

      // Notify recipients: for shared housing room chat → landlords + that room's tenant only
      const prop = selectedProperty;
      let recipientIds = [];
      if (prop.is_shared_housing && selectedRoom) {
        const room = (prop.rooms || []).find(r => r.id === selectedRoom.id);
        const roomTenantId = room?.tenant_id;
        const landlordIds = [prop.landlord_id, ...(prop.landlord_ids || [])].filter(Boolean);
        recipientIds = [...new Set([...landlordIds, roomTenantId].filter(Boolean))].filter(id => id !== user?.id);
      } else {
        const allLinkedIds = [
          prop.landlord_id,
          ...(prop.landlord_ids || []),
          prop.tenant_id,
          ...(prop.tenant_ids || [])
        ].filter(Boolean);
        recipientIds = [...new Set(allLinkedIds)].filter(id => id !== user?.id);
      }

      await Promise.all(recipientIds.map(recipientId =>
        base44.entities.Notification.create({
          user_id: recipientId,
          type: 'message',
          title: 'Ny melding',
          message: `${data.sender_name}: ${data.message.substring(0, 80)}`,
          rental_unit_id: prop.id,
          read: false
        })
      ));

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedProperty?.id, selectedRoom?.id ?? null] });
      setNewMessage('');
    },
    onError: (error) => {
      console.error('❌ [CHAT] Send failed:', error);
      alert('Kunne ikke sende melding: ' + error.message);
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedProperty || !user) return;

    const messageData = {
      rental_unit_id: selectedProperty.id,
      room_id: selectedRoom?.id || null,
      sender_id: user.id,
      sender_name: (user.first_name && user.last_name) ? `${user.first_name} ${user.last_name}` : (user.first_name || user.full_name || user.email),
      sender_avatar_url: user.avatar_url || null,
      message: newMessage.trim(),
      read: false
    };

    sendMutation.mutate(messageData);
  };

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (selectedProperty?.id && messages.length > 0) {
      const unreadMessages = messages.filter(m => !m.read && m.sender_id !== user?.id);
      if (unreadMessages.length > 0) {
        console.log('🔵 [CHAT] Marking messages as read:', unreadMessages.length);
        unreadMessages.forEach(msg => {
          base44.entities.ChatMessage.update(msg.id, { read: true }).catch(console.error);
        });
        queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
      }
    }
  }, [selectedProperty?.id, messages, user?.id]);

  // Property list view
  if (!selectedProperty) {
    return (
      <div className="pb-24">
        <div className="px-4 pt-2">
          <p className="text-xs text-slate-500">
            Rolle: {isLandlord ? 'Utleier' : 'Leietaker'}
          </p>
        </div>

        <div className="p-4 space-y-3">
          {/* Pending Invitations */}
          <PendingInvitations userId={user?.id} userEmail={user?.email} />
          
          {properties.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">
                  {isLandlord 
                    ? 'Legg til en eiendom for å starte chat' 
                    : 'Ingen tilkoblede eiendommer'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            properties.map(property => {
              const hasOccupant = property.status === 'occupied' || property.tenant_email;
              
              return (
                <Card 
                  key={property.id}
                  className={`cursor-pointer transition-shadow ${hasOccupant ? 'hover:shadow-md' : 'opacity-50'}`}
                  onClick={() => hasOccupant && setSelectedProperty(property)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900">{property.name}</h3>
                        <p className="text-sm text-slate-500 truncate">{property.address}</p>
                      </div>
                      {hasOccupant ? (
                        <Badge className="bg-green-100 text-green-700">
                          {isLandlord 
                            ? `${(property.tenant_emails || (property.tenant_email ? [property.tenant_email] : [])).length} leietaker(e)`
                            : 'Gruppe'}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Ingen chat</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // Chat view
  return (
    <div className="h-screen flex flex-col pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setSelectedProperty(null)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-900">{selectedProperty.name}</h2>
          <p className="text-xs text-slate-500">
            Gruppechat
          </p>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>{t('noMessages')}</p>
            <p className="text-sm">Start samtalen!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => {
              const isOwn = msg.sender_id === user.id;
              const avatarUrl = isOwn ? user?.avatar_url : msg.sender_avatar_url;
              return (
                <div 
                  key={msg.id} 
                  className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-slate-200 mb-1">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={msg.sender_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-slate-500">
                          {msg.sender_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isOwn 
                      ? 'bg-blue-600 text-white rounded-br-md' 
                      : 'bg-slate-100 text-slate-900 rounded-bl-md'
                  }`}>
                    {!isOwn && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.sender_name}
                      </p>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
                      {new Date(msg.created_date).toLocaleTimeString('no', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {isOwn && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-blue-200 mb-1">
                      {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="Meg" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-blue-600">
                          {user?.first_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'M'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('typeMessage')}
            className="flex-1"
          />
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!newMessage.trim() || sendMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}