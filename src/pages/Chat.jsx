import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/components/LanguageContext';

export default function Chat() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const messagesEndRef = useRef(null);
  
  const [selectedProperty, setSelectedProperty] = useState(null);
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

  const { data: properties = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: async () => {
      if (isLandlord) {
        return base44.entities.RentalUnit.filter({ landlord_id: user?.id });
      } else {
        return base44.entities.RentalUnit.filter({ tenant_id: user?.id });
      }
    },
    enabled: !!user?.id
  });

  // Calculate unread count per property
  const { data: unreadByProperty = {} } = useQuery({
    queryKey: ['unreadByProperty'],
    queryFn: async () => {
      if (!user?.id) return {};
      
      const allMessages = await base44.entities.ChatMessage.list('-created_date', 1000);
      const unreadMessages = allMessages.filter(msg => 
        msg.sender_id !== user.id && !msg.read
      );
      
      // Group by property
      const unreadCounts = {};
      unreadMessages.forEach(msg => {
        if (!unreadCounts[msg.rental_unit_id]) {
          unreadCounts[msg.rental_unit_id] = 0;
        }
        unreadCounts[msg.rental_unit_id]++;
      });
      
      console.log('🔵 [CHAT] Unread per property:', unreadCounts);
      return unreadCounts;
    },
    enabled: !!user?.id,
    refetchInterval: 10000
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedProperty?.id],
    queryFn: async () => {
      const msgs = await base44.entities.ChatMessage.filter(
        { rental_unit_id: selectedProperty?.id },
        'created_date',
        100
      );
      console.log('🔵 [CHAT] Fetched messages:', {
        propertyId: selectedProperty?.id,
        count: msgs.length,
        messages: msgs.map(m => ({
          id: m.id,
          sender_id: m.sender_id,
          sender_name: m.sender_name,
          preview: m.message.substring(0, 30)
        }))
      });
      return msgs;
    },
    enabled: !!selectedProperty?.id
  });

  // Real-time subscription
  useEffect(() => {
    if (!selectedProperty?.id) return;

    console.log('🔵 [CHAT] Subscribing to messages for property:', selectedProperty.id);

    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      console.log('🔵 [CHAT] Message event:', event);
      
      if (event.data.rental_unit_id === selectedProperty.id) {
        queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedProperty.id] });
        
        // Create notification for received messages (not own)
        if (event.type === 'create' && event.data.sender_id !== user?.id) {
          queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
        }
      }
    });

    return unsubscribe;
  }, [selectedProperty?.id, user?.id]);

  const sendMutation = useMutation({
    mutationFn: async (data) => {
      console.log('🔵 [CHAT] Sending message:', data);
      const result = await base44.entities.ChatMessage.create(data);
      console.log('✅ [CHAT] Message sent:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedProperty?.id] });
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
      sender_id: user.id,
      sender_name: user.full_name || user.email,
      message: newMessage.trim(),
      read: false
    };

    console.log('🔵 [CHAT] Preparing to send:', {
      ...messageData,
      currentRole: effectiveRole,
      isLandlord
    });

    sendMutation.mutate(messageData);
  };

  // Mark messages as read when chat is opened
  useEffect(() => {
    if (selectedProperty?.id && messages.length > 0) {
      const unreadMessages = messages.filter(m => !m.read && m.sender_id !== user?.id);
      if (unreadMessages.length > 0) {
        console.log('🔵 [CHAT] Marking messages as read:', {
          propertyId: selectedProperty.id,
          count: unreadMessages.length,
          messageIds: unreadMessages.map(m => m.id)
        });
        
        // Mark all as read
        Promise.all(
          unreadMessages.map(msg => 
            base44.entities.ChatMessage.update(msg.id, { read: true })
          )
        ).then(() => {
          console.log('✅ [CHAT] All messages marked as read');
          queryClient.invalidateQueries({ queryKey: ['unreadMessages'] });
          queryClient.invalidateQueries({ queryKey: ['unreadByProperty'] });
        }).catch(error => {
          console.error('❌ [CHAT] Failed to mark messages as read:', error);
        });
      }
    }
  }, [selectedProperty?.id, messages, user?.id, queryClient]);

  // Property list view
  if (!selectedProperty) {
    return (
      <div className="pb-24">
        <div className="bg-white border-b px-4 py-4">
          <h1 className="text-xl font-bold text-slate-900">{t('chat')}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Rolle: {isLandlord ? 'Utleier' : 'Leietaker'}
          </p>
        </div>

        <div className="p-4 space-y-3">
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
              const unreadCount = unreadByProperty[property.id] || 0;
              
              return (
                <Card 
                  key={property.id}
                  className={`cursor-pointer transition-shadow relative ${hasOccupant ? 'hover:shadow-md' : 'opacity-50'}`}
                  onClick={() => hasOccupant && setSelectedProperty(property)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center relative">
                        <Building2 className="w-6 h-6 text-blue-600" />
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{property.name}</h3>
                          {unreadCount > 0 && (
                            <span className="text-xs font-semibold text-red-600">
                              {unreadCount} ny{unreadCount > 1 ? 'e' : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 truncate">{property.address}</p>
                      </div>
                      {hasOccupant ? (
                        <Badge className="bg-green-100 text-green-700">
                          {isLandlord ? 'Leietaker' : 'Utleier'}
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
            {isLandlord ? 'Chat med leietaker' : 'Chat med utleier'}
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
              return (
                <div 
                  key={msg.id} 
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
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