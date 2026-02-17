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
  const [processing, setProcessing] = useState(false);
  
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
      console.log('🔵 Accepting invitation:', { 
        invitationId: invitation.id,
        userEmail: user.email,
        tenantEmail: invitation.tenant_email 
      });

      // Validate email match (case-insensitive)
      if (user.email.toLowerCase() !== invitation.tenant_email.toLowerCase()) {
        throw new Error('EMAIL_MISMATCH');
      }

      // Check expiration
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('EXPIRED');
      }

      // Update invitation status
      await base44.entities.TenantInvitation.update(invitation.id, {
        status: 'accepted',
        accepted_by_user_id: user.id,
        accepted_at: new Date().toISOString()
      });

      // Link tenant to property
      await base44.entities.RentalUnit.update(invitation.rental_unit_id, {
        tenant_id: user.id,
        tenant_email: user.email,
        status: 'occupied'
      });

      // Update user role if needed
      if (!user.role) {
        try {
          await base44.auth.updateMe({ role: 'tenant' });
        } catch (e) {
          console.log('Could not update role via API');
        }
      }

      console.log('✅ Invitation accepted successfully');
      
      // Check if tenant profile is complete
      const needsProfile = !user.full_name || !user.birth_date || !user.phone_number;
      console.log('🔵 Profile check:', { 
        hasFullName: !!user.full_name, 
        hasBirthDate: !!user.birth_date, 
        hasPhoneNumber: !!user.phone_number,
        needsProfile 
      });
      
      return { needsProfile };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitation'] });
      queryClient.invalidateQueries({ queryKey: ['rentalUnits'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      
      // Redirect based on profile completeness
      if (data.needsProfile) {
        navigate(createPageUrl('CompleteProfile'), { replace: true });
      }
    }
  });

  useEffect(() => {
    if (!token) return;
    if (userLoading || inviteLoading) return;
    if (!user || !invitation) return;
    if (processing) return;

    // Check role match first
    if (user.role && user.role !== 'tenant') {
      console.log('❌ Wrong role trying to accept tenant invitation:', user.role);
      return; // Don't auto-accept, show error UI
    }

    // Auto-accept if status is pending and not expired
    if (invitation.status === 'pending' && new Date(invitation.expires_at) > new Date()) {
      if (user.email.toLowerCase() === invitation.tenant_email.toLowerCase()) {
        setProcessing(true);
        acceptMutation.mutate();
      }
    }
  }, [user, invitation, token, userLoading, inviteLoading, processing]);

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

  if (userLoading || inviteLoading || processing) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600">
              {userLoading ? 'Henter brukerdata...' : 'Behandler invitasjon...'}
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

  // Check role mismatch (must be tenant)
  if (user.role && user.role !== 'tenant') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Feil rolle</h2>
            <p className="text-slate-600 mb-4">
              Denne invitasjonen kan kun aksepteres av en <strong>LEIETAKER</strong>-konto.
              <br />
              Du er logget inn som <strong>{user.role === 'landlord' ? 'UTLEIER' : 'ADMIN'}</strong>.
            </p>
            <p className="text-sm text-slate-500 mb-4">
              Logg ut og logg inn med en leietaker-konto, eller opprett en ny konto som leietaker med riktig e-post.
            </p>
            <div className="space-y-2">
              <Button 
                className="w-full"
                onClick={() => base44.auth.logout()}
              >
                Logg ut
              </Button>
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => navigate(createPageUrl('Dashboard'))}
              >
                Gå til forsiden
              </Button>
            </div>
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

  // Success state (should auto-accept above, but show success anyway)
  if (acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Velkommen!</h2>
            <p className="text-slate-600 mb-4">
              Du er nå tilknyttet {property?.name || 'boligen'}.
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

  // Error state
  if (acceptMutation.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Noe gikk galt</h2>
            <p className="text-slate-600 mb-4">
              {acceptMutation.error?.message || 'Kunne ikke akseptere invitasjonen'}
            </p>
            <Button onClick={() => acceptMutation.mutate()}>
              Prøv igjen
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}