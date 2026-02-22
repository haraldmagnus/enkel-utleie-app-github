import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, FileText, Camera, Calendar, MessageSquare, ArrowRight, Check, X, Mail } from 'lucide-react';
import TenantMaintenanceRequest from '@/components/TenantMaintenanceRequest';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';
import PendingInvitations from '@/components/PendingInvitations';

export default function TenantDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Redirect if user is on wrong dashboard for their role
  React.useEffect(() => {
    if (user) {
      const roleOverride = localStorage.getItem('user_role_override');
      const effectiveRole = user.active_role || user.user_role || roleOverride;
      
      console.log('🔵 TenantDashboard (Tenant): Role check:', { 
        active_role: user.active_role,
        user_role: user.user_role, 
        roleOverride, 
        effectiveRole,
        currentPage: 'TenantDashboard'
      });
      
      if (effectiveRole === 'landlord') {
        console.log('⚠️ TenantDashboard: Landlord on tenant page - REDIRECTING to Dashboard');
        window.location.href = createPageUrl('Dashboard');
      }
    }
  }, [user]);

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['tenantProperties'],
    queryFn: () => base44.entities.RentalUnit.filter({ tenant_id: user?.id }),
    enabled: !!user?.id
  });

  const property = properties[0]; // Tenant typically has one property

  const { data: agreement } = useQuery({
    queryKey: ['tenantAgreement', property?.id],
    queryFn: () => base44.entities.RentalAgreement.filter({ rental_unit_id: property?.id }),
    select: (data) => data[0],
    enabled: !!property?.id
  });

  const { data: events = [] } = useQuery({
    queryKey: ['tenantEvents'],
    queryFn: () => base44.entities.CalendarEvent.filter({ rental_unit_id: property?.id }, '-date', 5),
    enabled: !!property?.id
  });

  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['pendingInvitations', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const invites = await base44.entities.TenantInvitation.filter({
        tenant_email: user.email.toLowerCase(),
        status: 'pending'
      });
      console.log('🔵 Pending invitations:', invites.length);
      return invites;
    },
    enabled: !!user?.email,
    refetchInterval: 30000
  });

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-6">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Ingen bolig tilknyttet</h2>
          <p className="text-slate-500 max-w-sm">
            Du er ikke tilknyttet noen leiebolig ennå. Be utleieren din om å sende deg en invitasjon.
          </p>
        </div>
      </div>
    );
  }

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());

  return (
    <div className="pb-24">
      <div className="p-4 space-y-4">
        {/* Pending Invitations Component */}
        <PendingInvitations userId={user?.id} userEmail={user?.email} />

        {/* Property Card */}
        <Card className="bg-white shadow-md">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900">{property.name}</h3>
                <p className="text-sm text-slate-500">{property.address}</p>
                {property.monthly_rent && (
                  <p className="text-sm font-medium text-blue-600 mt-1">
                    {property.monthly_rent.toLocaleString()} kr/mnd
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Status */}
        {agreement && (
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> {t('rentalAgreement')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500 text-sm">{t('startDate')}</span>
                  <span className="font-medium text-sm">{agreement.start_date}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-500 text-sm">Din signatur</span>
                  {agreement.tenant_signed ? (
                    <Badge className="bg-green-100 text-green-700">
                      <Check className="w-3 h-3 mr-1" /> {t('signed')}
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700">
                      <X className="w-3 h-3 mr-1" /> {t('notSigned')}
                    </Badge>
                  )}
                </div>
                {!agreement.tenant_signed && (
                  <Link to={createPageUrl(`SignAgreement?id=${agreement.id}`)}>
                    <Button className="w-full mt-2 bg-blue-600 hover:bg-blue-700">
                      {t('signAgreement')}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photos */}
        <Card className="bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="w-4 h-4" /> Dokumentasjon
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">{t('moveInPhotos')}</p>
                <p className="font-semibold">{property.move_in_photos?.length || 0} bilder</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">{t('moveOutPhotos')}</p>
                <p className="font-semibold">{property.move_out_photos?.length || 0} bilder</p>
              </div>
            </div>
            <Link to={createPageUrl(`TenantPhotos?id=${property.id}`)}>
              <Button variant="outline" className="w-full mt-3">
                Se alle bilder
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Kommende hendelser
                </CardTitle>
                <Link to={createPageUrl('CalendarPage')}>
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    Se alle <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {upcomingEvents.slice(0, 3).map(event => (
                  <div key={event.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
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

        {/* Maintenance Requests */}
        <Card className="bg-white shadow-sm">
          <CardContent className="pt-4 px-4 pb-4">
            <TenantMaintenanceRequest propertyId={property.id} landlordId={property.landlord_id} />
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to={createPageUrl('Chat')}>
            <Card className="bg-blue-50 border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="font-medium text-blue-700">{t('chat')}</p>
              </CardContent>
            </Card>
          </Link>
          <Link to={createPageUrl('CalendarPage')}>
            <Card className="bg-purple-50 border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="font-medium text-purple-700">{t('calendar')}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}