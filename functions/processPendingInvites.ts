import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Called after user signup to check for pending tenant invitations
 * and send property invitation emails
 */
Deno.serve(async (req) => {
  try {
    console.log('🔵 [PROCESS PENDING] ===== CHECKING PENDING INVITES =====');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = user.email.toLowerCase();
    console.log('🔵 [PROCESS PENDING] User:', userEmail);

    // Use service role to access all data
    const serviceBase44 = base44.asServiceRole;

    // Find pending requests for this email
    const pendingRequests = await serviceBase44.entities.PendingTenantRequest.filter({
      tenant_email: userEmail,
      status: 'pending_signup'
    });

    console.log('🔵 [PROCESS PENDING] Found pending requests:', pendingRequests.length);

    const processed = [];

    for (const request of pendingRequests) {
      try {
        console.log('🔵 [PROCESS PENDING] Processing request:', request.id);

        // Generate invitation token
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        // Create property invitation
        await serviceBase44.entities.TenantInvitation.create({
          rental_unit_id: request.rental_unit_id,
          landlord_id: request.landlord_id,
          tenant_email: userEmail,
          token,
          status: 'pending',
          expires_at: expiresAt.toISOString()
        });

        console.log('✅ [PROCESS PENDING] Created invitation:', token);

        // Get property details
        const properties = await serviceBase44.entities.RentalUnit.filter({
          id: request.rental_unit_id
        });
        const property = properties[0];

        // Send property invitation email
        if (property) {
          const inviteUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.com'}/pages/Invite?token=${token}`;
          
          await serviceBase44.integrations.Core.SendEmail({
            to: userEmail,
            subject: `Invitasjon til ${property.name}`,
            body: `
              <h2>Du er invitert til å knytte deg til en bolig!</h2>
              <p>Du har blitt invitert til følgende bolig:</p>
              <p><strong>${property.name}</strong><br>${property.address}</p>
              <p><a href="${inviteUrl}">Klikk her for å akseptere invitasjonen</a></p>
              <p>Lenken utløper om 7 dager.</p>
            `
          });

          console.log('✅ [PROCESS PENDING] Email sent to:', userEmail);
        }

        // Update pending request status
        await serviceBase44.entities.PendingTenantRequest.update(request.id, {
          status: 'pending_property_accept',
          property_invite_token: token
        });

        processed.push({
          requestId: request.id,
          propertyId: request.rental_unit_id,
          token
        });

      } catch (error) {
        console.error('❌ [PROCESS PENDING] Failed to process request:', error);
      }
    }

    console.log('✅ [PROCESS PENDING] Processed:', processed.length);

    return Response.json({
      success: true,
      processed: processed.length,
      invitations: processed
    });

  } catch (error) {
    console.error('❌ [PROCESS PENDING] Fatal error:', error);
    return Response.json({ 
      error: 'Failed to process pending invites',
      details: error.message 
    }, { status: 500 });
  }
});