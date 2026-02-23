import React from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/components/LanguageContext';

export default function TenantPhotos() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.RentalUnit.filter({ id: propertyId }),
    select: (data) => data[0],
    enabled: !!propertyId
  });

  if (isLoading || !property) return <div className="p-4">Laster...</div>;

  const moveInPhotos = property.move_in_photos || [];
  const moveOutPhotos = property.move_out_photos || [];

  return (
    <div className="pb-20">
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <div><h1 className="text-xl font-bold text-slate-900">Dokumentasjon</h1><p className="text-sm text-slate-500">{property.name}</p></div>
        </div>
      </div>
      <div className="p-4">
        <Tabs defaultValue="move_in" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="move_in">{t('moveInPhotos')}</TabsTrigger>
            <TabsTrigger value="move_out">{t('moveOutPhotos')}</TabsTrigger>
          </TabsList>
          <TabsContent value="move_in">
            {moveInPhotos.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><Image className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Ingen innflyttingsbilder lastet opp</p></CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">{moveInPhotos.map((url, idx) => <a key={idx} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Innflytting ${idx + 1}`} className="w-full h-40 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow" /></a>)}</div>
            )}
          </TabsContent>
          <TabsContent value="move_out">
            {moveOutPhotos.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><Image className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Ingen utflyttingsbilder lastet opp</p></CardContent></Card>
            ) : (
              <div className="grid grid-cols-2 gap-3">{moveOutPhotos.map((url, idx) => <a key={idx} href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={`Utflytting ${idx + 1}`} className="w-full h-40 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow" /></a>)}</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}