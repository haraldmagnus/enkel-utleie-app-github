import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            console.warn('❌ updateUserProfile: Unauthorized access attempt.');
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await req.json();
        console.log('🔵 updateUserProfile: Received payload:', payload);

        const { userId, full_name, birth_date, phone_number, user_role, role_locked } = payload;

        if (userId !== user.id) {
            console.warn('❌ updateUserProfile: Mismatch between authenticated user and payload userId.', { authenticatedUserId: user.id, payloadUserId: userId });
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const updateData = {};
        
        if (full_name !== undefined) updateData.full_name = full_name;
        if (birth_date !== undefined) updateData.birth_date = birth_date;
        if (phone_number !== undefined) updateData.phone_number = phone_number;
        if (user_role !== undefined) updateData.user_role = user_role;
        if (role_locked !== undefined) updateData.role_locked = role_locked;

        console.log('🔵 updateUserProfile: Updating User entity with:', { userId, updateData });
        const updatedUser = await base44.asServiceRole.entities.User.update(userId, updateData);

        console.log('✅ updateUserProfile: User profile updated successfully for userId:', userId);
        return Response.json(updatedUser, { status: 200 });
    } catch (error) {
        console.error('❌ updateUserProfile: Error updating user profile:', error);
        return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
});