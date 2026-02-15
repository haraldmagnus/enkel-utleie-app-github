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
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {links.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname.includes(to);
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