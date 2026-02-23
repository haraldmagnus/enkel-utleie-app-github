import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, TrendingUp, Calendar, MessageSquare, Bell, ArrowRight, Wrench, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';

export default function Dashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: allProperties = [], isLoading } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.list('-created_date', 100),
    enabled: !!user?.id
  });

  const properties = allProperties.filter(p =>
    p.landlord_id === user?.id || (p.landlord_ids || []).includes(user?.id)
  );

  const { data: allFinances = [] } = useQuery({
    queryKey: ['finances', 'all'],
    queryFn: () => base44.entities.FinancialEntry.filter({ landlord_id: user?.id }, '-date', 50),
    enabled: !!user?.id
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const events = [];
      for (const p of properties.slice(0, 5)) {
        const pEvents = await base44.entities.CalendarEvent.filter({ rental_unit_id: p.id }, 'date', 5);
        events.push(...pEvents.filter(e => e.date >= today));
      }
      return events.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    },
    enabled: properties.length > 0
  });

  const { data: maintenanceTasks = [] } = useQuery({
    queryKey: ['maintenanceTasks', 'all'],
    queryFn: async () => {
      const tasks = [];
      for (const p of properties.slice(0, 5)) {
        const pTasks = await base44.entities.MaintenanceTask.filter({ rental_unit_id: p.id, status: 'pending' }, '-created_date', 5);
        tasks.push(...pTasks);
      }
      return tasks.slice(0, 5);
    },
    enabled: properties.length > 0
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => base44.entities.Notification.filter({ user_id: user?.id, read: false }, '-created_date', 5),
    enabled: !!user?.id
  });

  const thisMonthIncome = allFinances
    .filter(e => e.type === 'income' && e.date?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, e) => sum + e.amount, 0);

  const occupiedCount = properties.filter(p => p.status === 'occupied').length;
  const vacantCount = properties.filter(p => p.status === 'vacant').length;

  if (isLoading) {
    return <div className="p-4 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="pb-24">
      <div className="p-4 space-y-4">

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-3 text-center">
              <Building2 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-blue-600">Eiendommer</p>
              <p className="font-bold text-blue-700">{properties.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-green-600">Inntekt (mnd)</p>
              <p className="font-bold text-green-700 text-sm">{thisMonthIncome.toLocaleString()} kr</p>
            </CardContent>
          </Card>
          <Card className={`${vacantCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
            <CardContent className="p-3 text-center">
              <Building2 className={`w-5 h-5 mx-auto mb-1 ${vacantCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              <p className={`text-xs ${vacantCount > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Ledige</p>
              <p className={`font-bold ${vacantCount > 0 ? 'text-amber-700' : 'text-slate-600'}`}>{vacantCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Unread notifications */}
        {notifications.length > 0 && (
          <Card className="bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => navigate(createPageUrl('Notifications'))}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-blue-900 text-sm">Du har {notifications.length} uleste varsler</p>
                <p className="text-xs text-blue-600">{notifications[0]?.title}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-blue-400" />
            </CardContent>
          </Card>
        )}

        {/* Properties */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Mine eiendommer</h2>
            <Link to={createPageUrl('Properties')}>
              <Button variant="ghost" size="sm" className="text-blue-600">Se alle <ArrowRight className="w-3 h-3 ml-1" /></Button>
            </Link>
          </div>
          {properties.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm mb-3">Ingen eiendommer ennå</p>
                <Link to={createPageUrl('AddProperty')}>
                  <Button className="bg-blue-600 hover:bg-blue-700" size="sm">
                    <Plus className="w-4 h-4 mr-1" /> Legg til eiendom
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {properties.slice(0, 3).map(property => (
                <Link key={property.id} to={createPageUrl(`PropertyDetail?id=${property.id}`)}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{property.name}</p>
                        <p className="text-xs text-slate-500 truncate">{property.address}</p>
                      </div>
                      <Badge className={property.status === 'occupied' ? 'bg-blue-100 text-blue-700' : property.status === 'pending_invitation' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                        {t(property.status)}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {properties.length > 3 && (
                <Link to={createPageUrl('Properties')}>
                  <Button variant="outline" className="w-full text-blue-600">Se alle {properties.length} eiendommer</Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Calendar className="w-4 h-4" /> Kommende hendelser</CardTitle>
                <Link to={createPageUrl('CalendarPage')}><Button variant="ghost" size="sm" className="text-blue-600">Se alle <ArrowRight className="w-3 h-3 ml-1" /></Button></Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {upcomingEvents.slice(0, 3).map(event => (
                <div key={event.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <div className="w-9 h-9 bg-purple-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-purple-600">{new Date(event.date).getDate()}</span>
                    <span className="text-[10px] text-purple-500">{new Date(event.date).toLocaleDateString('no', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900">{event.title}</p>
                    <p className="text-xs text-slate-500">{event.time || 'Hele dagen'}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Pending Maintenance */}
        {maintenanceTasks.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Wrench className="w-4 h-4" /> Ventende vedlikehold</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {maintenanceTasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  <p className="text-sm text-slate-700 flex-1">{task.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl('Finances')}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <p className="font-medium text-sm text-slate-800">Økonomi</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('Chat')}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <p className="font-medium text-sm text-slate-800">Meldinger</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}