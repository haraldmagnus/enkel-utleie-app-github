import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Home, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function RoleSelection() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const setRoleMutation = useMutation({
    mutationFn: async (role) => {
      console.log('🔵 Setting role:', { email: user.email, role });
      await base44.auth.updateMe({ role });
      return role;
    },
    onSuccess: (role) => {
      console.log('✅ Role set successfully:', role);
      const targetPage = role === 'landlord' ? 'Dashboard' : 'TenantDashboard';
      navigate(createPageUrl(targetPage), { replace: true });
    },
    onError: (error) => {
      console.error('❌ Failed to set role:', error);
      alert('Kunne ikke sette rolle. Prøv igjen.');
    }
  });

  useEffect(() => {
    if (!isLoading && user?.role) {
      console.log('🔵 User already has role:', user.role);
      const targetPage = user.role === 'landlord' ? 'Dashboard' : 'TenantDashboard';
      navigate(createPageUrl(targetPage), { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleContinue = () => {
    if (!selectedRole) return;
    setRoleMutation.mutate(selectedRole);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Velkommen til Utleieoversikt
          </h1>
          <p className="text-slate-600">
            Velg din rolle for å komme i gang
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Rollen knyttes til din e-post og kan ikke endres senere
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card 
            className={`cursor-pointer transition-all ${
              selectedRole === 'landlord' 
                ? 'ring-2 ring-blue-600 bg-blue-50' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => setSelectedRole('landlord')}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Building className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Utleier</h2>
                <p className="text-sm text-slate-600">
                  Administrer eiendommer, leietakere, leieavtaler og økonomi
                </p>
                <ul className="mt-4 text-sm text-slate-600 space-y-1 text-left w-full">
                  <li>✓ Legg til eiendommer</li>
                  <li>✓ Inviter leietakere</li>
                  <li>✓ Opprett leieavtaler</li>
                  <li>✓ Økonomioversikt</li>
                  <li>✓ Vedlikeholdslogg</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${
              selectedRole === 'tenant' 
                ? 'ring-2 ring-blue-600 bg-blue-50' 
                : 'hover:shadow-lg'
            }`}
            onClick={() => setSelectedRole('tenant')}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Home className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Leietaker</h2>
                <p className="text-sm text-slate-600">
                  Se din bolig, leieavtale, dokumentasjon og kommuniser med utleier
                </p>
                <ul className="mt-4 text-sm text-slate-600 space-y-1 text-left w-full">
                  <li>✓ Se boligdetaljer</li>
                  <li>✓ Leieavtale og dokumenter</li>
                  <li>✓ Chat med utleier</li>
                  <li>✓ Kalender og påminnelser</li>
                  <li>✓ Varsler om viktige datoer</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base"
          onClick={handleContinue}
          disabled={!selectedRole || setRoleMutation.isPending}
        >
          {setRoleMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Setter opp konto...
            </>
          ) : (
            'Fortsett'
          )}
        </Button>

        <p className="text-xs text-center text-slate-500 mt-4">
          Ønsker du bruke begge roller? Opprett to separate kontoer med ulike e-postadresser.
        </p>
      </div>
    </div>
  );
}