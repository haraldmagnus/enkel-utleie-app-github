import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Migration function for existing users from multi-role to single-role system
 * 
 * This function:
 * 1. Checks if user has a fixed 'role' (new system)
 * 2. If not, determines role based on existing data:
 *    - If has created properties (landlord_id) → LANDLORD
 *    - Else if linked as tenant (tenant_id) → TENANT
 *    - Else fallback → LANDLORD
 * 3. Marks conflicted users who have both landlord and tenant data
 * 
 * Call this manually for existing users or as a one-time migration script
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can run migration
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🔵 Starting user role migration...');

    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const migratedUsers = [];
    const skippedUsers = [];
    const conflictedUsers = [];

    for (const targetUser of allUsers) {
      // Skip if already has new 'role' field
      if (targetUser.role) {
        skippedUsers.push(targetUser.id);
        continue;
      }

      // Check landlord data (created properties)
      const landlordProperties = await base44.asServiceRole.entities.RentalUnit.filter({
        landlord_id: targetUser.id
      });

      // Check tenant data (linked to properties)
      const tenantProperties = await base44.asServiceRole.entities.RentalUnit.filter({
        tenant_id: targetUser.id
      });

      const hasLandlordData = landlordProperties.length > 0;
      const hasTenantData = tenantProperties.length > 0;

      // Determine role based on priority
      let newRole = 'landlord'; // default fallback
      
      if (hasLandlordData && !hasTenantData) {
        newRole = 'landlord';
      } else if (hasTenantData && !hasLandlordData) {
        newRole = 'tenant';
      } else if (hasLandlordData && hasTenantData) {
        // Conflict: has both roles
        newRole = 'landlord'; // prioritize landlord
        conflictedUsers.push({
          id: targetUser.id,
          email: targetUser.email,
          landlordProperties: landlordProperties.length,
          tenantProperties: tenantProperties.length
        });
      }

      // Update user
      await base44.asServiceRole.entities.User.update(targetUser.id, {
        role: newRole,
        migrated_from_multi_role: hasLandlordData && hasTenantData,
        has_landlord_data: hasLandlordData,
        has_tenant_data: hasTenantData
      });

      migratedUsers.push({
        id: targetUser.id,
        email: targetUser.email,
        newRole,
        hasLandlordData,
        hasTenantData
      });

      console.log(`✅ Migrated user ${targetUser.email} → ${newRole}`);
    }

    return Response.json({
      success: true,
      summary: {
        total: allUsers.length,
        migrated: migratedUsers.length,
        skipped: skippedUsers.length,
        conflicted: conflictedUsers.length
      },
      migratedUsers,
      conflictedUsers,
      message: conflictedUsers.length > 0 
        ? 'Some users have both landlord and tenant data. They are set as landlord but can migrate tenant data to another account.'
        : 'All users migrated successfully'
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});