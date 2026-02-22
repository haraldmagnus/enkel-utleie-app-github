import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Mail, X, Edit2, BedDouble, Check, Clock } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function SharedHousingRooms({ property, user, onUpdate }) {
  const rooms = property.rooms || [];
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomRent, setNewRoomRent] = useState('');
  const [editingRoom, setEditingRoom] = useState(null);
  const [inviteRoomId, setInviteRoomId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);

  // Fetch all pending invitations for this property to check status
  const { data: invitations = [] } = useQuery({
    queryKey: ['tenantInvitations', property.id],
    queryFn: () => base44.entities.TenantInvitation.filter({ rental_unit_id: property.id }),
    enabled: !!property.id
  });

  // Find the latest invitation for a room's tenant_email
  const getInvitationForRoom = (room) => {
    if (!room.tenant_email) return null;
    const roomInvites = invitations
      .filter(inv => inv.tenant_email === room.tenant_email)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    return roomInvites[0] || null;
  };

  const saveRooms = (updatedRooms) => onUpdate({ rooms: updatedRooms });

  const nextRoomNumber = rooms.length + 1;

  const handleAddRoom = () => {
    const name = newRoomName.trim() || `Soverom ${nextRoomNumber}`;
    const id = Math.random().toString(36).substring(2);
    saveRooms([...rooms, { id, name, monthly_rent: Number(newRoomRent) || 0, status: 'vacant', tenant_email: '', tenant_id: '', tenant_name: '' }]);
    setNewRoomName('');
    setNewRoomRent('');
    setShowAddRoom(false);
  };

  const handleDeleteRoom = (roomId) => {
    if (!confirm('Slett dette rommet?')) return;
    saveRooms(rooms.filter(r => r.id !== roomId));
  };

  const handleSaveEdit = () => {
    saveRooms(rooms.map(r => r.id === editingRoom.id ? editingRoom : r));
    setEditingRoom(null);
  };

  const handleInviteTenant = async () => {
    if (!inviteEmail || !inviteRoomId) return;
    setSending(true);
    const cleanEmail = inviteEmail.toLowerCase().trim();
    const room = rooms.find(r => r.id === inviteRoomId);

    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await base44.entities.TenantInvitation.create({
      rental_unit_id: property.id,
      landlord_id: user.id,
      tenant_email: cleanEmail,
      token,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    });

    saveRooms(rooms.map(r => r.id === inviteRoomId
      ? { ...r, status: 'pending_invitation', tenant_email: cleanEmail }
      : r
    ));

    const inviteUrl = `${window.location.origin}${createPageUrl('Invite')}?token=${token}`;

    try {
      await base44.integrations.Core.SendEmail({
        to: cleanEmail,
        from_name: 'Enkel Utleie',
        subject: `Invitasjon til ${room.name} – ${property.name}`,
        body: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f5f5f5;padding:20px;">
<table width="600" style="background:white;border-radius:12px;overflow:hidden;margin:auto;">
  <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 24px;text-align:center;">
    <h1 style="margin:0;color:white;font-size:22px;">🛏 Invitasjon til bofellesskap</h1>
  </td></tr>
  <tr><td style="padding:32px 24px;">
    <p style="font-size:16px;color:#1f2937;">Hei!</p>
    <p style="font-size:15px;color:#374151;">${user?.full_name || 'En utleier'} inviterer deg til å leie:</p>
    <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:17px;font-weight:600;color:#1e40af;">${room.name}</p>
      <p style="margin:0 0 4px;font-size:14px;color:#4b5563;">📍 ${property.name} – ${property.address}</p>
      ${room.monthly_rent ? `<p style="margin:8px 0 0;font-size:15px;color:#059669;font-weight:600;">💰 ${room.monthly_rent.toLocaleString()} kr/måned</p>` : ''}
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td align="center">
        <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">
          Aksepter invitasjon
        </a>
      </td></tr>
    </table>
    <p style="font-size:13px;color:#9ca3af;text-align:center;">⏰ Invitasjonen er gyldig i 7 dager</p>
  </td></tr>
</table></body></html>`
      });
    } catch (e) { console.error(e); }

    setInviteRoomId(null);
    setInviteEmail('');
    setSending(false);
    alert(`Invitasjon sendt til ${cleanEmail}!`);
  };

  const statusColors = {
    vacant: 'bg-green-100 text-green-700',
    occupied: 'bg-blue-100 text-blue-700',
    pending_invitation: 'bg-yellow-100 text-yellow-700'
  };

  // Compute effective room status: if invitation is accepted → occupied
  const getEffectiveRoom = (room) => {
    if (room.status === 'pending_invitation') {
      const inv = getInvitationForRoom(room);
      if (inv?.status === 'accepted') {
        return { ...room, status: 'occupied', tenant_name: room.tenant_name || room.tenant_email };
      }
    }
    return room;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BedDouble className="w-4 h-4" /> Rom i bofellesskapet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rooms.length === 0 && (
          <p className="text-sm text-slate-500">Ingen rom lagt til ennå.</p>
        )}

        {rooms.map(rawRoom => {
          const room = getEffectiveRoom(rawRoom);
          const inv = getInvitationForRoom(room);
          return (
            <div key={room.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-800">{room.name}</p>
                  {room.monthly_rent > 0 && (
                    <p className="text-sm text-blue-600 font-medium">{room.monthly_rent.toLocaleString()} kr/mnd</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${statusColors[room.status]} border-0 text-xs`}>
                    {room.status === 'vacant' ? 'Ledig' : room.status === 'occupied' ? 'Utleid' : 'Venter'}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingRoom({ ...rawRoom })}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeleteRoom(room.id)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {room.status === 'occupied' && room.tenant_email && (
                <div className="flex items-center justify-between bg-blue-50 rounded p-2">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-green-600" />
                    <p className="text-xs text-blue-700">{room.tenant_name || room.tenant_email}</p>
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 text-xs text-red-500 px-2"
                    onClick={() => {
                      if (confirm(`Fjerne leietaker fra ${room.name}?`)) {
                        saveRooms(rooms.map(r => r.id === room.id
                          ? { ...r, status: 'vacant', tenant_email: '', tenant_id: '', tenant_name: '' }
                          : r
                        ));
                      }
                    }}
                  >Fjern</Button>
                </div>
              )}

              {room.status === 'pending_invitation' && (
                <div className="bg-yellow-50 rounded p-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-yellow-600" />
                    <p className="text-xs text-yellow-700">Venter: {room.tenant_email}</p>
                    {inv && (
                      <span className="text-xs text-yellow-600">({inv.status === 'pending' ? 'ikke akseptert ennå' : inv.status})</span>
                    )}
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    className="h-6 text-xs text-red-500 px-2"
                    onClick={() => saveRooms(rooms.map(r => r.id === room.id
                      ? { ...r, status: 'vacant', tenant_email: '' }
                      : r
                    ))}
                  >Kanseller</Button>
                </div>
              )}

              {room.status === 'vacant' && (
                <Button
                  variant="outline" size="sm"
                  className="w-full text-xs"
                  onClick={() => { setInviteRoomId(room.id); setInviteEmail(''); }}
                >
                  <Mail className="w-3 h-3 mr-1" /> Inviter leietaker
                </Button>
              )}
            </div>
          );
        })}

        <Button variant="outline" size="sm" className="w-full" onClick={() => { setNewRoomName(`Soverom ${nextRoomNumber}`); setNewRoomRent(''); setShowAddRoom(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Legg til rom
        </Button>
      </CardContent>

      {/* Add Room Dialog */}
      <Dialog open={showAddRoom} onOpenChange={setShowAddRoom}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Legg til rom</DialogTitle>
            <DialogDescription>Gi rommet et navn og sett husleie for dette rommet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Romnavn</label>
              <Input placeholder={`Soverom ${nextRoomNumber}`} value={newRoomName} onChange={e => setNewRoomName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Husleie (kr/mnd)</label>
              <Input type="number" placeholder="0" value={newRoomRent} onChange={e => setNewRoomRent(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRoom(false)}>Avbryt</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleAddRoom}>Legg til</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Room Dialog */}
      <Dialog open={!!editingRoom} onOpenChange={() => setEditingRoom(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rediger rom</DialogTitle></DialogHeader>
          {editingRoom && (
            <div className="space-y-3 py-2">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Romnavn</label>
                <Input value={editingRoom.name} onChange={e => setEditingRoom({ ...editingRoom, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Husleie (kr/mnd)</label>
                <Input type="number" value={editingRoom.monthly_rent} onChange={e => setEditingRoom({ ...editingRoom, monthly_rent: Number(e.target.value) })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRoom(null)}>Avbryt</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSaveEdit}>Lagre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Tenant to Room Dialog */}
      <Dialog open={!!inviteRoomId} onOpenChange={() => setInviteRoomId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inviter leietaker til {rooms.find(r => r.id === inviteRoomId)?.name}</DialogTitle>
            <DialogDescription>Leietakeren vil motta en e-post med invitasjonslenke.</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Input type="email" placeholder="leietaker@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteRoomId(null)}>Avbryt</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" disabled={!inviteEmail || sending} onClick={handleInviteTenant}>
              {sending ? 'Sender...' : 'Send invitasjon'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}