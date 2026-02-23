import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Building2, ArrowLeft, MessageSquare } from 'lucide-react';

export default function Chat() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const urlPropertyId = urlParams.get('propertyId');

  const [selectedPropertyId, setSelectedPropertyId] = useState(urlPropertyId || null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const role = user?.active_role || user?.user_role;
  const isLandlord = role === 'landlord';

  const { data: allProps = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.list('-created_date', 100),
    enabled: !!user?.id
  });

  const myProps = allProps.filter(p => isLandlord
    ? (p.landlord_id === user?.id || (p.landlord_ids || []).includes(user?.id))
    : (p.tenant_id === user?.id || (p.tenant_ids || []).includes(user?.id) || p.tenant_email === user?.email || (p.tenant_emails || []).includes(user?.email))
  );

  useEffect(() => {
    if (!selectedPropertyId && myProps.length > 0) {
      setSelectedPropertyId(myProps[0].id);
    }
  }, [myProps.length]);

  const { data: messages = [] } = useQuery({
    queryKey: ['messages', selectedPropertyId],
    queryFn: () => base44.entities.ChatMessage.filter({ rental_unit_id: selectedPropertyId }, 'created_date', 200),
    enabled: !!selectedPropertyId,
    refetchInterval: 5000
  });

  useEffect(() => {
    const unread = messages.filter(m => !m.read && m.sender_id !== user?.id);
    if (unread.length > 0) {
      Promise.all(unread.map(m => base44.entities.ChatMessage.update(m.id, { read: true })))
        .then(() => queryClient.invalidateQueries({ queryKey: ['unreadMsgs'] }));
    }
  }, [messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedPropertyId] });
      // Notify others
      const prop = myProps.find(p => p.id === selectedPropertyId);
      if (prop) {
        const otherIds = isLandlord
          ? [prop.tenant_id].filter(Boolean)
          : [prop.landlord_id, ...(prop.landlord_ids || [])].filter(Boolean);
        otherIds.forEach(uid => {
          base44.entities.Notification.create({ user_id: uid, type: 'message', title: 'Ny melding', message: `${user.full_name}: ${message.substring(0, 60)}`, rental_unit_id: selectedPropertyId, read: false });
        });
      }
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() || !selectedPropertyId) return;
    sendMutation.mutate({
      rental_unit_id: selectedPropertyId,
      sender_id: user.id,
      sender_name: user.full_name,
      sender_avatar_url: user.profile_photo_url || null,
      message: message.trim(),
      read: false
    });
    setMessage('');
  };

  const selectedProp = myProps.find(p => p.id === selectedPropertyId);

  if (myProps.length === 0) {
    return (
      <div className="max-w-lg mx-auto p-4 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Ingen eiendommer å chatte om</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
      {/* Property selector */}
      {myProps.length > 1 && (
        <div className="p-3 bg-white border-b border-gray-100 flex gap-2 overflow-x-auto flex-shrink-0">
          {myProps.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPropertyId(p.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${selectedPropertyId === p.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              <Building2 className="w-3 h-3" /> {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Ingen meldinger ennå</p>
              <p className="text-gray-300 text-xs">Start samtalen!</p>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {msg.sender_avatar_url
                      ? <img src={msg.sender_avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs font-bold text-gray-600">{msg.sender_name?.charAt(0)}</span>
                    }
                  </div>
                )}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isMe && <p className="text-xs text-gray-400 px-1">{msg.sender_name}</p>}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-900 border border-gray-100 rounded-tl-sm shadow-sm'}`}>
                    {msg.message}
                  </div>
                  <p className="text-[10px] text-gray-300 px-1">
                    {new Date(msg.created_date).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2 flex-shrink-0">
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={`Skriv til ${selectedProp?.name || '...'}`}
          className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={!message.trim() || sendMutation.isPending}
          className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}