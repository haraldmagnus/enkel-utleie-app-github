import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import BottomNav from '@/components/BottomNav';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageHeader from '@/components/PageHeader';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';

// Pages that render their own internal header (no global header on these)
const SELF_HEADER_PAGES = [
  'PropertyDetail', 'AddProperty', 'EditProperty', 'CreateAgreement',
  'SignAgreement', 'TenantPhotos', 'Invite', 'AcceptCoLandlord',
  'PaymentReminders', 'YearlyReport'
];

function LayoutContent({ children, currentPageName }) {
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    if (error) {
      console.error('Auth error:', error);
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.log('Storage clear error:', e);
      }
    }
  }, [error]);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.language) {
        setLanguage(user.language);
      }
      
      const roleOverride = localStorage.getItem('user_role_override');
      const effectiveUserRole = user.active_role || user.user_role || roleOverride;
      
      if (!effectiveUserRole && currentPageName !== 'RoleSelection') {
        navigate(createPageUrl('RoleSelection'), { replace: true });
        return;
      }
      
      const isOnLandlordDash = currentPageName === 'Dashboard';
      const isOnTenantDash = currentPageName === 'TenantDashboard';
      
      if (effectiveUserRole === 'landlord' && isOnTenantDash) {
        navigate(createPageUrl('Dashboard'), { replace: true });
        return;
      }
      
      if (effectiveUserRole === 'tenant' && isOnLandlordDash) {
        navigate(createPageUrl('TenantDashboard'), { replace: true });
        return;
      }
    }
  }, [user, isLoading, currentPageName, navigate, setLanguage]);

  const noNavPages = ['RoleSelection'];
  const roleOverride = typeof window !== 'undefined' ? localStorage.getItem('user_role_override') : null;
  const effectiveRole = user?.active_role || user?.user_role || roleOverride;
  
  const showNav = effectiveRole && !noNavPages.includes(currentPageName);
  const showHeader = effectiveRole && !noNavPages.includes(currentPageName) && !SELF_HEADER_PAGES.includes(currentPageName);

  const pageTitles = {
    Dashboard: user ? `Hei, ${user?.first_name || user?.full_name?.split(' ')[0] || 'deg'}!` : '',
    TenantDashboard: user ? `Hei, ${user?.full_name?.split(' ')[0] || 'Leietaker'}!` : '',
    Properties: 'Eiendommer',
    Finances: 'Økonomi',
    CalendarPage: 'Kalender',
    Chat: 'Meldinger',
    Settings: 'Innstillinger',
    Help: 'Hjelp',
    Notifications: 'Varsler',
    FinancesIncome: 'Inntekter',
    FinancesExpense: 'Utgifter',
    FinancesNet: 'Netto',
    FinancesTax: 'Skatt',
  };

  const pageSubtitles = {
    Dashboard: 'Her er oversikten din',
    TenantDashboard: 'Her er din leieoversikt',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-blue-50 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-sm p-6">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const themeStyles = user?.theme === 'pink' ? `
    :root {
      --primary: 330 80% 60%;
      --primary-foreground: 0 0% 100%;
    }
  ` : `
    :root {
      --primary: 220 90% 56%;
      --primary-foreground: 0 0% 100%;
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <style>{`
        ${themeStyles}
        .pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
        .bg-blue-50 { background-color: rgb(239 246 255); }
        .bg-blue-100 { background-color: rgb(219 234 254); }
        .bg-blue-200 { background-color: rgb(191 219 254); }
        .bg-blue-500 { background-color: rgb(59 130 246); }
        .bg-blue-600 { background-color: rgb(37 99 235); }
        .bg-blue-700 { background-color: rgb(29 78 216); }
        .bg-blue-800 { background-color: rgb(30 64 175); }
        .text-blue-50 { color: rgb(239 246 255); }
        .text-blue-100 { color: rgb(219 234 254); }
        .text-blue-500 { color: rgb(59 130 246); }
        .text-blue-600 { color: rgb(37 99 235); }
        .text-blue-700 { color: rgb(29 78 216); }
        .text-blue-800 { color: rgb(30 64 175); }
        .text-blue-900 { color: rgb(30 58 138); }
        .border-blue-200 { border-color: rgb(191 219 254); }
        .border-blue-300 { border-color: rgb(147 197 253); }
        .from-blue-50 { --tw-gradient-from: rgb(239 246 255); }
        .from-blue-100 { --tw-gradient-from: rgb(219 234 254); }
        .from-blue-600 { --tw-gradient-from: rgb(37 99 235); }
        .to-blue-50 { --tw-gradient-to: rgb(239 246 255); }
        .to-blue-700 { --tw-gradient-to: rgb(29 78 216); }
        .to-blue-800 { --tw-gradient-to: rgb(30 64 175); }
        .hover\\:bg-blue-500:hover { background-color: rgb(59 130 246); }
        .hover\\:bg-blue-700:hover { background-color: rgb(29 78 216); }
      `}</style>
      {showHeader && (
        <div className="sticky top-0 z-40">
          <PageHeader
            title={pageTitles[currentPageName] || ''}
            subtitle={pageSubtitles[currentPageName]}
          />
        </div>
      )}
      <div>
        {children}
      </div>
      {showNav && <BottomNav userRole={effectiveRole} />}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <LayoutContent currentPageName={currentPageName}>
          {children}
        </LayoutContent>
      </LanguageProvider>
    </ErrorBoundary>
  );
}