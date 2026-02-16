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

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unreadMessages'],
    queryFn: async () => {
      if (!user?.id) {
        console.log('🔵 [BOTTOMNAV] No user ID, returning 0 unread');
        return 0;
      }
      
      console.log('🔵 [BOTTOMNAV] Fetching unread messages...');
      const allMessages = await base44.entities.ChatMessage.list('-created_date', 1000);
      const unread = allMessages.filter(msg => 
        msg.sender_id !== user.id && !msg.read
      );
      
      console.log('🔵 [BOTTOMNAV] Unread count:', {
        totalMessages: allMessages.length,
        unreadCount: unread.length,
        userId: user.id,
        unreadMessages: unread.map(m => ({
          id: m.id,
          from: m.sender_name,
          preview: m.message.substring(0, 30)
        }))
      });
      
      return unread.length;
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
    staleTime: 5000
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
      return path.includes('Dashboard');
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
              onClick={(e) => {
                console.log('🔵 [BOTTOMNAV CLICK] ===== TAB NAVIGATION =====');
                console.log('🔵 [BOTTOMNAV CLICK]', { 
                  targetTab: to,
                  targetUrl: createPageUrl(to),
                  userRole, 
                  currentPath: location.pathname,
                  userProfile: user ? {
                    full_name: user.full_name ? '✓' : '✗',
                    birth_date: user.birth_date ? '✓' : '✗',
                    phone_number: user.phone_number ? '✓' : '✗',
                    isComplete: !!(user.full_name && user.birth_date && user.phone_number)
                  } : 'not loaded'
                });
                // Don't prevent default - let React Router handle it
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