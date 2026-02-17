import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, X, Clock, MapPin, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PendingInvitations({ userEmail }) {
  const queryClient = useQueryClient();
  
  // Normalize email for matching
  const normalizedEmail = userEmail?.toLowerCase().trim();

  console.log('🔵 [PENDING INVITATIONS] Component mounted:', {
    userEmail,
    normalizedEmail,
    timestamp: new Date().toISOString()
  });

  // Fetch pending invitations for this user
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['pendingInvitations', normalizedEmail],
    queryFn: async () => {
      console.log('🔵 [PENDING INVITATIONS] Fetching invitations for:', normalizedEmail);
      
      const invites = await base44.entities.TenantInvitation.filter({
        tenant_email: normalizedEmail,
        status: 'pending'
      });
      
      console.log('✅ [PENDING INVITATIONS] Found invitations:', {
        count: invites.length,
        invitations: invites.map(i => ({
          id: i.id,
          propertyId: i.rental_unit_id,
          status: i.status,
          expiresAt: i.expires_at
        }))
      });
      
      return invites;
    },
    enabled: !!normalizedEmail
  });

  // Fetch properties for invitations
  const { data: properties = {} } = useQuery({
    queryKey: ['invitationProperties', invitations.map(i => i.rental_unit_id)],
    queryFn: async () => {
      if (invitations.length === 0) return {};
      
      const propertyIds = [...new Set(invitations.map(i => i.rental_unit_id))];
      const allProperties = await base44.entities.RentalUnit.list();
      
      const propertiesMap = {};
      allProperties.forEach(prop => {
        if (propertyIds.includes(prop.id)) {
          propertiesMap[prop.id] = prop;
        }
      });
      
      return propertiesMap;
    },
    enabled: invitations.length > 0
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async (invitation) => {
      console.log('🔵 [ACCEPT INVITATION] Starting:', {
        invitationId: invitation.id,
        propertyId: invitation.rental_unit_id,
        token: invitation.token,
        expiresAt: invitation.expires_at,
        now: new Date().toISOString()
      });

      // Check if expired
      const now = new Date();
      const expiresAt = new Date(invitation.expires_at);
      
      if (now > expiresAt) {
        console.error('❌ [ACCEPT INVITATION] Invitation expired:', {
          now: now.toISOString(),
          expiresAt: expiresAt.toISOString()
        });
        throw new Error('Invitasjonen har utløpt');
      }

      // Update invitation status
      await base44.entities.TenantInvitation.update(invitation.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString()
      });

      // Get current user to link
      const user = await base44.auth.me();
      
      // Update property with tenant
      await base44.entities.RentalUnit.update(invitation.rental_unit_id, {
        tenant_id: user.id,
        tenant_email: normalizedEmail,
        status: 'occupied'
      });

      // Mark related notifications as read
      const notifications = await base44.entities.Notification.filter({
        related_id: invitation.id,
        read: false
      });
      
      for (const notif of notifications) {
        await base44.entities.Notification.update(notif.id, { read: true });
      }

      console.log('✅ [ACCEPT INVITATION] Success');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['rentalUnits'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Invitasjon akseptert! 🎉');
    },
    onError: (error) => {
      console.error('❌ [ACCEPT INVITATION] Failed:', error);
      toast.error(error.message || 'Kunne ikke akseptere invitasjon');
    }
  });

  // Decline invitation mutation
  const declineMutation = useMutation({
    mutationFn: async (invitationId) => {
      await base44.entities.TenantInvitation.update(invitationId, {
        status: 'cancelled'
      });
      
      // Mark related notifications as read
      const notifications = await base44.entities.Notification.filter({
        related_id: invitationId,
        read: false
      });
      
      for (const notif of notifications) {
        await base44.entities.Notification.update(notif.id, { read: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Invitasjon avslått');
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-slate-500">Laster invitasjoner...</div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null; // Don't show if no invitations
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Ventende invitasjoner
          <Badge className="bg-blue-600">{invitations.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((invitation) => {
          const property = properties[invitation.rental_unit_id];
          const expiresAt = new Date(invitation.expires_at);
          const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
          
          return (
            <div key={invitation.id} className="bg-white rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">
                    {property?.name || 'Laster...'}
                  </h3>
                  {property?.address && (
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                      <MapPin className="w-3 h-3" />
                      {property.address}
                    </div>
                  )}
                  {property?.monthly_rent && (
                    <div className="text-sm text-slate-600 mt-1">
                      <strong>{property.monthly_rent.toLocaleString()} kr</strong> / måned
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-amber-600 mt-2">
                    <Calendar className="w-3 h-3" />
                    Utløper om {daysLeft} dag{daysLeft !== 1 ? 'er' : ''}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => acceptMutation.mutate(invitation)}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {acceptMutation.isPending ? 'Aksepterer...' : 'Aksepter'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => declineMutation.mutate(invitation.id)}
                  disabled={acceptMutation.isPending || declineMutation.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}