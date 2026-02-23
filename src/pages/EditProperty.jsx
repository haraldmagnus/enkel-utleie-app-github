import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function EditProperty() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.RentalUnit.filter({ id: propertyId }).then(r => r[0]),
    enabled: !!propertyId
  });

  const [form, setForm] = useState({ name: '', address: '', monthly_rent: '', description: '', property_type: 'leilighet', bedrooms: '', size_sqm: '', floor: '' });

  useEffect(() => {
    if (property) {
      setForm({
        name: property.name || '',
        address: property.address || '',
        monthly_rent: property.monthly_rent?.toString() || '',
        description: property.description || '',
        property_type: property.property_type || 'leilighet',
        bedrooms: property.bedrooms?.toString() || '',
        size_sqm: property.size_sqm?.toString() || '',
        floor: property.floor || ''
      });
    }
  }, [property]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.RentalUnit.update(propertyId, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['property', propertyId] }); navigate(createPageUrl(`PropertyDetail?id=${propertyId}`)); }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      ...form,
      monthly_rent: form.monthly_rent ? Number(form.monthly_rent) : null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
    });
  };

  const field = (label, key, opts = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={opts.type || 'text'}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        placeholder={opts.placeholder}
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
          <h1 className="font-bold text-gray-900 text-lg">Rediger eiendom</h1>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          {field('Navn', 'name')}
          {field('Adresse', 'address')}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type bolig</label>
            <select value={form.property_type} onChange={e => setForm({ ...form, property_type: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['leilighet','enebolig','rekkehus','hybel','kollektiv','annet'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          {field('Beskrivelse', 'description')}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field('Månedlig leie (kr)', 'monthly_rent', { type: 'number' })}
            {field('Størrelse (m²)', 'size_sqm', { type: 'number' })}
            {field('Antall soverom', 'bedrooms', { type: 'number' })}
            {field('Etasje', 'floor')}
          </div>
        </div>
        <button type="submit" disabled={updateMutation.isPending} className="w-full bg-blue-600 text-white rounded-2xl py-4 font-semibold text-base hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
          {updateMutation.isPending ? 'Lagrer...' : 'Lagre endringer'}
        </button>
      </form>
    </div>
  );
}