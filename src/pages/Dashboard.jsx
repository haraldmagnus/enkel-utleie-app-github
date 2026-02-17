import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, Users, Wallet, Calendar, ArrowRight, Settings, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/PageHeader';

export default function Dashboard() {
  const { t } = useLanguage();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Redirect if user is on wrong dashboard for their role
  React.useEffect(() => {
    if (user) {
      const roleOverride = localStorage.getItem('user_role_override');
      const effectiveRole = user.active_role || user.user_role || roleOverride;
      
      console.log('🔵 Dashboard (Landlord): Role check:', { 
        active_role: user.active_role,
        user_role: user.user_role, 
        roleOverride, 
        effectiveRole,
        currentPage: 'Dashboard'
      });
      
      if (effectiveRole === 'tenant') {
        console.log('⚠️ Dashboard: Tenant on landlord page - REDIRECTING to TenantDashboard');
        window.location.href = createPageUrl('TenantDashboard');
      }
    }
  }, [user]);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.filter({ landlord_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: finances = [] } = useQuery({
    queryKey: ['finances'],
    queryFn: () => base44.entities.FinancialEntry.filter({ landlord_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: events = [] } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: async () => {
      const allEvents = await base44.entities.CalendarEvent.list('-date', 50);
      const propertyIds = properties.map(p => p.id);
      return allEvents.filter(e => propertyIds.includes(e.rental_unit_id));
    },
    enabled: properties.length > 0
  });

  const occupiedCount = properties.filter(p => p.status === 'occupied').length;
  const totalIncome = finances.filter(f => f.type === 'income').reduce((sum, f) => sum + f.amount, 0);
  const totalExpenses = finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0);

  const upcomingEvents = events
    .filter(e => new Date(e.date) >= new Date())
    .slice(0, 3);

  const statusColors = {
    vacant: 'bg-green-100 text-green-700',
    occupied: 'bg-blue-100 text-blue-700',
    pending_invitation: 'bg-yellow-100 text-yellow-700'
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <PageHeader 
        title={`Hei, ${user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'deg'}!`}
        subtitle="Her er oversikten din"
      />

      <div className="p-4 -mt-6 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{properties.length}</p>
                  <p className="text-xs text-slate-500">{t('properties')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{occupiedCount}</p>
                  <p className="text-xs text-slate-500">Utleid</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{t('finances')}</CardTitle>
              <Link to={createPageUrl('Finances')}>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  Se alle <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-slate-600">{t('totalIncome')}</span>
              <span className="font-semibold text-green-600">+{totalIncome.toLocaleString()} kr</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-slate-600">{t('totalExpenses')}</span>
              <span className="font-semibold text-red-600">-{totalExpenses.toLocaleString()} kr</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-slate-900">{t('netIncome')}</span>
              <span className={`font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(totalIncome - totalExpenses).toLocaleString()} kr
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Properties */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">{t('properties')}</CardTitle>
              {properties.length < 5 && (
                <Link to={createPageUrl('AddProperty')}>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-1" /> {t('add')}
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {properties.length === 0 ? (
              <div className="text-center py-6">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Ingen eiendommer ennå</p>
                <Link to={createPageUrl('AddProperty')}>
                  <Button className="mt-3 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-1" /> {t('addProperty')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {properties.slice(0, 3).map(property => (
                  <Link 
                    key={property.id} 
                    to={createPageUrl(`PropertyDetail?id=${property.id}`)}
                    className="block"
                  >
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{property.name}</p>
                        <p className="text-xs text-slate-500 truncate">{property.address}</p>
                      </div>
                      <Badge className={statusColors[property.status]}>
                        {t(property.status)}
                      </Badge>
                    </div>
                  </Link>
                ))}
                {properties.length > 3 && (
                  <Link to={createPageUrl('Properties')}>
                    <Button variant="ghost" className="w-full text-blue-600">
                      Se alle {properties.length} eiendommer
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">{t('calendar')}</CardTitle>
                <Link to={createPageUrl('CalendarPage')}>
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    Se alle <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-2">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-purple-600">
                        {new Date(event.date).getDate()}
                      </span>
                      <span className="text-[10px] text-purple-500">
                        {new Date(event.date).toLocaleDateString('no', { month: 'short' })}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-slate-900">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.time || 'Hele dagen'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Hurtighandlinger</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              <Link to={createPageUrl('YearlyReport')}>
                <Button variant="outline" className="w-full h-auto py-3 flex-col">
                  <FileText className="w-5 h-5 mb-1 text-blue-600" />
                  <span className="text-xs">Årsrapport</span>
                </Button>
              </Link>
              <Link to={createPageUrl('Settings')}>
                <Button variant="outline" className="w-full h-auto py-3 flex-col">
                  <Settings className="w-5 h-5 mb-1 text-slate-600" />
                  <span className="text-xs">Innstillinger</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}