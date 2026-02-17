import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle, Loader2, Building2, Home, Check } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const [selectedRole, setSelectedRole] = useState('');
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    birth_date: user?.birth_date || '',
    phone_number: user?.phone_number || ''
  });

  // Prefill form with existing user data when loaded
  React.useEffect(() => {
    if (user) {
      console.log('🔵 CompleteProfile: User loaded:', {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        user_role: user.user_role,
        role_locked: user.role_locked
      });
      
      setFormData({
        full_name: user.full_name || '',
        birth_date: user.birth_date || '',
        phone_number: user.phone_number || ''
      });
      setSelectedRole(user.user_role || '');
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      console.log('🔵 CompleteProfile: Saving registration data via backend function:', {
        userId: user?.id,
        email: user?.email,
        payload: data
      });
      
      if (!user?.id) {
        throw new Error('User ID not available for profile update.');
      }

      try {
        const response = await base44.functions.invoke('updateUserProfile', {
          userId: user.id,
          full_name: data.full_name,
          birth_date: data.birth_date,
          phone_number: data.phone_number,
          user_role: data.user_role,
          role_locked: true
        });
        
        console.log('✅ CompleteProfile: Backend function response:', response.data);
        return response.data;
      } catch (error) {
        console.error('❌ CompleteProfile: Backend function call failed:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || 'Unknown error from backend function');
      }
    },
    onSuccess: async () => {
      console.log('✅ CompleteProfile: Save successful, refetching user...');
      
      // Wait for user to be refetched with new data
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await queryClient.refetchQueries({ queryKey: ['currentUser'] });
      
      const updatedUser = queryClient.getQueryData(['currentUser']);
      
      console.log('🔵 CompleteProfile: Refetched user:', {
        id: updatedUser?.id,
        email: updatedUser?.email,
        full_name: updatedUser?.full_name,
        user_role: updatedUser?.user_role,
        role_locked: updatedUser?.role_locked
      });
      
      // Read role from user.user_role (Base44 exposes data.user_role as user.user_role)
      const appRole = updatedUser?.user_role;
      const targetPage = appRole === 'landlord' ? 'Dashboard' : 'TenantDashboard';
      
      console.log('✅ CompleteProfile: Navigating to', targetPage, 'for user_role:', appRole);
      navigate(createPageUrl(targetPage), { replace: true });
    },
    onError: (error) => {
      console.error('❌ CompleteProfile: Mutation error:', {
        message: error.message,
        stack: error.stack
      });
      alert('Kunne ikke lagre profil: ' + error.message + '\n\nSe konsoll for detaljer.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    console.log('🔵 CompleteProfile: Submit clicked', { 
      formData, 
      selectedRole,
      isPending: updateMutation.isPending 
    });
    
    if (!selectedRole) {
      console.log('❌ No role selected');
      alert('Vennligst velg en rolle');
      return;
    }
    
    // Validate phone number (Norwegian format - 8 digits starting with 4-9)
    const cleanPhone = formData.phone_number.replace(/\s/g, '');
    const phoneRegex = /^[4-9]\d{7}$/;
    
    console.log('🔵 Phone validation:', { 
      original: formData.phone_number, 
      cleaned: cleanPhone, 
      matches: phoneRegex.test(cleanPhone) 
    });
    
    if (!phoneRegex.test(cleanPhone)) {
      console.log('❌ Phone validation failed');
      alert('Vennligst oppgi et gyldig norsk telefonnummer (8 siffer, starter med 4-9)');
      return;
    }

    console.log('✅ Validation passed, calling mutation...');
    
    updateMutation.mutate({
      full_name: formData.full_name,
      birth_date: formData.birth_date,
      phone_number: cleanPhone,
      user_role: selectedRole  // Save as user_role (app-managed), not role (platform-managed)
    });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircle className="w-10 h-10 text-blue-600" />
          </div>
          <CardTitle className="text-center">Fullfør registrering</CardTitle>
          <CardDescription className="text-center">
            Fyll ut informasjonen for å komme i gang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Fullt navn *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Ola Nordmann"
                required
              />
            </div>

            <div>
              <Label>Fødselsdato *</Label>
              <Input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Telefonnummer *</Label>
              <Input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                placeholder="90012345"
                required
              />
              <p className="text-xs text-slate-500 mt-1">8 siffer (norsk nummer)</p>
            </div>

            <div className="space-y-3 pt-2">
              <Label>Velg din rolle *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('landlord')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedRole === 'landlord' 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Building2 className="w-8 h-8 text-blue-600" />
                    <span className="font-medium text-sm">Utleier</span>
                    {selectedRole === 'landlord' && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('tenant')}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedRole === 'tenant' 
                      ? 'border-blue-600 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Home className="w-8 h-8 text-blue-600" />
                    <span className="font-medium text-sm">Leietaker</span>
                    {selectedRole === 'tenant' && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {user?.role_locked 
                  ? 'Rollen din er låst og kan ikke endres.' 
                  : 'Rollen kan ikke endres etter at du har fullført registreringen.'}
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 mt-6"
              disabled={updateMutation.isPending || !formData.full_name || !formData.birth_date || !formData.phone_number || !selectedRole || user?.role_locked}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Lagrer...
                </>
              ) : (
                'Fullfør registrering'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}