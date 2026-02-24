import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Send, Lock, AlertTriangle } from 'lucide-react';
import { createPageUrl } from '@/utils';

const STANDARD_TERMS = `1. LEIEFORHOLDET
Denne avtalen regulerer leieforholdet mellom utleier og leietaker for den angitte boligen i henhold til Husleieloven. Leieforholdet gjelder bolig som definert i husleieloven § 1-1.

2. LEIEBELØP OG BETALING
Leien forfaller til betaling forskuddsvis den avtalte datoen hver måned. Ved forsinket betaling påløper forsinkelsesrente etter forsinkelsesrenteloven. Utleier kan med én måneds skriftlig varsel kreve leien regulert i takt med endringene i konsumprisindeksen, jfr. husleieloven § 4-2. Regulering kan tidligst settes i verk ett år etter at siste leiefastsetting ble satt i verk.

3. DEPOSITUM / SIKKERHET
Leier stiller sikkerhet for skyldig leie, skader på boligen/inventar, manglende rengjøring ved utflytting, utgifter til fravikelse og for andre krav som reiser seg av avtalen. Depositumet skal stå på særskilt depositumskonto i leiers navn og tilbakebetales ved utflytting, fratrukket eventuelle krav. Sikkerhet må foreligge før leieforholdets startdato. Leier har ikke rett på nøkler eller tilgang til boligen før det er stilt depositum eller garanti etter avtalen.

4. VEDLIKEHOLD
Leier plikter å vedlikeholde dørlåser, kraner, vannklosetter, elektriske kontakter og brytere, varmtvannsbeholdere og løst inventar i boligen. Leier plikter også å foreta nødvendig funksjonskontroll, rengjøring, batteriskift, testing og lignende av røykvarsler og brannslukkingsutstyr. Annet vedlikehold, og hvis gjenstander som tilhører utleieren må skiftes ut, påhviler dette utleieren hvis annet ikke er avtalt, jfr. husleieloven § 5-3.

5. FORSIKRING
Leier må tegne egen innboforsikring. Dette sikrer både leier og utleier for økonomiske tap hvis noe skulle oppstå rundt eiendeler, ansvar eller rettshjelp. Hvis leier likevel ikke tegner egen innboforsikring, må dette avtales eksplisitt.

6. ORDENSREGLER
Leier må behandle boligen med tilbørlig aktsomhet og ellers i samsvar med leieavtalen. Leier plikter å følge vanlige ordensregler og rimelige påbud fra utleier.

7. FREMLEIE
Fremleie er ikke tillatt uten utleiers skriftlige samtykke, med mindre annet følger av loven eller avtale.

8. OPPSIGELSE
Oppsigelse skal skje skriftlig. Oppsigelsestiden løper fra første dag i måneden etter at oppsigelsen er mottatt. Partene kan i leieperioden si opp leieforholdet med avtalt oppsigelsesfrist i henhold til husleieloven.

9. LEIEFORHOLDETS OPPHØR
I de siste 3 måneder av leieforholdet plikter leier å gi leiesøkende, eiendomsmegler, mulige kjøpere av eiendommen og håndverkere adgang til å besiktige boligen etter avtale med leier. Ved utflytting skal boligen og alt tilbehør stilles til utleiers disposisjon. Boligen skal være ryddet og rengjort. Utleier og leier befarer boligen i fellesskap og kontrollerer rengjøring og eventuelle brekkasjer eller unormal slitasje/elde. Alle nøkler til boligen skal tilbakeleveres.

10. FRAVIKELSESKLAUSUL
Leieren godtar at utkastelse (tvangsfravikelse) kan kreves hvis leien ikke blir betalt innen 14 dager etter at skriftlig varsel i henhold til tvangsloven § 4-18 er sendt. Varselet kan sendes tidligst på forfallsdagen, jfr. tvangsloven § 13-2, 3. ledd a. Leieren godtar at utkastelse kan kreves når leietiden er løpt ut, jfr. tvangsloven § 13-2, 3. ledd b.

11. LOVVALG
Denne avtalen er underlagt norsk rett. Tvister mellom partene søkes løst i minnelighet. Fører ikke dette frem, kan tvisten bringes inn for de ordinære domstolene med verneting der eiendommen er beliggende.`;

export default function CreateAgreement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');
  const agreementId = urlParams.get('agreementId');

  const [form, setForm] = useState({
    landlord_name: '', landlord_address: '', property_number: '', start_date: '', end_date: '', monthly_rent: '',
    deposit: '', deposit_account: '', rent_due_day: '1', rent_account: '',
    utilities_included: false, utilities_description: '', notice_period_months: '3',
    pets_allowed: false, smoking_allowed: false, terms: STANDARD_TERMS
  });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.RentalUnit.filter({ id: propertyId }).then(r => r[0]),
    enabled: !!propertyId
  });
  const { data: existing } = useQuery({
    queryKey: ['agreement-edit', agreementId],
    queryFn: () => base44.entities.RentalAgreement.filter({ id: agreementId }).then(r => r[0]),
    enabled: !!agreementId
  });

  useEffect(() => {
    if (user) setForm(f => ({ ...f, landlord_name: f.landlord_name || user.full_name || '' }));
  }, [user]);

  useEffect(() => {
    if (property && !agreementId) {
      setForm(f => ({
        ...f,
        monthly_rent: property.monthly_rent?.toString() || '',
        deposit: property.monthly_rent ? (property.monthly_rent * 3).toString() : '',
      }));
    }
  }, [property, agreementId]);

  useEffect(() => {
    if (existing) {
      setForm(f => ({
        ...f,
        landlord_name: existing.landlord_name || '',
        landlord_address: existing.landlord_address || '',
        property_number: existing.property_number || '',
        start_date: existing.start_date || '',
        end_date: existing.end_date || '',
        monthly_rent: existing.monthly_rent?.toString() || '',
        deposit: existing.deposit?.toString() || '',
        deposit_account: existing.deposit_account || '',
        rent_due_day: existing.rent_due_day?.toString() || '1',
        rent_account: existing.rent_account || '',
        utilities_included: existing.utilities_included || false,
        utilities_description: existing.utilities_description || '',
        notice_period_months: existing.notice_period_months?.toString() || '3',
        pets_allowed: existing.pets_allowed || false,
        smoking_allowed: existing.smoking_allowed || false,
        terms: existing.terms || STANDARD_TERMS,
      }));
    }
  }, [existing]);

  const isFullySigned = existing?.landlord_signed && existing?.tenant_signed && existing?.status === 'active';

  const saveMutation = useMutation({
    mutationFn: (data) => agreementId
      ? base44.entities.RentalAgreement.update(agreementId, data)
      : base44.entities.RentalAgreement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agreement', propertyId] }); navigate(createPageUrl(`PropertyDetail?id=${propertyId}`)); }
  });

  // Amendment: reset signatures and notify both parties
  const amendMutation = useMutation({
    mutationFn: async (data) => {
      const updated = await base44.entities.RentalAgreement.update(agreementId, {
        ...data,
        status: 'draft',
        landlord_signed: false,
        tenant_signed: false,
        landlord_signed_date: null,
        tenant_signed_date: null,
        landlord_signature_image: null,
        tenant_signature_image: null,
      });
      // Notify both parties
      const notifBase = { type: 'agreement', rental_unit_id: propertyId, related_id: agreementId, read: false };
      const msg = `Leieavtalen for ${property?.name} er endret og må signeres på nytt.`;
      if (existing?.landlord_id && existing.landlord_id !== user?.id) {
        await base44.entities.Notification.create({ ...notifBase, user_id: existing.landlord_id, title: 'Leieavtale endret – ny signering kreves', message: msg });
      }
      if (existing?.tenant_id && existing.tenant_id !== user?.id) {
        await base44.entities.Notification.create({ ...notifBase, user_id: existing.tenant_id, title: 'Leieavtale endret – ny signering kreves', message: msg });
      }
      return updated;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agreement', propertyId] }); navigate(createPageUrl(`PropertyDetail?id=${propertyId}`)); }
  });

  const sendToTenantMutation = useMutation({
    mutationFn: async (data) => {
      const agreement = await (agreementId
        ? base44.entities.RentalAgreement.update(agreementId, { ...data, status: 'pending_tenant' })
        : base44.entities.RentalAgreement.create({ ...data, status: 'pending_tenant' }));
      if (property?.tenant_id) {
        await base44.entities.Notification.create({
          user_id: property.tenant_id, type: 'agreement',
          title: 'Ny leieavtale til signering', message: `${user.full_name} har sendt deg en leieavtale for ${property.name}`,
          rental_unit_id: propertyId, related_id: agreement.id, read: false
        });
      }
      return agreement;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agreement', propertyId] }); navigate(createPageUrl(`PropertyDetail?id=${propertyId}`)); }
  });

  const buildPayload = () => ({
    rental_unit_id: propertyId, landlord_id: user.id,
    tenant_id: property?.tenant_id || null,
    landlord_name: form.landlord_name, landlord_address: form.landlord_address,
    tenant_name: property?.manual_tenant_name || property?.tenant_email || '',
    start_date: form.start_date, end_date: form.end_date || null,
    monthly_rent: Number(form.monthly_rent), deposit: form.deposit ? Number(form.deposit) : null,
    deposit_account: form.deposit_account, rent_due_day: Number(form.rent_due_day),
    rent_account: form.rent_account, utilities_included: form.utilities_included,
    utilities_description: form.utilities_description, notice_period_months: Number(form.notice_period_months),
    pets_allowed: form.pets_allowed, smoking_allowed: form.smoking_allowed, terms: form.terms,
    landlord_signed: false, tenant_signed: false, status: 'draft'
  });

  const toggle = (key) => setForm(f => ({ ...f, [key]: !f[key] }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">{agreementId ? 'Rediger avtale' : 'Ny leieavtale'}</h1>
            {property && <p className="text-xs text-gray-400">{property.name}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Parties */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /> Parter</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Utleiers navn <span className="text-red-400">*</span></label>
            <input type="text" value={form.landlord_name} onChange={e => setForm(f => ({ ...f, landlord_name: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Utleiers adresse</label>
            <input type="text" value={form.landlord_address} onChange={e => setForm(f => ({ ...f, landlord_address: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {property && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500">Leietaker: <strong>{property.manual_tenant_name || property.tenant_email || 'Ikke satt'}</strong></p>
            </div>
          )}
        </div>

        {/* Period & amounts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Periode og beløp</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Startdato <span className="text-red-400">*</span></label>
              <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sluttdato (tom = løpende)</label>
              <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Månedlig leie (kr) <span className="text-red-400">*</span></label>
              <input type="number" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Depositum (kr)</label>
              <input type="number" value={form.deposit} onChange={e => setForm(f => ({ ...f, deposit: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Payment details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Betalingsdetaljer</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Forfallsdag (1-28)</label>
              <input type="number" value={form.rent_due_day} onChange={e => setForm(f => ({ ...f, rent_due_day: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kontonr. for leie</label>
              <input type="text" value={form.rent_account} onChange={e => setForm(f => ({ ...f, rent_account: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kontonr. for depositum</label>
              <input type="text" value={form.deposit_account} onChange={e => setForm(f => ({ ...f, deposit_account: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Oppsigelsestid (mnd)</label>
              <input type="number" value={form.notice_period_months} onChange={e => setForm(f => ({ ...f, notice_period_months: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {/* Conditions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Betingelser</h2>
          {[
            { key: 'utilities_included', label: 'Strøm/vann inkludert' },
            { key: 'pets_allowed', label: 'Kjæledyr tillatt' },
            { key: 'smoking_allowed', label: 'Røyking tillatt' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-700">{label}</span>
              <button type="button" onClick={() => toggle(key)} className={`relative w-11 h-6 rounded-full transition-colors ${form[key] ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
          {form.utilities_included && (
            <textarea value={form.utilities_description} onChange={e => setForm(f => ({ ...f, utilities_description: e.target.value }))} placeholder="Beskriv hva som er inkludert" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          )}
        </div>

        {/* Terms */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Vilkår og betingelser</h2>
          <textarea value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} rows={8} disabled={isFullySigned} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono disabled:bg-gray-50 disabled:text-gray-400" />
        </div>

        {/* Locked banner */}
        {isFullySigned && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Kontrakten er låst</p>
              <p className="text-xs text-amber-600 mt-0.5">Denne avtalen er signert av begge parter. Endringer vil nullstille begge signaturer og kreve ny signering fra begge.</p>
            </div>
          </div>
        )}

        {/* Actions */}
        {isFullySigned ? (
          <button
            onClick={() => {
              if (window.confirm('Er du sikker? Endringer vil nullstille begge signaturer og avtalen må signeres på nytt av begge parter.')) {
                amendMutation.mutate(buildPayload());
              }
            }}
            disabled={amendMutation.isPending || !form.start_date || !form.monthly_rent}
            className="w-full bg-amber-500 text-white rounded-2xl py-4 font-semibold text-sm hover:bg-amber-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            {amendMutation.isPending ? 'Lagrer...' : 'Lagre endringer og be om ny signering'}
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => saveMutation.mutate(buildPayload())} disabled={saveMutation.isPending || !form.start_date || !form.monthly_rent} className="bg-gray-100 text-gray-700 rounded-2xl py-4 font-semibold text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors">
              {saveMutation.isPending ? 'Lagrer...' : 'Lagre utkast'}
            </button>
            <button onClick={() => sendToTenantMutation.mutate(buildPayload())} disabled={sendToTenantMutation.isPending || !form.start_date || !form.monthly_rent || !property?.tenant_id} className="bg-blue-600 text-white rounded-2xl py-4 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> {sendToTenantMutation.isPending ? 'Sender...' : 'Send til leietaker'}
            </button>
          </div>
        )}
        {!isFullySigned && !property?.tenant_id && (
          <p className="text-xs text-center text-gray-400">Send krever at en leietaker er invitert og har akseptert</p>
        )}
      </div>
    </div>
  );
}