import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';
import FinnImport from '@/components/FinnImport';

export default function AddProperty() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  const TAX_TYPE_LABELS = {
    secondary: 'Sekundærbolig (ikke egen bolig)',
    primary_partial: 'Del av egen bolig (sokkel e.l.)',
    vacation_short: 'Fritidseiendom – korttidsleie (<30 dager)',
    vacation_long: 'Fritidseiendom – langtidsleie',
  };

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    description: '',
    monthly_rent: '',
    finn_code: '',
    property_type: '',
    size_sqm: '',
    bedrooms: '',
    floor: '',
    facilities: [],
    tax_type: 'secondary'
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: existingProperties = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.filter({ landlord_id: user?.id }),
    enabled: !!user?.id
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RentalUnit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentalUnits'] });
      navigate(createPageUrl('Properties'));
    }
  });

  const handleFinnImport = (data) => {
    setFormData({
      ...formData,
      name: data.name || '',
      address: data.address || '',
      description: data.description || '',
      monthly_rent: data.monthly_rent?.toString() || '',
      finn_code: data.finn_code || '',
      property_type: data.property_type || '',
      size_sqm: data.size_sqm?.toString() || '',
      bedrooms: data.bedrooms?.toString() || '',
      floor: data.floor || '',
      facilities: data.facilities || []
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (existingProperties.length >= 5) return;
    
    createMutation.mutate({
      ...formData,
      monthly_rent: formData.monthly_rent ? Number(formData.monthly_rent) : null,
      size_sqm: formData.size_sqm ? Number(formData.size_sqm) : null,
      bedrooms: formData.bedrooms ? Number(formData.bedrooms) : null,
      landlord_id: user.id,
      status: 'vacant'
    });
  };

  const canAddMore = existingProperties.length < 5;

  return (
    <div className="pb-20 bg-gradient-to-b from-blue-50 to-white min-h-screen">
      <div className="bg-blue-600 text-white px-4 py-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-blue-500"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">{t('addProperty')}</h1>
        </div>
      </div>

      <div className="p-4">
        {!canAddMore ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Building2 className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-900 mb-2">{t('maxProperties')}</h3>
              <p className="text-slate-500 text-sm">
                Du har allerede 5 eiendommer registrert.
              </p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Finn.no Import */}
            <FinnImport onImport={handleFinnImport} />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Eiendomsdetaljer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">{t('propertyName')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="F.eks. Leilighet Sentrum"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">{t('address')} *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Gate 123, 0000 By"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="monthly_rent">{t('monthlyRent')} (kr)</Label>
                    <Input
                      id="monthly_rent"
                      type="number"
                      value={formData.monthly_rent}
                      onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                      placeholder="12000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="size_sqm">Størrelse (m²)</Label>
                    <Input
                      id="size_sqm"
                      type="number"
                      value={formData.size_sqm}
                      onChange={(e) => setFormData({ ...formData, size_sqm: e.target.value })}
                      placeholder="65"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bedrooms">Soverom</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                      placeholder="2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="property_type">Type bolig</Label>
                    <Input
                      id="property_type"
                      value={formData.property_type}
                      onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                      placeholder="Leilighet"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">{t('description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Beskriv eiendommen..."
                    rows={3}
                  />
                </div>

                {formData.facilities?.length > 0 && (
                  <div>
                    <Label>Fasiliteter</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.facilities.map((f, i) => (
                        <Badge key={i} className="bg-blue-100 text-blue-700">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Lagrer...' : t('save')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}