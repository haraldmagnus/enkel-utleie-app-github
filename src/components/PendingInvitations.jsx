import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, Check, X, Clock } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function PendingInvitations({ userId, userEmail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['pendingInvitations', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      const normalizedEmail = userEmail.toLowerCase().trim();
      const invites = await base44.entities.TenantInvitation.filter({
        tenant_email: normalizedEmail,
        status: 'pending'
      });
      
      console.log('🔵 [PENDING INVITES] Found:', {
        email: normalizedEmail,
        count: invites.length,
        invites: invites.map(inv => ({
          id: inv.id,
          propertyId: inv.rental_unit_id,
          expiresAt: inv.expires_at
        }))
      });
      
      // Filter out expired
      const now = new Date();
      return invites.filter(inv => new Date(inv.expires_at) > now);
    },
    enabled: !!userEmail,
    refetchInterval: 30000 // Refresh every 30s
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['invitedProperties', pendingInvites],
    queryFn: async () => {
      if (pendingInvites.length === 0) return [];
      const propertyIds = pendingInvites.map(inv => inv.rental_unit_id);
      const props = await Promise.all(
        propertyIds.map(id => 
          base44.entities.RentalUnit.filter({ id }).then(p => p[0])
        )
      );
      return props.filter(Boolean);
    },
    enabled: pendingInvites.length > 0
  });

  const acceptMutation = useMutation({
    mutationFn: async (invitation) => {
      console.log('🔵 [PENDING INVITES] Accepting:', invitation.id);
      
      // Update invitation
      await base44.entities.TenantInvitation.update(invitation.id, {
        status: 'accepted',
        accepted_by_user_id: userId,
        accepted_at: new Date().toISOString()
      });
      
      // Link to property
      await base44.entities.RentalUnit.update(invitation.rental_unit_id, {
        tenant_id: userId,
        tenant_email: userEmail.toLowerCase(),
        status: 'occupied'
      });
      
      // Set role to tenant
      await base44.auth.updateMe({ 
        active_role: 'tenant',
        user_role: 'tenant'
      });
      
      console.log('✅ [PENDING INVITES] Accepted successfully');
      return invitation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] });
      queryClient.invalidateQueries({ queryKey: ['rentalUnits'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate(createPageUrl('TenantDashboard'), { replace: true });
    },
    onError: (error) => {
      console.error('❌ [PENDING INVITES] Accept failed:', error);
      alert('Kunne ikke akseptere invitasjon: ' + error.message);
    }
  });

  const declineMutation = useMutation({
    mutationFn: async (invitationId) => {
      console.log('🔵 [PENDING INVITES] Declining:', invitationId);
      await base44.entities.TenantInvitation.update(invitationId, {
        status: 'cancelled'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] });
    }
  });

  if (pendingInvites.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pendingInvites.map((invite, idx) => {
        const property = properties.find(p => p?.id === invite.rental_unit_id);
        if (!property) return null;
        
        const expiresAt = new Date(invite.expires_at);
        const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
        
        return (
          <Card key={invite.id} className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-blue-900">{property.name}</h3>
                      <p className="text-sm text-blue-700">{property.address}</p>
                    </div>
                    <Badge variant="outline" className="bg-white border-blue-300 text-blue-700">
                      <Clock className="w-3 h-3 mr-1" />
                      {daysLeft}d igjen
                    </Badge>
                  </div>
                  
                  {property.monthly_rent && (
                    <p className="text-sm text-blue-600 mb-3">
                      💰 {property.monthly_rent.toLocaleString()} kr/mnd
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 flex-1"
                      onClick={() => acceptMutation.mutate(invite)}
                      disabled={acceptMutation.isPending}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Aksepter
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => declineMutation.mutate(invite.id)}
                      disabled={declineMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}