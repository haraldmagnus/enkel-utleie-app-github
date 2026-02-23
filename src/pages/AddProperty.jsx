import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2, Search, Loader2, CheckCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AddProperty() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const [finnCode, setFinnCode] = useState('');
  const [finnLoading, setFinnLoading] = useState(false);
  const [finnFetched, setFinnFetched] = useState(false);

  const [form, setForm] = useState({
    name: '', address: '', monthly_rent: '', description: '',
    property_type: 'leilighet', bedrooms: '', size_sqm: '', floor: '', finn_code: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RentalUnit.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rentalUnits'] });
      navigate(createPageUrl(`PropertyDetail?id=${res.id}`));
    }
  });

  const fetchFromFinn = async () => {
    if (!finnCode.trim()) return;
    setFinnLoading(true);
    setFinnFetched(false);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Fetch information about a Norwegian real estate listing from Finn.no with code: ${finnCode.trim()}.
The URL would be: https://www.finn.no/realestate/lettings/ad.html?finnkode=${finnCode.trim()}
Use the internet to fetch real data from this listing.
Extract: name (short descriptive name like "Gateadresse X, leil. Y"), full address, monthly rent in NOK (numbers only), 
size in m², number of bedrooms, floor (e.g. "3. etg"), property type (leilighet/enebolig/rekkehus/hybel/annet), 
and a brief description in Norwegian.
If you cannot find the listing, return empty strings.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { type: 'string' },
          monthly_rent: { type: 'string' },
          size_sqm: { type: 'string' },
          bedrooms: { type: 'string' },
          floor: { type: 'string' },
          property_type: { type: 'string' },
          description: { type: 'string' }
        }
      }
    });

    if (result) {
      setForm(prev => ({
        ...prev,
        name: result.name || prev.name,
        address: result.address || prev.address,
        monthly_rent: result.monthly_rent || prev.monthly_rent,
        size_sqm: result.size_sqm || prev.size_sqm,
        bedrooms: result.bedrooms || prev.bedrooms,
        floor: result.floor || prev.floor,
        property_type: result.property_type || prev.property_type,
        description: result.description || prev.description,
        finn_code: finnCode.trim()
      }));
      setFinnFetched(true);
    }
    setFinnLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
      finn_code: finnCode.trim() || undefined,
      landlord_id: user.id,
      landlord_ids: [user.id],
      status: 'vacant'
    });
  };

  const field = (label, key, opts = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}{opts.required && <span className="text-red-500 ml-1">*</span>}</label>
      <input
        type={opts.type || 'text'}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        placeholder={opts.placeholder}
        required={opts.required}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-blue-600 shadow-md">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center hover:bg-blue-400 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-bold text-white text-lg">Ny eiendom</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4 space-y-4">

        {/* Finn.no søk */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <Search className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Hent fra Finn.no</h2>
            <span className="text-xs text-gray-400 ml-auto">Valgfritt</span>
          </div>
          <p className="text-sm text-gray-500">Lim inn Finn-koden for å fylle ut informasjon automatisk.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={finnCode}
              onChange={e => setFinnCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), fetchFromFinn())}
              placeholder="F.eks. 123456789"
              className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
            />
            <button
              type="button"
              onClick={fetchFromFinn}
              disabled={finnLoading || !finnCode.trim()}
              className="bg-orange-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {finnLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {finnLoading ? 'Henter...' : 'Søk'}
            </button>
          </div>
          {finnFetched && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-3 py-2 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Informasjon hentet fra Finn.no – se gjennom og juster om nødvendig.
            </div>
          )}
        </div>

        {/* Eiendomsinfo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-50">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Eiendomsinfo</h2>
          </div>
          {field('Navn på eiendom', 'name', { required: true, placeholder: 'F.eks. Pilestredet 12, leil. 3' })}
          {field('Adresse', 'address', { required: true, placeholder: 'Gateadresse, postnummer, by' })}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type bolig</label>
            <select
              value={form.property_type}
              onChange={e => setForm({ ...form, property_type: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['leilighet','enebolig','rekkehus','hybel','kollektiv','annet'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          {field('Beskrivelse', 'description', { placeholder: 'Kort beskrivelse...' })}
        </div>

        {/* Detaljer */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900 pb-2 border-b border-gray-50">Detaljer</h2>
          <div className="grid grid-cols-2 gap-3">
            {field('Månedlig leie (kr)', 'monthly_rent', { type: 'number', placeholder: '12 000' })}
            {field('Størrelse (m²)', 'size_sqm', { type: 'number', placeholder: '50' })}
            {field('Antall soverom', 'bedrooms', { type: 'number', placeholder: '2' })}
            {field('Etasje', 'floor', { placeholder: '3. etg' })}
          </div>
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending || !form.name || !form.address}
          className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {createMutation.isPending ? 'Oppretter...' : 'Opprett eiendom'}
        </button>
      </form>
    </div>
  );
}