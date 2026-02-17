import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText } from 'lucide-react';
import DrawSignature from '@/components/DrawSignature';

const STANDARD_TERMS = `STANDARD LEIEAVTALE FOR BOLIG

1. LEIEFORHOLDET
Denne avtalen regulerer leieforholdet mellom utleier og leietaker for den angitte boligen. Avtalen er utformet i henhold til Husleieloven.

2. LEIEBELØP OG BETALING
- Leien forfaller til betaling den angitte dato hver måned
- Leien betales til oppgitt kontonummer
- Ved forsinket betaling påløper forsinkelsesrente etter gjeldende satser

3. DEPOSITUM
- Depositumet skal stå på særskilt depositumskonto
- Depositumet tilbakebetales ved utflytting, fratrukket eventuelle krav fra utleier
- Utleier kan ikke disponere depositumet uten leietakers samtykke

4. VEDLIKEHOLD
- Leietaker plikter å behandle boligen med tilbørlig aktsomhet
- Mindre vedlikehold og utskifting av forbruksmateriell påhviler leietaker
- Større vedlikehold og utbedringer påhviler utleier

5. ORDENSREGLER
- Leietaker plikter å følge eventuelle ordensregler for eiendommen
- Leietaker skal vise hensyn til naboer
- Husdyrhold og røyking reguleres av avtalen

6. FREMLEIE
- Fremleie er ikke tillatt uten skriftlig samtykke fra utleier

7. OPPSIGELSE
- Oppsigelse skal skje skriftlig
- Oppsigelsestiden løper fra første dag i måneden etter oppsigelsen

8. UTFLYTTING
- Ved utflytting skal boligen tilbakeleveres i samme stand som ved overtakelse
- Normal slitasje aksepteres
- Utflyttingsbefaring gjennomføres sammen med utleier

9. TVISTER
- Tvister søkes løst i minnelighet
- Ved uenighet kan saken bringes inn for Husleietvistutvalget`;

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
    deposit_account: '',
    rent_due_day: '1',
    rent_account: '',
    utilities_included: false,
    utilities_description: '',
    notice_period_months: '3',
    pets_allowed: false,
    smoking_allowed: false,
    terms: STANDARD_TERMS,
    landlord_address: '',
    landlord_name: ''
  });

  const [isSigning, setIsSigning] = useState(false);

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

  const { data: tenant } = useQuery({
    queryKey: ['tenant', property?.tenant_id],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ id: property.tenant_id });
      return users[0];
    },
    enabled: !!property?.tenant_id
  });

  useEffect(() => {
    if (property?.monthly_rent) {
      setFormData(prev => ({
        ...prev,
        monthly_rent: property.monthly_rent.toString(),
        deposit: (property.monthly_rent * 3).toString()
      }));
    }
  }, [property]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RentalAgreement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agreement', propertyId] });
      navigate(createPageUrl(`PropertyDetail?id=${propertyId}`));
    }
  });

  const handleSign = (signRef) => {
    createMutation.mutate({
      rental_unit_id: propertyId,
      landlord_id: user.id,
      tenant_id: property?.tenant_id || null,
      landlord_name: formData.landlord_name || user.full_name,
      tenant_name: tenant?.full_name || property?.tenant_email || '',
      tenant_address: '',
      landlord_address: formData.landlord_address,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      monthly_rent: Number(formData.monthly_rent),
      deposit: formData.deposit ? Number(formData.deposit) : null,
      deposit_account: formData.deposit_account,
      rent_due_day: Number(formData.rent_due_day),
      rent_account: formData.rent_account,
      utilities_included: formData.utilities_included,
      utilities_description: formData.utilities_description,
      notice_period_months: Number(formData.notice_period_months),
      pets_allowed: formData.pets_allowed,
      smoking_allowed: formData.smoking_allowed,
      terms: formData.terms,
      landlord_signed: true,
      landlord_signed_date: new Date().toISOString(),
      landlord_bankid_ref: signRef,
      status: 'pending_tenant'
    });
  };

  const handleSaveDraft = () => {
    createMutation.mutate({
      rental_unit_id: propertyId,
      landlord_id: user.id,
      tenant_id: property?.tenant_id || null,
      landlord_name: formData.landlord_name || user.full_name,
      tenant_name: tenant?.full_name || property?.tenant_email || '',
      tenant_address: '',
      landlord_address: formData.landlord_address,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      monthly_rent: Number(formData.monthly_rent),
      deposit: formData.deposit ? Number(formData.deposit) : null,
      deposit_account: formData.deposit_account,
      rent_due_day: Number(formData.rent_due_day),
      rent_account: formData.rent_account,
      utilities_included: formData.utilities_included,
      utilities_description: formData.utilities_description,
      notice_period_months: Number(formData.notice_period_months),
      pets_allowed: formData.pets_allowed,
      smoking_allowed: formData.smoking_allowed,
      terms: formData.terms,
      landlord_signed: false,
      status: 'draft'
    });
  };

  const isFormValid = formData.start_date && formData.monthly_rent;

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
          <h1 className="text-xl font-bold">{t('createAgreement')}</h1>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-4">
          {property && (
            <Card className="bg-blue-100 border-blue-300">
              <CardContent className="p-4">
                <p className="text-sm text-blue-800">
                  Oppretter avtale for: <strong>{property.name}</strong>
                </p>
                <p className="text-xs text-blue-600">{property.address}</p>
                {tenant && (
                  <p className="text-xs text-blue-700 mt-2">
                    Leietaker: <strong>{tenant.full_name || tenant.email}</strong>
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {property?.tenant_id && tenant && (!tenant.full_name || !tenant.birth_date || !tenant.phone_number) && (
            <Card className="bg-yellow-50 border-yellow-300">
              <CardContent className="p-4">
                <p className="text-sm text-yellow-800 font-medium">⚠️ Mangler leietakerinformasjon</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Leietaker må fullføre sin profil før avtalen kan signeres og ferdigstilles
                </p>
              </CardContent>
            </Card>
          )}

          {/* Grunnleggende info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" /> Leieperiode og beløp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('startDate')} *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>{t('endDate')}</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('monthlyRent')} (kr) *</Label>
                  <Input
                    type="number"
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>{t('deposit')} (kr)</Label>
                  <Input
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Betalingsdetaljer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Betalingsdetaljer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Kontonummer for husleie</Label>
                <Input
                  value={formData.rent_account}
                  onChange={(e) => setFormData({ ...formData, rent_account: e.target.value })}
                  placeholder="1234.56.78901"
                />
              </div>

              <div>
                <Label>Depositumskonto</Label>
                <Input
                  value={formData.deposit_account}
                  onChange={(e) => setFormData({ ...formData, deposit_account: e.target.value })}
                  placeholder="1234.56.78901"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forfallsdag</Label>
                  <Select 
                    value={formData.rent_due_day}
                    onValueChange={(v) => setFormData({ ...formData, rent_due_day: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 5, 10, 15, 20, 25].map(d => (
                        <SelectItem key={d} value={d.toString()}>{d}. hver måned</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Oppsigelsestid</Label>
                  <Select 
                    value={formData.notice_period_months}
                    onValueChange={(v) => setFormData({ ...formData, notice_period_months: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 måned</SelectItem>
                      <SelectItem value="2">2 måneder</SelectItem>
                      <SelectItem value="3">3 måneder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Regler */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regler og betingelser</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Strøm/vann inkludert</Label>
                  <p className="text-xs text-slate-500">Er strøm og vann inkludert i leien?</p>
                </div>
                <Switch
                  checked={formData.utilities_included}
                  onCheckedChange={(c) => setFormData({ ...formData, utilities_included: c })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Husdyr tillatt</Label>
                  <p className="text-xs text-slate-500">Kan leietaker ha husdyr?</p>
                </div>
                <Switch
                  checked={formData.pets_allowed}
                  onCheckedChange={(c) => setFormData({ ...formData, pets_allowed: c })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Røyking tillatt</Label>
                  <p className="text-xs text-slate-500">Er røyking tillatt innendørs?</p>
                </div>
                <Switch
                  checked={formData.smoking_allowed}
                  onCheckedChange={(c) => setFormData({ ...formData, smoking_allowed: c })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Vilkår */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('terms')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={10}
                className="text-xs"
              />
            </CardContent>
          </Card>

          {/* Utleier info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Utleiers informasjon</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Navn</Label>
                  <Input value={user?.full_name || ''} disabled className="bg-slate-50" />
                </div>
                <div>
                  <Label>Adresse</Label>
                  <Input
                    value={formData.landlord_address}
                    onChange={(e) => setFormData({ ...formData, landlord_address: e.target.value })}
                    placeholder="Din adresse"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leietaker informasjon */}
          {tenant && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Leietakers informasjon</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>Navn</Label>
                    <Input value={tenant.full_name || tenant.email || 'Ikke oppgitt'} disabled className="bg-slate-50" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Fødselsdato</Label>
                      <Input value={tenant.birth_date || 'Ikke oppgitt'} disabled className="bg-slate-50" />
                    </div>
                    <div>
                      <Label>Telefon</Label>
                      <Input value={tenant.phone_number || 'Ikke oppgitt'} disabled className="bg-slate-50" />
                    </div>
                  </div>
                  <div>
                    <Label>E-post</Label>
                    <Input value={tenant.email} disabled className="bg-slate-50" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* BankID Signering */}
          {isFormValid && (
            <BankIDSignature 
              onSign={handleBankIDSign}
              isLoading={createMutation.isPending}
              userName={user?.full_name}
              documentType="leieavtale"
              disabled={tenant && (!tenant.full_name || !tenant.birth_date || !tenant.phone_number)}
            />
          )}

          {tenant && (!tenant.full_name || !tenant.birth_date || !tenant.phone_number) && (
            <p className="text-sm text-center text-yellow-700 bg-yellow-50 p-3 rounded-lg">
              Avtalen kan ikke signeres før leietaker har fullført sin profil
            </p>
          )}

          <Button 
            variant="outline"
            className="w-full"
            onClick={handleSaveDraft}
            disabled={!isFormValid || createMutation.isPending}
          >
            Lagre som utkast (uten signering)
          </Button>
        </div>
      </div>
    </div>
  );
}