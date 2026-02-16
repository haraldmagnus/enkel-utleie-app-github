import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Building2, Wallet, Calendar, MessageSquare } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { createPageUrl } from '@/utils';

export default function BottomNav({ userRole }) {
  const location = useLocation();
  const { t } = useLanguage();
  
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
    { to: 'Chat', icon: MessageSquare, label: t('chat') }
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
              className={`flex flex-col items-center px-3 py-1 rounded-lg transition-colors ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}