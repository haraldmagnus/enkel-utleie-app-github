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

  const isLandlord = user?.user_role === 'landlord';

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

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedProperty?.id],
    queryFn: () => base44.entities.ChatMessage.filter(
      { rental_unit_id: selectedProperty?.id },
      'created_date',
      100
    ),
    enabled: !!selectedProperty?.id,
    refetchInterval: 5000
  });

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages', selectedProperty?.id] });
      setNewMessage('');
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedProperty) return;

    sendMutation.mutate({
      rental_unit_id: selectedProperty.id,
      sender_id: user.id,
      sender_name: user.full_name,
      message: newMessage.trim()
    });
  };

  // Property list view
  if (!selectedProperty) {
    return (
      <div className="pb-20">
        <div className="bg-white border-b px-4 py-4">
          <h1 className="text-xl font-bold text-slate-900">{t('chat')}</h1>
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
    <div className="h-screen flex flex-col pb-16">
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