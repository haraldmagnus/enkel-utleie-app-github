import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Building2, User, ArrowRight, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';

export default function RoleSelection() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleContinue = async () => {
    if (!selectedRole) return;
    
    setIsLoading(true);
    console.log('🔵 Role selected:', selectedRole);
    
    try {
      console.log('🔵 Updating active_role via API...');
      await base44.auth.updateMe({ active_role: selectedRole, language: 'no' });
      console.log('✅ Active role updated successfully');
    } catch (error) {
      console.log('⚠️ Could not update active role via API:', error.message);
      // Store role in localStorage as fallback
      try {
        localStorage.setItem('user_role_override', selectedRole);
        console.log('✅ Stored role in localStorage as fallback');
      } catch (storageError) {
        console.error('❌ Failed to store role in localStorage:', storageError);
      }
    }
    
    console.log('🔵 Navigating to:', selectedRole === 'landlord' ? 'Dashboard' : 'TenantDashboard');
    
    // Use replace to avoid back button loop
    if (selectedRole === 'landlord') {
      navigate(createPageUrl('Dashboard'), { replace: true });
    } else {
      navigate(createPageUrl('TenantDashboard'), { replace: true });
    }
    
    // Don't set isLoading to false - we're navigating away
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Velkommen til Utleieoversikt</h1>
        <p className="text-slate-600">Velg din rolle for å komme i gang</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <Card 
          className={`cursor-pointer transition-all ${
            selectedRole === 'landlord' 
              ? 'ring-2 ring-blue-600 bg-blue-50' 
              : 'hover:bg-slate-50'
          }`}
          onClick={() => setSelectedRole('landlord')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              selectedRole === 'landlord' ? 'bg-blue-600' : 'bg-blue-100'
            }`}>
              <Building2 className={`w-6 h-6 ${
                selectedRole === 'landlord' ? 'text-white' : 'text-blue-600'
              }`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Utleier</h3>
              <p className="text-sm text-slate-500">Administrer dine utleieenheter</p>
            </div>
            {selectedRole === 'landlord' && (
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${
            selectedRole === 'tenant' 
              ? 'ring-2 ring-blue-600 bg-blue-50' 
              : 'hover:bg-slate-50'
          }`}
          onClick={() => setSelectedRole('tenant')}
        >
          <CardContent className="p-6 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              selectedRole === 'tenant' ? 'bg-blue-600' : 'bg-blue-100'
            }`}>
              <User className={`w-6 h-6 ${
                selectedRole === 'tenant' ? 'text-white' : 'text-blue-600'
              }`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">Leietaker</h3>
              <p className="text-sm text-slate-500">Se din leiebolig og kommuniser med utleier</p>
            </div>
            {selectedRole === 'tenant' && (
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </CardContent>
        </Card>

        <Button 
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
          disabled={!selectedRole || isLoading}
          onClick={handleContinue}
        >
          {isLoading ? 'Laster...' : 'Fortsett'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <div className="mt-2 flex justify-center">
          <button
            onClick={() => base44.auth.logout()}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Logg ut
          </button>
        </div>
      </div>
    </div>
  );
}