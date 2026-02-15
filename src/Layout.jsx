import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import BottomNav from '@/components/BottomNav';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';

function LayoutContent({ children, currentPageName }) {
  const navigate = useNavigate();
  const { setLanguage } = useLanguage();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  useEffect(() => {
    if (!isLoading && user) {
      // Set language from user preference
      if (user.language) {
        setLanguage(user.language);
      }
      
      // Redirect if no role selected
      if (!user.user_role && currentPageName !== 'RoleSelection') {
        navigate(createPageUrl('RoleSelection'));
      }
    }
  }, [user, isLoading, currentPageName, navigate, setLanguage]);

  // Pages without bottom nav
  const noNavPages = ['RoleSelection', 'SignAgreement', 'CreateAgreement', 'AddProperty', 'PropertyDetail', 'TenantPhotos', 'EditProperty'];
  const showNav = user?.user_role && !noNavPages.includes(currentPageName);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="space-y-4 w-full max-w-sm p-6">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {children}
      {showNav && <BottomNav userRole={user?.user_role} />}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <LanguageProvider>
      <LayoutContent currentPageName={currentPageName}>
        {children}
      </LayoutContent>
    </LanguageProvider>
  );
}