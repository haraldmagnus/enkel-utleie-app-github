// Centralized role and routing utilities
import { createPageUrl } from '@/utils';

/**
 * Get the effective role for the current user
 * Priority: active_role > user_role > localStorage override
 */
export function getEffectiveRole(user) {
  const roleOverride = typeof window !== 'undefined' 
    ? localStorage.getItem('user_role_override') 
    : null;
  
  const effectiveRole = user?.active_role || user?.user_role || roleOverride;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔵 getEffectiveRole:', {
      active_role: user?.active_role,
      user_role: user?.user_role,
      roleOverride,
      effectiveRole
    });
  }
  
  return effectiveRole;
}

/**
 * Get the home route for a given role
 */
export function getHomeRoute(role) {
  if (role === 'landlord') {
    return createPageUrl('Dashboard');
  } else if (role === 'tenant') {
    return createPageUrl('TenantDashboard');
  }
  // Fallback to role selection if no role
  return createPageUrl('RoleSelection');
}

/**
 * Navigate to the correct dashboard based on user's role
 */
export function navigateToRoleHome(user, navigate, options = {}) {
  const effectiveRole = getEffectiveRole(user);
  const homeRoute = getHomeRoute(effectiveRole);
  
  console.log('🔵 navigateToRoleHome:', {
    effectiveRole,
    homeRoute,
    replace: options.replace
  });
  
  navigate(homeRoute, options);
}

/**
 * Check if user is on correct dashboard for their role
 * Returns null if correct, otherwise returns correct route
 */
export function validateRoleDashboard(user, currentPath) {
  const effectiveRole = getEffectiveRole(user);
  
  const isOnLandlordDash = currentPath.includes('Dashboard') && !currentPath.includes('TenantDashboard');
  const isOnTenantDash = currentPath.includes('TenantDashboard');
  
  console.log('🔵 validateRoleDashboard:', {
    effectiveRole,
    currentPath,
    isOnLandlordDash,
    isOnTenantDash
  });
  
  // If landlord but on tenant dashboard, return landlord home
  if (effectiveRole === 'landlord' && isOnTenantDash) {
    console.log('⚠️ Landlord on tenant dashboard - redirect needed');
    return getHomeRoute('landlord');
  }
  
  // If tenant but on landlord dashboard, return tenant home
  if (effectiveRole === 'tenant' && isOnLandlordDash) {
    console.log('⚠️ Tenant on landlord dashboard - redirect needed');
    return getHomeRoute('tenant');
  }
  
  return null; // All good
}