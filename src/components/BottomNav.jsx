import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Building2, Wallet, Calendar, MessageSquare, Settings } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { createPageUrl } from '@/utils';
import { getHomeRoute } from '@/components/roleUtils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function BottomNav({ userRole }) {
  const location = useLocation();
  const { t } = useLanguage();

  // Fetch unread message count
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const effectiveRole = user?.active_role || user?.user_role || (typeof window !== 'undefined' ? localStorage.getItem('user_role_override') : null);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadMessages', effectiveRole, user?.id],
    queryFn: async () => {
      if (!user?.id || !effectiveRole) return 0;
      
      // Get properties relevant to this role
      let propertyIds = [];
      if (effectiveRole === 'landlord') {
        const props = await base44.entities.RentalUnit.filter({ landlord_id: user.id });
        propertyIds = props.map(p => p.id);
      } else {
        const props = await base44.entities.RentalUnit.filter({ tenant_id: user.id });
        propertyIds = props.map(p => p.id);
      }
      
      if (propertyIds.length === 0) return 0;
      
      // Fetch only unread messages not sent by the current user, limited to 200
      const allMessages = await base44.entities.ChatMessage.filter({ read: false }, '-created_date', 200);
      const unread = allMessages.filter(msg => 
        propertyIds.includes(msg.rental_unit_id) &&
        msg.sender_id !== user.id
      );
      
      return unread.length;
    },
    enabled: !!user?.id && !!effectiveRole,
    refetchInterval: 15000
  });
  
  console.log('🔵 BottomNav mounted:', { 
    userRole, 
    currentPath: location.pathname,
    homeRoute: getHomeRoute(userRole)
  });
  
  const landlordLinks = [
    { to: 'Dashboard', icon: Home, label: t('home') },
    { to: 'Properties', icon: Building2, label: t('properties') },
    { to: 'Finances', icon: Wallet, label: t('finances') },
    { to: 'CalendarPage', icon: Calendar, label: t('calendar') },
    { to: 'Chat', icon: MessageSquare, label: t('chat') }
  ];
  
  const tenantLinks = [
    { to: 'TenantDashboard', icon: Home, label: t('home') },
    { to: 'CalendarPage', icon: Calendar, label: t('calendar') },
    { to: 'Chat', icon: MessageSquare, label: t('chat') },
    { to: 'Settings', icon: Settings, label: t('settings') }
  ];
  
  const links = userRole === 'landlord' ? landlordLinks : tenantLinks;

  // Check if current page matches any link (including nested routes)
  const isLinkActive = (linkTo) => {
    const path = location.pathname;
    if (linkTo === 'Dashboard') {
      // Exact match for landlord dashboard - must NOT match TenantDashboard
      return path.includes('/Dashboard') && !path.includes('TenantDashboard');
    }
    if (linkTo === 'TenantDashboard') {
      return path.includes('TenantDashboard');
    }
    if (linkTo === 'Properties' && (path.includes('Properties') || path.includes('PropertyDetail') || path.includes('AddProperty') || path.includes('EditProperty'))) {
      return true;
    }
    return path.includes(linkTo);
  };
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
      <div className="flex justify-around items-center max-w-lg mx-auto px-2 py-2">
        {links.map(({ to, icon: Icon, label }) => {
          const isActive = isLinkActive(to);
          return (
            <Link
              key={to}
              to={createPageUrl(to)}
              onClick={() => {
                console.log('🔵 BottomNav CLICK:', { 
                  navigatingTo: to, 
                  userRole, 
                  fromPath: location.pathname,
                  toUrl: createPageUrl(to)
                });
              }}
              className={`flex flex-col items-center px-3 py-1 rounded-lg transition-colors relative ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs mt-1">{label}</span>
              {to === 'Chat' && unreadCount > 0 && (
                <span className="absolute top-0 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}