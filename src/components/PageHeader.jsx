import React from 'react';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import { createPageUrl } from '@/utils';

export default function PageHeader({ 
  title, 
  subtitle,
  showNotifications = true,
  showSettings = true 
}) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-6 py-3 rounded-b-3xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-semibold flex-1">{title}</h1>
        <div className="flex gap-1">
          {showNotifications && <NotificationBell />}
          {showSettings && (
            <Link to={createPageUrl('Settings')}>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
          )}
        </div>
      </div>
      {subtitle && <p className="text-blue-100 text-sm">{subtitle}</p>}
    </div>
  );
}