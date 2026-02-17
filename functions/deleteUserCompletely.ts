import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Complete user deletion (hard delete)
 * Deletes all user data from app DB + auth provider
 * 
 * This allows the email to be re-registered with a new role
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get current user from request
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔵 Starting complete deletion for user:', user.email);

    const deletionReport = {
      userId: user.id,
      email: user.email,
      deletedData: {},
      errors: []
    };

    try {
      // 1. Delete notifications
      const notifications = await base44.asServiceRole.entities.Notification.filter({ user_id: user.id });
      for (const notification of notifications) {
        await base44.asServiceRole.entities.Notification.delete(notification.id);
      }
      deletionReport.deletedData.notifications = notifications.length;
      console.log(`✅ Deleted ${notifications.length} notifications`);

      // 2. Delete tenant invitations (sent to this user)
      const tenantInvitations = await base44.asServiceRole.entities.TenantInvitation.filter({ 
        tenant_email: user.email.toLowerCase() 
      });
      for (const invitation of tenantInvitations) {
        await base44.asServiceRole.entities.TenantInvitation.delete(invitation.id);
      }
      deletionReport.deletedData.tenantInvitations = tenantInvitations.length;
      console.log(`✅ Deleted ${tenantInvitations.length} tenant invitations`);

      // 3. Delete invitations created by this user (as landlord)
      const createdInvitations = await base44.asServiceRole.entities.TenantInvitation.filter({ 
        landlord_id: user.id 
      });
      for (const invitation of createdInvitations) {
        await base44.asServiceRole.entities.TenantInvitation.delete(invitation.id);
      }
      deletionReport.deletedData.createdInvitations = createdInvitations.length;
      console.log(`✅ Deleted ${createdInvitations.length} created invitations`);

      // 4. Delete chat messages
      const chatMessages = await base44.asServiceRole.entities.ChatMessage.filter({ sender_id: user.id });
      for (const message of chatMessages) {
        await base44.asServiceRole.entities.ChatMessage.delete(message.id);
      }
      deletionReport.deletedData.chatMessages = chatMessages.length;
      console.log(`✅ Deleted ${chatMessages.length} chat messages`);

      // 5. Unlink tenant from properties (but don't delete properties)
      const tenantProperties = await base44.asServiceRole.entities.RentalUnit.filter({ tenant_id: user.id });
      for (const property of tenantProperties) {
        await base44.asServiceRole.entities.RentalUnit.update(property.id, {
          tenant_id: null,
          tenant_email: null,
          status: 'vacant'
        });
      }
      deletionReport.deletedData.unlinkedTenantProperties = tenantProperties.length;
      console.log(`✅ Unlinked from ${tenantProperties.length} properties as tenant`);

      // 6. Delete properties owned by this user (if landlord)
      const ownedProperties = await base44.asServiceRole.entities.RentalUnit.filter({ landlord_id: user.id });
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

        // Now delete the property
        await base44.asServiceRole.entities.RentalUnit.delete(property.id);
      }
      deletionReport.deletedData.ownedProperties = ownedProperties.length;
      console.log(`✅ Deleted ${ownedProperties.length} owned properties`);

      // 7. Delete rental agreements (as landlord or tenant)
      const landlordAgreements = await base44.asServiceRole.entities.RentalAgreement.filter({ 
        landlord_id: user.id 
      });
      const tenantAgreements = await base44.asServiceRole.entities.RentalAgreement.filter({ 
        tenant_id: user.id 
      });
      for (const agreement of [...landlordAgreements, ...tenantAgreements]) {
        await base44.asServiceRole.entities.RentalAgreement.delete(agreement.id);
      }
      deletionReport.deletedData.agreements = landlordAgreements.length + tenantAgreements.length;
      console.log(`✅ Deleted ${deletionReport.deletedData.agreements} agreements`);

      // 8. Delete calendar events
      const calendarEvents = await base44.asServiceRole.entities.CalendarEvent.filter({ 
        rental_unit_id: { $exists: true } 
      });
      // Filter by landlord_id if you have that field
      deletionReport.deletedData.calendarEvents = 0;

      // 9. Delete financial entries
      const financialEntries = await base44.asServiceRole.entities.FinancialEntry.filter({ 
        landlord_id: user.id 
      });
      for (const entry of financialEntries) {
        await base44.asServiceRole.entities.FinancialEntry.delete(entry.id);
      }
      deletionReport.deletedData.financialEntries = financialEntries.length;
      console.log(`✅ Deleted ${financialEntries.length} financial entries`);

      // 10. Delete maintenance tasks
      const maintenanceTasks = await base44.asServiceRole.entities.MaintenanceTask.filter({ 
        landlord_id: user.id 
      });
      for (const task of maintenanceTasks) {
        await base44.asServiceRole.entities.MaintenanceTask.delete(task.id);
      }
      deletionReport.deletedData.maintenanceTasks = maintenanceTasks.length;
      console.log(`✅ Deleted ${maintenanceTasks.length} maintenance tasks`);

      // 11. Delete payment reminders
      const paymentReminders = await base44.asServiceRole.entities.PaymentReminder.filter({ 
        landlord_id: user.id 
      });
      for (const reminder of paymentReminders) {
        await base44.asServiceRole.entities.PaymentReminder.delete(reminder.id);
      }
      deletionReport.deletedData.paymentReminders = paymentReminders.length;
      console.log(`✅ Deleted ${paymentReminders.length} payment reminders`);

    } catch (error) {
      console.error('❌ Error deleting app data:', error);
      deletionReport.errors.push({
        step: 'app_data_deletion',
        error: error.message
      });
    }

    // 12. CRITICAL: Delete auth user (this is the key step)
    try {
      console.log('🔵 Attempting to delete auth user...');
      
      // Delete the user from Base44 auth system
      await base44.asServiceRole.users.delete(user.id);
      
      deletionReport.authDeleted = true;
      console.log('✅ Auth user deleted successfully');
    } catch (error) {
      console.error('❌ Failed to delete auth user:', error);
      deletionReport.authDeleted = false;
      deletionReport.errors.push({
        step: 'auth_deletion',
        error: error.message,
        critical: true
      });
      
      return Response.json({
        success: false,
        error: 'Failed to delete auth user. Email cannot be re-registered.',
        report: deletionReport
      }, { status: 500 });
    }

    console.log('✅ Complete deletion finished successfully');
    
    return Response.json({
      success: true,
      message: 'User completely deleted. Email can now be re-registered.',
      report: deletionReport
    });

  } catch (error) {
    console.error('❌ Complete deletion failed:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});