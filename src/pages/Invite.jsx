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
  const [state, setState] = useState('INIT'); // INIT → VALIDATING → READY → ACCEPTING → DONE
  const [acceptCalled, setAcceptCalled] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    retry: false
  });

  const { data: invitation, isLoading: inviteLoading, error } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const invites = await base44.entities.TenantInvitation.filter({ token });
      return invites[0];
    },
    enabled: !!token
  });

  const { data: property } = useQuery({
    queryKey: ['property', invitation?.rental_unit_id],
    queryFn: async () => {
      const props = await base44.entities.RentalUnit.filter({ id: invitation.rental_unit_id });
      return props[0];
    },
    enabled: !!invitation?.rental_unit_id
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      console.log('🔵 [STATE: ACCEPTING] Starting acceptance:', { 
        invitationId: invitation.id,
        userEmail: user.email,
        tenantEmail: invitation.tenant_email,
        currentStatus: invitation.status
      });

      // Idempotency check
      if (invitation.status === 'accepted') {
        console.log('ℹ️ Already accepted - idempotent return');
        return { needsProfile: false, alreadyAccepted: true };
      }

      // Validate email match
      if (user.email.toLowerCase() !== invitation.tenant_email.toLowerCase()) {
        throw new Error('EMAIL_MISMATCH');
      }

      // Check expiration
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('EXPIRED');
      }

      // Update invitation (with optimistic idempotency)
      try {
        await base44.entities.TenantInvitation.update(invitation.id, {
          status: 'accepted',
          accepted_by_user_id: user.id,
          accepted_at: new Date().toISOString()
        });
        console.log('✅ Invitation status updated');
      } catch (updateError) {
        console.log('⚠️ Invitation update failed (may already be accepted):', updateError);
      }

      // Link tenant to property
      await base44.entities.RentalUnit.update(invitation.rental_unit_id, {
        tenant_id: user.id,
        tenant_email: user.email.toLowerCase(),
        status: 'occupied'
      });
      console.log('✅ Property linked to tenant');

      // Set active_role to tenant
      try {
        await base44.auth.updateMe({ 
          active_role: 'tenant',
          user_role: user.user_role || 'tenant'
        });
        console.log('✅ Active role → tenant');
      } catch (e) {
        console.log('⚠️ Using localStorage fallback for role');
        localStorage.setItem('user_role_override', 'tenant');
      }
      
      const needsProfile = !user.full_name || !user.birth_date || !user.phone_number;
      // Mark related notification as read
      try {
        const notifications = await base44.entities.Notification.filter({
          user_id: user.id,
          related_id: invitation.id,
          read: false
        });
        for (const notif of notifications) {
          await base44.entities.Notification.update(notif.id, { read: true });
        }
        console.log('✅ Notification(s) marked as read');
      } catch (e) {
        console.log('⚠️ Could not update notifications:', e);
      }
      
      console.log('✅ [STATE: DONE] Acceptance complete:', { needsProfile });
      
      return { needsProfile, alreadyAccepted: false };
    },
    onSuccess: (data) => {
      setState('DONE');
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      queryClient.invalidateQueries({ queryKey: ['rentalUnits'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      
      // Clear token from URL
      window.history.replaceState({}, '', createPageUrl('Invite'));
      
      // Redirect
      setTimeout(() => {
        if (data.needsProfile) {
          navigate(createPageUrl('CompleteProfile'), { replace: true });
        } else {
          navigate(createPageUrl('TenantDashboard'), { replace: true });
        }
      }, 1500);
    },
    onError: (error) => {
      setState('ERROR');
      console.error('❌ [STATE: ERROR]', error);
    }
  });

  // State machine with guard
  useEffect(() => {
    if (!token) return;
    
    // VALIDATING
    if (userLoading || inviteLoading) {
      if (state !== 'VALIDATING') {
        setState('VALIDATING');
        console.log('🔵 [STATE: VALIDATING] Loading data...');
      }
      return;
    }

    // ERROR states (no user/invitation)
    if (!user || !invitation) {
      setState('ERROR');
      return;
    }

    // Check conditions
    const isExpired = new Date(invitation.expires_at) < new Date();
    const emailMatches = user.email.toLowerCase() === invitation.tenant_email.toLowerCase();
    const isPending = invitation.status === 'pending';
    const isAccepted = invitation.status === 'accepted';
    
    console.log('🔵 [STATE: ' + state + '] Validation:', {
      isPending,
      isAccepted,
      isExpired,
      emailMatches,
      acceptCalled,
      mutationPending: acceptMutation.isPending
    });

    // Already accepted → DONE
    if (isAccepted && state !== 'DONE') {
      console.log('✅ [STATE: DONE] Already accepted');
      setState('DONE');
      setTimeout(() => {
        navigate(createPageUrl('TenantDashboard'), { replace: true });
      }, 1500);
      return;
    }

    // READY state (all checks pass, can accept)
    if (isPending && !isExpired && emailMatches && state === 'VALIDATING') {
      setState('READY');
      console.log('✅ [STATE: READY] Ready to accept');
    }

    // Auto-accept (only once, with guard)
    if (state === 'READY' && !acceptCalled && !acceptMutation.isPending) {
      console.log('🔵 [STATE: ACCEPTING] Triggering accept...');
      setState('ACCEPTING');
      setAcceptCalled(true);
      acceptMutation.mutate();
    }
  }, [user, invitation, token, userLoading, inviteLoading, state, acceptCalled, acceptMutation.isPending]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ugyldig invitasjonslenke</h2>
            <p className="text-slate-600 mb-4">Denne lenken mangler en invitasjonskode.</p>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
              Gå til forsiden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'VALIDATING' || state === 'ACCEPTING') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600 font-medium">
              {state === 'VALIDATING' ? 'Validerer invitasjon...' : 'Knytter deg til bolig...'}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              {state === 'ACCEPTING' && 'Dette tar bare noen sekunder'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-center">Du er invitert!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {property && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">{property.name}</p>
                    <p className="text-sm text-blue-700">{property.address}</p>
                  </div>
                </div>
              </div>
            )}
            <p className="text-center text-slate-600">
              Du må logge inn for å akseptere invitasjonen
            </p>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => base44.auth.redirectToLogin(window.location.href)}
            >
              Logg inn / Registrer deg
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitasjon ikke funnet</h2>
            <p className="text-slate-600 mb-4">
              Denne invitasjonen eksisterer ikke eller er ugyldig.
            </p>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
              Gå til forsiden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if already accepted
  if (invitation.status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Allerede akseptert!</h2>
            <p className="text-slate-600 mb-4">
              Du er allerede tilknyttet denne boligen.
            </p>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => navigate(createPageUrl('TenantDashboard'))}
            >
              Gå til min bolig
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if cancelled
  if (invitation.status === 'cancelled') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitasjon kansellert</h2>
            <p className="text-slate-600 mb-4">
              Denne invitasjonen er kansellert av utleier.
            </p>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
              Gå til forsiden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invitasjon utløpt</h2>
            <p className="text-slate-600 mb-4">
              Denne invitasjonen har utløpt. Kontakt utleier for å få en ny invitasjon.
            </p>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
              Gå til forsiden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check email mismatch
  if (user.email.toLowerCase() !== invitation.tenant_email.toLowerCase()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Feil e-postadresse</h2>
            <p className="text-slate-600 mb-4">
              Denne invitasjonen er sendt til <strong>{invitation.tenant_email}</strong>.
              <br />
              Du er logget inn som <strong>{user.email}</strong>.
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Logg ut og logg inn med riktig e-post for å akseptere invitasjonen.
            </p>
            <Button 
              variant="outline"
              onClick={() => base44.auth.logout()}
            >
              Logg ut
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (state === 'DONE' || acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Velkommen!</h2>
            <p className="text-slate-600 mb-4">
              Du er nå tilknyttet {property?.name || 'boligen'}.
            </p>
            <p className="text-xs text-slate-400">Videresender...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (state === 'ERROR' && acceptMutation.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Noe gikk galt</h2>
            <p className="text-slate-600 mb-4">
              {acceptMutation.error?.message || 'Kunne ikke akseptere invitasjonen'}
            </p>
            <Button onClick={() => {
              setState('READY');
              setAcceptCalled(false);
            }}>
              Prøv igjen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}