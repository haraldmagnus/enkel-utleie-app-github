import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Check, Calendar, Wallet, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';

export default function SignAgreement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  const urlParams = new URLSearchParams(window.location.search);
  const agreementId = urlParams.get('id');

  const [agreed, setAgreed] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: agreement, isLoading } = useQuery({
    queryKey: ['agreement', agreementId],
    queryFn: () => base44.entities.RentalAgreement.filter({ id: agreementId }),
    select: (data) => data[0],
    enabled: !!agreementId
  });

  const { data: property } = useQuery({
    queryKey: ['property', agreement?.rental_unit_id],
    queryFn: () => base44.entities.RentalUnit.filter({ id: agreement?.rental_unit_id }),
    select: (data) => data[0],
    enabled: !!agreement?.rental_unit_id
  });

  const signMutation = useMutation({
    mutationFn: () => base44.entities.RentalAgreement.update(agreementId, {
      tenant_id: user.id,
      tenant_name: user.full_name,
      tenant_signed: true,
      tenant_signed_date: new Date().toISOString(),
      status: agreement.landlord_signed ? 'active' : 'pending_tenant'
    }),
    onSuccess: async () => {
      // Update property status to occupied
      if (property) {
        await base44.entities.RentalUnit.update(property.id, {
          tenant_id: user.id,
          status: 'occupied'
        });
      }
      queryClient.invalidateQueries({ queryKey: ['tenantAgreement'] });
      queryClient.invalidateQueries({ queryKey: ['tenantProperties'] });
      navigate(createPageUrl('TenantDashboard'));
    }
  });

  if (isLoading || !agreement) {
    return <div className="p-4">Laster...</div>;
  }

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
          <h1 className="text-xl font-bold text-slate-900">{t('signAgreement')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Property Info */}
        {property && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-800">
                Leieavtale for: <strong>{property.name}</strong>
              </p>
              <p className="text-xs text-blue-600">{property.address}</p>
            </CardContent>
          </Card>
        )}

        {/* Agreement Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Avtaledetaljer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Leieperiode</p>
                <p className="font-medium">
                  {agreement.start_date} 
                  {agreement.end_date ? ` - ${agreement.end_date}` : ' (løpende)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Wallet className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">{t('monthlyRent')}</p>
                <p className="font-medium">{agreement.monthly_rent?.toLocaleString()} kr</p>
              </div>
            </div>

            {agreement.deposit && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <Wallet className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">{t('deposit')}</p>
                  <p className="font-medium">{agreement.deposit?.toLocaleString()} kr</p>
                </div>
              </div>
            )}

            {agreement.terms && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-slate-400" />
                  <p className="text-xs text-slate-500">{t('terms')}</p>
                </div>
                <p className="text-sm text-slate-700">{agreement.terms}</p>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-sm text-slate-600">
                Utleier: <strong>{agreement.landlord_name}</strong>
                {agreement.landlord_signed && (
                  <span className="ml-2 text-green-600 text-xs">✓ Signert</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Sign Section */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={setAgreed}
              />
              <div>
                <Label htmlFor="agree" className="font-medium cursor-pointer">
                  Jeg godtar vilkårene
                </Label>
                <p className="text-sm text-slate-500 mt-1">
                  Ved å signere bekrefter du at du har lest og aksepterer vilkårene i denne leieavtalen.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={!agreed || signMutation.isPending}
          onClick={() => signMutation.mutate()}
        >
          <Check className="w-4 h-4 mr-2" />
          {signMutation.isPending ? 'Signerer...' : 'Signer leieavtalen'}
        </Button>
      </div>
    </div>
  );
}