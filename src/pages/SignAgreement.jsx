import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Calendar, Wallet, Info, Home, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';
import DrawSignature from '@/components/DrawSignature';

export default function SignAgreement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  const urlParams = new URLSearchParams(window.location.search);
  const agreementId = urlParams.get('id');

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
    mutationFn: (bankIdRef) => base44.entities.RentalAgreement.update(agreementId, {
      tenant_id: user.id,
      tenant_name: user.full_name,
      tenant_signed: true,
      tenant_signed_date: new Date().toISOString(),
      tenant_bankid_ref: bankIdRef,
      status: agreement.landlord_signed ? 'active' : 'pending_tenant'
    }),
    onSuccess: async () => {
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

  const handleBankIDSign = (bankIdRef) => {
    signMutation.mutate(bankIdRef);
  };

  if (isLoading || !agreement) {
    return <div className="p-4">Laster...</div>;
  }

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
          <h1 className="text-xl font-bold">{t('signAgreement')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Property Info */}
        {property && (
          <Card className="bg-blue-100 border-blue-300">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Home className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">{property.name}</p>
                  <p className="text-sm text-blue-700">{property.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agreement Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" /> Avtaledetaljer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">Leieperiode</p>
                <p className="font-medium">
                  {agreement.start_date} 
                  {agreement.end_date ? ` - ${agreement.end_date}` : ' (løpende)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs text-slate-500">{t('monthlyRent')}</p>
                <p className="font-medium">{agreement.monthly_rent?.toLocaleString()} kr/mnd</p>
              </div>
            </div>

            {agreement.deposit && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-slate-500">{t('deposit')}</p>
                  <p className="font-medium">{agreement.deposit?.toLocaleString()} kr</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="p-2 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">Oppsigelse</p>
                <p className="font-medium text-sm">{agreement.notice_period_months || 3} mnd</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">Husdyr</p>
                {agreement.pets_allowed ? (
                  <Check className="w-4 h-4 mx-auto text-green-600" />
                ) : (
                  <X className="w-4 h-4 mx-auto text-red-500" />
                )}
              </div>
              <div className="p-2 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">Røyking</p>
                {agreement.smoking_allowed ? (
                  <Check className="w-4 h-4 mx-auto text-green-600" />
                ) : (
                  <X className="w-4 h-4 mx-auto text-red-500" />
                )}
              </div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-slate-600">
                Utleier: <strong>{agreement.landlord_name}</strong>
                {agreement.landlord_signed && agreement.landlord_bankid_ref && (
                  <Badge className="ml-2 bg-green-100 text-green-700">
                    BankID signert
                  </Badge>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        {agreement.terms && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4" /> {t('terms')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{agreement.terms}</p>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* BankID Signature */}
        <BankIDSignature 
          onSign={handleBankIDSign}
          isLoading={signMutation.isPending}
          userName={user?.full_name}
          documentType="leieavtale"
        />
      </div>
    </div>
  );
}