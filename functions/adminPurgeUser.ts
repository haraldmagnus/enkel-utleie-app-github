import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Admin-only endpoint to purge a user by email
 * 
 * This is for debugging/cleanup when a user has wrong role or stuck state
 * Requires admin authentication
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();

    if (!adminUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow admin role (if you have admin role in your system)
    // For now, check if user email is app owner or specific admin
    const isAdmin = adminUser.email === Deno.env.get('ADMIN_EMAIL') || adminUser.role === 'admin';
    
    if (!isAdmin) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email required' }, { status: 400 });
    }

    console.log('🔵 Admin purging user:', email);

    // Find user by email
    const users = await base44.asServiceRole.entities.User.filter({ 
      email: email.toLowerCase() 
    });

    if (users.length === 0) {
      return Response.json({ 
        error: 'User not found',
        email 
      }, { status: 404 });
    }

    const targetUser = users[0];
    const deletionReport = {
      userId: targetUser.id,
      email: targetUser.email,
      deletedData: {},
      errors: []
    };

    try {
      // 1. Delete notifications
      const notifications = await base44.asServiceRole.entities.Notification.filter({ 
        user_id: targetUser.id 
      });
      for (const notification of notifications) {
        await base44.asServiceRole.entities.Notification.delete(notification.id);
      }
      deletionReport.deletedData.notifications = notifications.length;

      // 2. Delete tenant invitations
      const tenantInvitations = await base44.asServiceRole.entities.TenantInvitation.filter({ 
        tenant_email: targetUser.email.toLowerCase() 
      });
      for (const invitation of tenantInvitations) {
        await base44.asServiceRole.entities.TenantInvitation.delete(invitation.id);
      }
      deletionReport.deletedData.tenantInvitations = tenantInvitations.length;

      // 3. Delete created invitations
      const createdInvitations = await base44.asServiceRole.entities.TenantInvitation.filter({ 
        landlord_id: targetUser.id 
      });
      for (const invitation of createdInvitations) {
        await base44.asServiceRole.entities.TenantInvitation.delete(invitation.id);
      }
      deletionReport.deletedData.createdInvitations = createdInvitations.length;

      // 4. Delete chat messages
      const chatMessages = await base44.asServiceRole.entities.ChatMessage.filter({ 
        sender_id: targetUser.id 
      });
      for (const message of chatMessages) {
        await base44.asServiceRole.entities.ChatMessage.delete(message.id);
      }
      deletionReport.deletedData.chatMessages = chatMessages.length;

      // 5. Unlink from properties as tenant
      const tenantProperties = await base44.asServiceRole.entities.RentalUnit.filter({ 
        tenant_id: targetUser.id 
      });
      for (const property of tenantProperties) {
        await base44.asServiceRole.entities.RentalUnit.update(property.id, {
          tenant_id: null,
          tenant_email: null,
          status: 'vacant'
        });
      }
      deletionReport.deletedData.unlinkedTenantProperties = tenantProperties.length;

      // 6. Delete owned properties and their data
      const ownedProperties = await base44.asServiceRole.entities.RentalUnit.filter({ 
        landlord_id: targetUser.id 
      });
      
      for (const property of ownedProperties) {
        // Delete related data first
        const agreements = await base44.asServiceRole.entities.RentalAgreement.filter({ 
          rental_unit_id: property.id 
        });
        for (const agreement of agreements) {
          await base44.asServiceRole.entities.RentalAgreement.delete(agreement.id);
        }

        const events = await base44.asServiceRole.entities.CalendarEvent.filter({ 
          rental_unit_id: property.id 
        });
        for (const event of events) {
          await base44.asServiceRole.entities.CalendarEvent.delete(event.id);
        }

        const finances = await base44.asServiceRole.entities.FinancialEntry.filter({ 
          rental_unit_id: property.id 
        });
        for (const entry of finances) {
          await base44.asServiceRole.entities.FinancialEntry.delete(entry.id);
        }

        const maintenance = await base44.asServiceRole.entities.MaintenanceTask.filter({ 
          rental_unit_id: property.id 
        });
        for (const task of maintenance) {
          await base44.asServiceRole.entities.MaintenanceTask.delete(task.id);
        }

        const reminders = await base44.asServiceRole.entities.PaymentReminder.filter({ 
          rental_unit_id: property.id 
        });
        for (const reminder of reminders) {
          await base44.asServiceRole.entities.PaymentReminder.delete(reminder.id);
        }

        await base44.asServiceRole.entities.RentalUnit.delete(property.id);
      }
      deletionReport.deletedData.ownedProperties = ownedProperties.length;

      // 7. Delete agreements (as landlord or tenant)
      const landlordAgreements = await base44.asServiceRole.entities.RentalAgreement.filter({ 
        landlord_id: targetUser.id 
      });
      const tenantAgreements = await base44.asServiceRole.entities.RentalAgreement.filter({ 
        tenant_id: targetUser.id 
      });
      for (const agreement of [...landlordAgreements, ...tenantAgreements]) {
        try {
          await base44.asServiceRole.entities.RentalAgreement.delete(agreement.id);
        } catch (e) {
          console.log('Agreement already deleted:', agreement.id);
        }
      }
      deletionReport.deletedData.agreements = landlordAgreements.length + tenantAgreements.length;

      // 8. Delete financial entries
      const financialEntries = await base44.asServiceRole.entities.FinancialEntry.filter({ 
        landlord_id: targetUser.id 
      });
      for (const entry of financialEntries) {
        try {
          await base44.asServiceRole.entities.FinancialEntry.delete(entry.id);
        } catch (e) {
          console.log('Financial entry already deleted:', entry.id);
        }
      }
      deletionReport.deletedData.financialEntries = financialEntries.length;

      // 9. Delete maintenance tasks
      const maintenanceTasks = await base44.asServiceRole.entities.MaintenanceTask.filter({ 
        landlord_id: targetUser.id 
      });
      for (const task of maintenanceTasks) {
        try {
          await base44.asServiceRole.entities.MaintenanceTask.delete(task.id);
        } catch (e) {
          console.log('Maintenance task already deleted:', task.id);
        }
      }
      deletionReport.deletedData.maintenanceTasks = maintenanceTasks.length;

      // 10. Delete payment reminders
      const paymentReminders = await base44.asServiceRole.entities.PaymentReminder.filter({ 
        landlord_id: targetUser.id 
      });
      for (const reminder of paymentReminders) {
        try {
          await base44.asServiceRole.entities.PaymentReminder.delete(reminder.id);
        } catch (e) {
          console.log('Payment reminder already deleted:', reminder.id);
        }
      }
      deletionReport.deletedData.paymentReminders = paymentReminders.length;

    } catch (error) {
      console.error('❌ Error deleting app data:', error);
      deletionReport.errors.push({
        step: 'app_data_deletion',
        error: error.message,
        stack: error.stack
      });
    }

    // CRITICAL: Delete auth user
    try {
      console.log('🔵 Deleting auth user:', targetUser.id);
      await base44.asServiceRole.users.delete(targetUser.id);
      deletionReport.authDeleted = true;
      console.log('✅ Auth user deleted');
    } catch (error) {
      console.error('❌ Failed to delete auth user:', error);
      deletionReport.authDeleted = false;
      deletionReport.errors.push({
        step: 'auth_deletion',
        error: error.message,
        stack: error.stack,
        critical: true
      });
      
      return Response.json({
        success: false,
        error: 'Failed to delete auth user',
        report: deletionReport
      }, { status: 500 });
    }

    console.log('✅ Admin purge completed');

    return Response.json({
      success: true,
      message: `User ${email} completely purged. Email can be re-registered.`,
      report: deletionReport
    });

  } catch (error) {
    console.error('❌ Admin purge failed:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});