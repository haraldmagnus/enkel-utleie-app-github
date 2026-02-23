import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Building2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function AddProperty() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const [form, setForm] = useState({
    name: '', address: '', monthly_rent: '', description: '',
    property_type: 'leilighet', bedrooms: '', size_sqm: '', floor: ''
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RentalUnit.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rentalUnits'] });
      navigate(createPageUrl(`PropertyDetail?id=${res.id}`));
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
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
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="font-bold text-gray-900 text-lg">Ny eiendom</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4 space-y-4">
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