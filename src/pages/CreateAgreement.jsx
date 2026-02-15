import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';

export default function CreateAgreement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');

  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    monthly_rent: '',
    deposit: '',
    terms: '',
    landlord_signed: false
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.RentalUnit.filter({ id: propertyId }),
    select: (data) => data[0],
    enabled: !!propertyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RentalAgreement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreement', propertyId] });
      navigate(createPageUrl(`PropertyDetail?id=${propertyId}`));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    createMutation.mutate({
      rental_unit_id: propertyId,
      landlord_id: user.id,
      tenant_id: property?.tenant_id || null,
      landlord_name: user.full_name,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      monthly_rent: Number(formData.monthly_rent),
      deposit: formData.deposit ? Number(formData.deposit) : null,
      terms: formData.terms,
      landlord_signed: formData.landlord_signed,
      landlord_signed_date: formData.landlord_signed ? new Date().toISOString() : null,
      status: formData.landlord_signed ? 'pending_tenant' : 'draft'
    });
  };

  return (
    <div className="pb-20">
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-slate-900">{t('createAgreement')}</h1>
        </div>
      </div>

      <div className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {property && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">
                  Oppretter avtale for: <strong>{property.name}</strong>
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Avtaledetaljer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">{t('startDate')} *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">{t('endDate')}</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthly_rent">{t('monthlyRent')} (kr) *</Label>
                  <Input
                    id="monthly_rent"
                    type="number"
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                    placeholder="12000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="deposit">{t('deposit')} (kr)</Label>
                  <Input
                    id="deposit"
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                    placeholder="36000"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="terms">{t('terms')}</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  placeholder="Skriv inn eventuelle tilleggsvilkår..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="sign"
                  checked={formData.landlord_signed}
                  onCheckedChange={(checked) => setFormData({ ...formData, landlord_signed: checked })}
                />
                <div>
                  <Label htmlFor="sign" className="font-medium cursor-pointer">
                    Signer avtalen nå
                  </Label>
                  <p className="text-sm text-slate-500">
                    Ved å krysse av bekrefter du at du godtar vilkårene i denne leieavtalen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={createMutation.isPending}
          >
            {formData.landlord_signed && <Check className="w-4 h-4 mr-2" />}
            {createMutation.isPending 
              ? 'Oppretter...' 
              : formData.landlord_signed 
                ? 'Opprett og signer' 
                : 'Opprett utkast'
            }
          </Button>
        </form>
      </div>
    </div>
  );
}