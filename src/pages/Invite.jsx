import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Invite() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState('INIT');
  const [acceptCalled, setAcceptCalled] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), retry: false });

  const { data: invitation, isLoading: inviteLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => { const invites = await base44.entities.TenantInvitation.filter({ token }); return invites[0]; },
    enabled: !!token
  });

  const { data: property } = useQuery({
    queryKey: ['property', invitation?.rental_unit_id],
    queryFn: async () => { const props = await base44.entities.RentalUnit.filter({ id: invitation.rental_unit_id }); return props[0]; },
    enabled: !!invitation?.rental_unit_id
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (invitation.status === 'accepted') return { alreadyAccepted: true };
      if (user.email.toLowerCase() !== invitation.tenant_email.toLowerCase()) throw new Error('EMAIL_MISMATCH');
      if (new Date(invitation.expires_at) < new Date()) throw new Error('EXPIRED');

      try { await base44.entities.TenantInvitation.update(invitation.id, { status: 'accepted', accepted_by_user_id: user.id, accepted_at: new Date().toISOString() }); } catch (e) {}
      await base44.entities.RentalUnit.update(invitation.rental_unit_id, { tenant_id: user.id, tenant_email: user.email.toLowerCase(), status: 'occupied' });
      try { await base44.auth.updateMe({ active_role: 'tenant', user_role: user.user_role || 'tenant' }); } catch (e) { localStorage.setItem('user_role_override', 'tenant'); }

      return { alreadyAccepted: false };
    },
    onSuccess: () => {
      setState('DONE');
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      queryClient.invalidateQueries({ queryKey: ['rentalUnits'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      window.history.replaceState({}, '', createPageUrl('Invite'));
      setTimeout(() => navigate(createPageUrl('TenantDashboard'), { replace: true }), 2000);
    },
    onError: () => setState('ERROR')
  });

  useEffect(() => {
    if (!token) return;
    if (userLoading || inviteLoading) { if (state !== 'VALIDATING') setState('VALIDATING'); return; }
    if (!user || !invitation) { setState('ERROR'); return; }

    const isExpired = new Date(invitation.expires_at) < new Date();
    const emailMatches = user.email.toLowerCase() === invitation.tenant_email.toLowerCase();
    const isPending = invitation.status === 'pending';
    const isAccepted = invitation.status === 'accepted';

    if (isAccepted && state !== 'DONE') { setState('DONE'); setTimeout(() => navigate(createPageUrl('TenantDashboard'), { replace: true }), 1500); return; }
    if (isPending && !isExpired && emailMatches && state === 'VALIDATING') setState('READY');
    if (state === 'READY' && !acceptCalled && !acceptMutation.isPending) { setState('ACCEPTING'); setAcceptCalled(true); acceptMutation.mutate(); }
  }, [user, invitation, token, userLoading, inviteLoading, state, acceptCalled, acceptMutation.isPending]);

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <Card className="max-w-md w-full"><CardContent className="p-6 text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Ugyldig invitasjonslenke</h2>
        <Button onClick={() => navigate(createPageUrl('Dashboard'))}>Gå til forsiden</Button>
      </CardContent></Card>
    </div>
  );

  if (state === 'VALIDATING' || state === 'ACCEPTING') return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <Card className="max-w-md w-full"><CardContent className="p-6 text-center">
        <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
        <p className="text-slate-600 font-medium">{state === 'VALIDATING' ? 'Validerer invitasjon...' : 'Knytter deg til bolig...'}</p>
      </CardContent></Card>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <Card className="max-w-md w-full">
        <CardHeader><CardTitle className="text-center">Du er invitert!</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {property && (<div className="bg-blue-50 p-4 rounded-lg"><div className="flex items-start gap-3"><Home className="w-5 h-5 text-blue-600 mt-0.5" /><div><p className="font-medium text-blue-900">{property.name}</p><p className="text-sm text-blue-700">{property.address}</p></div></div></div>)}
          <p className="text-center text-slate-600 text-sm">Logg inn eller opprett konto for å akseptere invitasjonen.</p>
          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => base44.auth.redirectToLogin(window.location.href)}>Logg inn / Registrer deg</Button>
        </CardContent>
      </Card>
    </div>
  );

  if (invitation?.status === 'accepted') return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <Card className="max-w-md w-full"><CardContent className="p-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-4">Allerede akseptert!</h2>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate(createPageUrl('TenantDashboard'))}>Gå til min bolig</Button>
      </CardContent></Card>
    </div>
  );

  if (state === 'DONE' || acceptMutation.isSuccess) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <Card className="max-w-md w-full"><CardContent className="p-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-12 h-12 text-green-500" /></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Alt er klart! 🎉</h2>
        <p className="text-slate-600 mb-4">Du er nå tilknyttet {property?.name || 'boligen'}.</p>
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin mx-auto" />
      </CardContent></Card>
    </div>
  );

  if (error || !invitation) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <Card className="max-w-md w-full"><CardContent className="p-6 text-center">
        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-4">Invitasjon ikke funnet</h2>
        <Button onClick={() => navigate(createPageUrl('Dashboard'))}>Gå til forsiden</Button>
      </CardContent></Card>
    </div>
  );

  return null;
}