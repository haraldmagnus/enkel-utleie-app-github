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
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      console.log('🔵 CompleteProfile: Saving basic profile data:', {
        userId: user?.id,
        email: user?.email,
        payload: data
      });
      
      try {
        const updatePayload = {
          full_name: data.full_name,
          birth_date: data.birth_date,
          phone_number: data.phone_number
        };
        
        const response = await base44.auth.updateMe(updatePayload);
        console.log('✅ CompleteProfile: Save successful');
        return response;
      } catch (error) {
        console.error('❌ CompleteProfile: Save failed:', error);
        throw error;
      }
    },
    onSuccess: async () => {
      console.log('✅ CompleteProfile: Profile saved, navigating to role selection');
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      navigate(createPageUrl('RoleSelection'), { replace: true });
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
    
    // Validate phone number (Norwegian format - 8 digits starting with 4-9)
    const cleanPhone = formData.phone_number.replace(/\s/g, '');
    const phoneRegex = /^[4-9]\d{7}$/;
    
    if (!phoneRegex.test(cleanPhone)) {
      alert('Vennligst oppgi et gyldig norsk telefonnummer (8 siffer, starter med 4-9)');
      return;
    }
    
    updateMutation.mutate({
      full_name: formData.full_name,
      birth_date: formData.birth_date,
      phone_number: cleanPhone
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

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 mt-6"
              disabled={updateMutation.isPending || !formData.full_name || !formData.birth_date || !formData.phone_number}
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