import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';

export default function Properties() {
  const { t } = useLanguage();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.filter({ landlord_id: user?.id }),
    enabled: !!user?.id
  });

  const statusColors = {
    vacant: 'bg-green-100 text-green-700',
    occupied: 'bg-blue-100 text-blue-700',
    pending_invitation: 'bg-yellow-100 text-yellow-700'
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{t('properties')}</h1>
          {properties.length < 5 && (
            <Link to={createPageUrl('AddProperty')}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-1" /> {t('add')}
              </Button>
            </Link>
          )}
        </div>
        {properties.length >= 5 && (
          <p className="text-sm text-amber-600 mt-2">{t('maxProperties')}</p>
        )}
      </div>

      <div className="p-4 space-y-3">
        {properties.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-900 mb-2">Ingen eiendommer</h3>
              <p className="text-slate-500 text-sm mb-4">
                Legg til din første eiendom for å komme i gang
              </p>
              <Link to={createPageUrl('AddProperty')}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" /> {t('addProperty')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          properties.map(property => (
            <Link 
              key={property.id} 
              to={createPageUrl(`PropertyDetail?id=${property.id}`)}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-7 h-7 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{property.name}</h3>
                        <Badge className={statusColors[property.status]}>
                          {t(property.status)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-slate-500">
                        <MapPin className="w-3 h-3" />
                        <span className="text-sm truncate">{property.address}</span>
                      </div>
                      {property.monthly_rent && (
                        <p className="text-sm font-medium text-blue-600 mt-2">
                          {property.monthly_rent.toLocaleString()} kr/mnd
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}