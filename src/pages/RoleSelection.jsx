import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Home } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function RoleSelection() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const selectRole = async (role) => {
    setLoading(true);
    await base44.auth.updateMe({ active_role: role });
    navigate(createPageUrl(role === 'landlord' ? 'Dashboard' : 'TenantDashboard'), { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-white">Enkel Utleie</h1>
          <p className="text-blue-200 mt-2">Hei, {user?.full_name?.split(' ')[0] || 'deg'}! Hvem er du?</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => selectRole('landlord')}
            disabled={loading}
            className="w-full bg-white rounded-2xl p-5 flex items-center gap-4 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900 text-lg">Utleier</p>
              <p className="text-gray-500 text-sm">Administrer eiendommer og leietakere</p>
            </div>
          </button>

          <button
            onClick={() => selectRole('tenant')}
            disabled={loading}
            className="w-full bg-white/10 border border-white/20 rounded-2xl p-5 flex items-center gap-4 hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Home className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white text-lg">Leietaker</p>
              <p className="text-blue-200 text-sm">Se din bolig, betaling og meldinger</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}