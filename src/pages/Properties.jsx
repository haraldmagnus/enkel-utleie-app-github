import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, Search, MapPin, ChevronRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Properties() {
  const [search, setSearch] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: allProperties = [], isLoading } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.list('-created_date', 100),
    enabled: !!user?.id
  });

  const properties = allProperties.filter(p =>
    p.landlord_id === user?.id || (p.landlord_ids || []).includes(user?.id)
  ).filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.address?.toLowerCase().includes(search.toLowerCase())
  );

  const statusLabel = { occupied: 'Utleid', vacant: 'Ledig', pending_invitation: 'Invitert' };
  const statusStyle = {
    occupied: 'bg-blue-100 text-blue-700',
    vacant: 'bg-green-100 text-green-700',
    pending_invitation: 'bg-yellow-100 text-yellow-700'
  };

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Search + Add */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Søk eiendommer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Link to={createPageUrl('AddProperty')} className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors flex-shrink-0">
          <Plus className="w-4 h-4" /> Legg til
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : properties.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Building2 className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-700 mb-1">{search ? 'Ingen treff' : 'Ingen eiendommer ennå'}</p>
          <p className="text-gray-400 text-sm mb-5">{search ? 'Prøv et annet søk' : 'Kom i gang ved å legge til din første eiendom'}</p>
          {!search && (
            <Link to={createPageUrl('AddProperty')} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Legg til eiendom
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {properties.map(p => (
            <Link key={p.id} to={createPageUrl(`PropertyDetail?id=${p.id}`)} className="block bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusStyle[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[p.status] || p.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {p.address}
                  </p>
                  {p.monthly_rent && (
                    <p className="text-sm font-semibold text-blue-600 mt-1">{p.monthly_rent.toLocaleString()} kr/mnd</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}