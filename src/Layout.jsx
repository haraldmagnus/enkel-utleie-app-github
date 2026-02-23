import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Home, Building2, Wallet, Calendar, MessageSquare, Bell, Settings, ChevronRight } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Badge } from '@/components/ui/badge';

const NO_NAV_PAGES = ['RoleSelection', 'Invite', 'AcceptCoLandlord'];
const NO_HEADER_PAGES = ['RoleSelection', 'Invite', 'AcceptCoLandlord'];

function BottomNav({ user }) {
  const location = useLocation();
  const role = user?.active_role || user?.user_role;

  const { data: unread = 0 } = useQuery({
    queryKey: ['unreadMsgs', user?.id],
    queryFn: async () => {
      const msgs = await base44.entities.ChatMessage.filter({ read: false }, '-created_date', 100);
      return msgs.filter(m => m.sender_id !== user?.id).length;
    },
    enabled: !!user?.id,
    refetchInterval: 20000
  });

  const { data: unreadNotifs = 0 } = useQuery({
    queryKey: ['unreadNotifs', user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id, read: false }, '-created_date', 50).then(r => r.length),
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  const landlordLinks = [
    { to: 'Dashboard', icon: Home, label: 'Hjem' },
    { to: 'Properties', icon: Building2, label: 'Eiendommer' },
    { to: 'Finances', icon: Wallet, label: 'Økonomi' },
    { to: 'CalendarPage', icon: Calendar, label: 'Kalender' },
    { to: 'Chat', icon: MessageSquare, label: 'Chat', badge: unread },
  ];

  const tenantLinks = [
    { to: 'TenantDashboard', icon: Home, label: 'Hjem' },
    { to: 'CalendarPage', icon: Calendar, label: 'Kalender' },
    { to: 'Chat', icon: MessageSquare, label: 'Chat', badge: unread },
    { to: 'Settings', icon: Settings, label: 'Innstillinger' },
  ];

  const links = role === 'landlord' ? landlordLinks : tenantLinks;
  const path = location.pathname;

  const isActive = (to) => {
    if (to === 'Dashboard') return path.includes('/Dashboard') && !path.includes('TenantDashboard');
    if (to === 'Properties') return path.includes('Properties') || path.includes('PropertyDetail') || path.includes('AddProperty') || path.includes('EditProperty');
    return path.includes(to);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 shadow-lg">
      <div className="flex justify-around items-center max-w-lg mx-auto px-1 py-2">
        {links.map(({ to, icon: Icon, label, badge }) => {
          const active = isActive(to);
          return (
            <Link key={to} to={createPageUrl(to)} className={`flex flex-col items-center px-3 py-1 rounded-xl transition-all relative ${active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-blue-50' : ''}`}>
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className={`text-[10px] mt-0.5 font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
              {badge > 0 && (
                <span className="absolute top-0 right-1 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TopBar({ user, currentPageName }) {
  const navigate = useNavigate();
  const role = user?.active_role || user?.user_role;

  const pageTitles = {
    Dashboard: `Hei, ${user?.full_name?.split(' ')[0] || 'deg'} 👋`,
    TenantDashboard: `Hei, ${user?.full_name?.split(' ')[0] || 'deg'} 👋`,
    Properties: 'Eiendommer',
    Finances: 'Økonomi',
    CalendarPage: 'Kalender',
    Chat: 'Meldinger',
    Settings: 'Innstillinger',
    Notifications: 'Varsler',
    Help: 'Hjelp & Support',
    ErrorLogs: 'Aktivitetslogg',
  };

  const title = pageTitles[currentPageName];
  if (!title) return null;

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <div>
          <h1 className={`font-bold text-gray-900 ${currentPageName === 'Dashboard' || currentPageName === 'TenantDashboard' ? 'text-xl' : 'text-lg'}`}>{title}</h1>
          {(currentPageName === 'Dashboard' || currentPageName === 'TenantDashboard') && (
            <p className="text-xs text-gray-400 mt-0.5">Enkel Utleie</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NotifBell user={user} navigate={navigate} />
          <Link to={createPageUrl('Settings')}>
            <button className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.full_name?.charAt(0) || '?'}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotifBell({ user, navigate }) {
  const { data: notifs = [] } = useQuery({
    queryKey: ['notifsBell', user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id, read: false }, '-created_date', 20),
    enabled: !!user?.id,
    refetchInterval: 30000
  });

  return (
    <button
      onClick={() => navigate(createPageUrl('Notifications'))}
      className="relative w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
    >
      <Bell className="w-4 h-4 text-gray-600" />
      {notifs.length > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
          {notifs.length > 9 ? '9+' : notifs.length}
        </span>
      )}
    </button>
  );
}

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    if (isLoading) return;
    const role = user?.active_role || user?.user_role;
    if (!role && !NO_NAV_PAGES.includes(currentPageName)) {
      navigate(createPageUrl('RoleSelection'), { replace: true });
      return;
    }
    if (role === 'landlord' && currentPageName === 'TenantDashboard') {
      navigate(createPageUrl('Dashboard'), { replace: true });
    }
    if (role === 'tenant' && currentPageName === 'Dashboard') {
      navigate(createPageUrl('TenantDashboard'), { replace: true });
    }
  }, [user, isLoading, currentPageName, navigate]);

  const role = user?.active_role || user?.user_role;
  const showNav = role && !NO_NAV_PAGES.includes(currentPageName);
  const showTopBar = role && !NO_HEADER_PAGES.includes(currentPageName);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center animate-pulse">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-gray-400 text-sm">Laster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showTopBar && <TopBar user={user} currentPageName={currentPageName} />}
      <div className={showNav ? 'pb-20' : ''}>
        {children}
      </div>
      {showNav && <BottomNav user={user} />}
    </div>
  );
}