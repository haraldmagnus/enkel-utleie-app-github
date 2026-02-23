import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Send } from 'lucide-react';
import { createPageUrl } from '@/utils';

const STANDARD_TERMS = `1. LEIEFORHOLDET
Denne avtalen regulerer leieforholdet mellom utleier og leietaker for den angitte boligen i henhold til Husleieloven.

2. LEIEBELØP OG BETALING
Leien forfaller til betaling den angitte dato hver måned. Ved forsinket betaling påløper forsinkelsesrente.

3. DEPOSITUM
Depositumet skal stå på særskilt depositumskonto og tilbakebetales ved utflytting, fratrukket eventuelle krav.

4. VEDLIKEHOLD
Leietaker plikter å behandle boligen med tilbørlig aktsomhet. Større vedlikehold påhviler utleier.

5. OPPSIGELSE
Oppsigelse skal skje skriftlig. Oppsigelsestiden løper fra første dag i måneden etter oppsigelsen.

6. UTFLYTTING
Ved utflytting skal boligen tilbakeleveres i samme stand som ved overtakelse. Normal slitasje aksepteres.`;

export default function CreateAgreement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');
  const agreementId = urlParams.get('agreementId');

  const [form, setForm] = useState({
    landlord_name: '', landlord_address: '', start_date: '', end_date: '', monthly_rent: '',
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

  const saveMutation = useMutation({
    mutationFn: (data) => agreementId
      ? base44.entities.RentalAgreement.update(agreementId, data)
      : base44.entities.RentalAgreement.create(data),
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
          <textarea value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))} rows={8} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono" />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => saveMutation.mutate(buildPayload())} disabled={saveMutation.isPending || !form.start_date || !form.monthly_rent} className="bg-gray-100 text-gray-700 rounded-2xl py-4 font-semibold text-sm hover:bg-gray-200 disabled:opacity-50 transition-colors">
            {saveMutation.isPending ? 'Lagrer...' : 'Lagre utkast'}
          </button>
          <button onClick={() => sendToTenantMutation.mutate(buildPayload())} disabled={sendToTenantMutation.isPending || !form.start_date || !form.monthly_rent || !property?.tenant_id} className="bg-blue-600 text-white rounded-2xl py-4 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> {sendToTenantMutation.isPending ? 'Sender...' : 'Send til leietaker'}
          </button>
        </div>
        {!property?.tenant_id && (
          <p className="text-xs text-center text-gray-400">Send krever at en leietaker er invitert og har akseptert</p>
        )}
      </div>
    </div>
  );
}