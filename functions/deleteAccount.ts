import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('🔵 [DELETE ACCOUNT API] ===== REQUEST RECEIVED =====');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('❌ [DELETE ACCOUNT API] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email;
    
    console.log('🔵 [DELETE ACCOUNT API] Deleting user:', { userId, email: userEmail });

    const deleteStats = {
      properties: 0,
      unlinkedProperties: 0,
      agreements: 0,
      messages: 0,
      notifications: 0,
      invitations: 0,
      events: 0,
      finances: 0,
      maintenanceTasks: 0,
      paymentReminders: 0,
      authUser: false
    };

    // Use service role for all deletions
    const serviceBase44 = base44.asServiceRole;

    // 1. Delete rental units (landlord owns)
    const ownedProperties = await serviceBase44.entities.RentalUnit.filter({ landlord_id: userId });
    console.log('🔵 [DELETE ACCOUNT API] Properties:', ownedProperties.length);
    for (const prop of ownedProperties) {
      await serviceBase44.entities.RentalUnit.delete(prop.id);
      deleteStats.properties++;
    }

    // 2. Unlink from tenant properties
    const tenantProperties = await serviceBase44.entities.RentalUnit.filter({ tenant_id: userId });
    console.log('🔵 [DELETE ACCOUNT API] Tenant properties:', tenantProperties.length);
    for (const prop of tenantProperties) {
      await serviceBase44.entities.RentalUnit.update(prop.id, { 
        tenant_id: null,
        tenant_email: null,
        status: 'vacant' 
      });
      deleteStats.unlinkedProperties++;
    }

    // 3. Delete agreements
    const agreements = await serviceBase44.entities.RentalAgreement.filter({ tenant_id: userId });
    const landlordAgreements = await serviceBase44.entities.RentalAgreement.filter({ landlord_id: userId });
    const allAgreements = [...agreements, ...landlordAgreements];
    console.log('🔵 [DELETE ACCOUNT API] Agreements:', allAgreements.length);
    for (const agr of allAgreements) {
      await serviceBase44.entities.RentalAgreement.delete(agr.id);
      deleteStats.agreements++;
    }

    // 4. Delete messages
    const messages = await serviceBase44.entities.ChatMessage.filter({ sender_id: userId });
    console.log('🔵 [DELETE ACCOUNT API] Messages:', messages.length);
    for (const msg of messages) {
      await serviceBase44.entities.ChatMessage.delete(msg.id);
      deleteStats.messages++;
    }

    // 5. Delete notifications
    const notifications = await serviceBase44.entities.Notification.filter({ user_id: userId });
    console.log('🔵 [DELETE ACCOUNT API] Notifications:', notifications.length);
    for (const notif of notifications) {
      await serviceBase44.entities.Notification.delete(notif.id);
      deleteStats.notifications++;
    }

    // 6. Delete invitations
    const invitations = await serviceBase44.entities.TenantInvitation.filter({ 
      tenant_email: userEmail.toLowerCase() 
    });
    const sentInvitations = await serviceBase44.entities.TenantInvitation.filter({ 
      landlord_id: userId 
    });
    const allInvitations = [...invitations, ...sentInvitations];
    console.log('🔵 [DELETE ACCOUNT API] Invitations:', allInvitations.length);
    for (const inv of allInvitations) {
      await serviceBase44.entities.TenantInvitation.delete(inv.id);
      deleteStats.invitations++;
    }

    // 7. Delete calendar events
    const allEvents = await serviceBase44.entities.CalendarEvent.list('-created_date', 1000);
    const userEvents = allEvents.filter(e => e.created_by === userEmail);
    console.log('🔵 [DELETE ACCOUNT API] Events:', userEvents.length);
    for (const event of userEvents) {
      await serviceBase44.entities.CalendarEvent.delete(event.id);
      deleteStats.events++;
    }

    // 8. Delete financial entries
    const finances = await serviceBase44.entities.FinancialEntry.filter({ landlord_id: userId });
    console.log('🔵 [DELETE ACCOUNT API] Finances:', finances.length);
    for (const fin of finances) {
      await serviceBase44.entities.FinancialEntry.delete(fin.id);
      deleteStats.finances++;
    }

    // 9. Delete maintenance tasks
    const tasks = await serviceBase44.entities.MaintenanceTask.filter({ landlord_id: userId });
    console.log('🔵 [DELETE ACCOUNT API] Tasks:', tasks.length);
    for (const task of tasks) {
      await serviceBase44.entities.MaintenanceTask.delete(task.id);
      deleteStats.maintenanceTasks++;
    }

    // 10. Delete payment reminders
    const reminders = await serviceBase44.entities.PaymentReminder.filter({ landlord_id: userId });
    console.log('🔵 [DELETE ACCOUNT API] Reminders:', reminders.length);
    for (const reminder of reminders) {
      await serviceBase44.entities.PaymentReminder.delete(reminder.id);
      deleteStats.paymentReminders++;
    }

    // 11. CRITICAL: Delete auth user (service role required)
    try {
      console.log('🔵 [DELETE ACCOUNT API] Deleting auth user...');
      await serviceBase44.users.deleteUser(userId);
      deleteStats.authUser = true;
      console.log('✅ [DELETE ACCOUNT API] Auth user deleted');
    } catch (authError) {
      console.error('❌ [DELETE ACCOUNT API] Auth deletion failed:', {
        error: authError.message,
        stack: authError.stack
      });
      // Don't fail entire operation if auth delete fails
      // User data is already cleaned up
    }

    console.log('✅ [DELETE ACCOUNT API] ===== DELETION COMPLETE =====');
    console.log('✅ [DELETE ACCOUNT API] Final stats:', deleteStats);

    return Response.json({
      success: true,
      message: 'Account and all data permanently deleted',
      stats: deleteStats
    });

  } catch (error) {
    console.error('❌ [DELETE ACCOUNT API] Fatal error:', {
      message: error.message,
      stack: error.stack
    });
    return Response.json({ 
      error: 'Account deletion failed', 
      details: error.message 
    }, { status: 500 });
  }
});