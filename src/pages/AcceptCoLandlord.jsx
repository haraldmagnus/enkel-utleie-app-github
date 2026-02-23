import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, CheckCircle2, XCircle, Loader2, MapPin } from 'lucide-react';

export default function AcceptCoLandlord() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [state, setState] = useState('LOADING');
  const [errorMsg, setErrorMsg] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: invitation } = useQuery({
    queryKey: ['coLandlordInvitation', token],
    queryFn: () => base44.entities.CoLandlordInvitation.filter({ token }),
    select: (d) => d[0],
    enabled: !!token
  });

  const { data: property } = useQuery({
    queryKey: ['property', invitation?.rental_unit_id],
    queryFn: () => base44.entities.RentalUnit.filter({ id: invitation.rental_unit_id }),
    select: (d) => d[0],
    enabled: !!invitation?.rental_unit_id
  });

  useEffect(() => {
    if (!token) { setState('ERROR'); setErrorMsg('Ugyldig invitasjonslenke.'); return; }
    if (!invitation || !property) return;
    if (!user) { base44.auth.redirectToLogin(window.location.href); return; }
    if (invitation.status === 'accepted') { setState('ALREADY'); return; }
    if (invitation.status === 'cancelled' || invitation.status === 'declined') { setState('ERROR'); setErrorMsg('Denne invitasjonen er kansellert.'); return; }
    if (new Date(invitation.expires_at) < new Date()) { setState('EXPIRED'); return; }
    const userEmail = user.email?.toLowerCase();
    const inviteEmail = invitation.co_landlord_email?.toLowerCase();
    if (userEmail !== inviteEmail) { setState('ERROR'); setErrorMsg(`Denne invitasjonen er sendt til ${invitation.co_landlord_email}, men du er logget inn som ${user.email}.`); return; }
    setState('READY');
  }, [token, invitation, property, user]);

  const handleAccept = async () => {
    setState('ACCEPTING');
    const existingIds = property.landlord_ids || [property.landlord_id];
    const updatedIds = [...new Set([...existingIds, user.id])];
    await base44.entities.RentalUnit.update(property.id, { landlord_ids: updatedIds });
    await base44.entities.CoLandlordInvitation.update(invitation.id, { status: 'accepted', accepted_by_user_id: user.id, accepted_at: new Date().toISOString() });
    if (!user.user_role || user.user_role !== 'landlord') await base44.auth.updateMe({ user_role: 'landlord', active_role: 'landlord' });
    try { await base44.entities.Notification.create({ user_id: invitation.inviting_landlord_id, type: 'agreement', title: 'Medutleier akseptert', message: `${user.full_name || user.email} har akseptert å bli medutleier på ${property.name}`, rental_unit_id: property.id, read: false }); } catch (e) {}
    setState('DONE');
  };

  const handleDecline = async () => {
    await base44.entities.CoLandlordInvitation.update(invitation.id, { status: 'declined' });
    setState('ERROR');
    setErrorMsg('Du har avslått invitasjonen.');
  };

  if (state === 'LOADING') return <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  if (state === 'DONE') return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-sm w-full"><CardContent className="pt-8 pb-8 text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Invitasjon akseptert!</h2>
        <p className="text-slate-500 text-sm">Du er nå medutleier på <strong>{property?.name}</strong>.</p>
        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => navigate(createPageUrl('Dashboard'))}>Gå til dashbordet</Button>
      </CardContent></Card>
    </div>
  );

  if (state === 'ALREADY') return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-sm w-full"><CardContent className="pt-8 pb-8 text-center space-y-4">
        <CheckCircle2 className="w-16 h-16 text-blue-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Allerede akseptert</h2>
        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => navigate(createPageUrl('Dashboard'))}>Gå til dashbordet</Button>
      </CardContent></Card>
    </div>
  );

  if (state === 'EXPIRED') return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-sm w-full"><CardContent className="pt-8 pb-8 text-center space-y-4">
        <XCircle className="w-16 h-16 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Invitasjonen er utløpt</h2>
        <p className="text-slate-500 text-sm">Be utleieren om å sende en ny invitasjon.</p>
      </CardContent></Card>
    </div>
  );

  if (state === 'ERROR') return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-sm w-full"><CardContent className="pt-8 pb-8 text-center space-y-4">
        <XCircle className="w-16 h-16 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Noe gikk galt</h2>
        <p className="text-slate-500 text-sm">{errorMsg}</p>
        <Button variant="outline" className="w-full" onClick={() => navigate(createPageUrl('Dashboard'))}>Tilbake til appen</Button>
      </CardContent></Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-sm w-full"><CardContent className="pt-8 pb-8 space-y-6">
        <div className="text-center">
          <Building2 className="w-14 h-14 text-blue-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-800">Invitasjon til medutleier</h2>
          <p className="text-slate-500 text-sm mt-1">Du er invitert til å bli medutleier</p>
        </div>
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 space-y-1">
          <p className="font-semibold text-blue-900">{property?.name}</p>
          <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {property?.address}</p>
          {property?.monthly_rent && <p className="text-sm font-medium text-green-700">{property.monthly_rent.toLocaleString()} kr/måned</p>}
        </div>
        <div className="flex flex-col gap-3">
          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleAccept} disabled={state === 'ACCEPTING'}>
            {state === 'ACCEPTING' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Aksepter invitasjon
          </Button>
          <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50" onClick={handleDecline} disabled={state === 'ACCEPTING'}>Avslå invitasjon</Button>
        </div>
      </CardContent></Card>
    </div>
  );
}