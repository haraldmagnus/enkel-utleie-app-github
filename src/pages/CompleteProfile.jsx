import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({ full_name: '', birth_date: '', phone_number: '' });

  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  React.useEffect(() => {
    if (user) setFormData({ full_name: user.full_name || '', birth_date: user.birth_date || '', phone_number: user.phone_number || '' });
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      try { await base44.auth.updateMe(data); } catch (e) { localStorage.setItem('tenant_profile_complete', 'true'); }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      const roleOverride = localStorage.getItem('user_role_override');
      const effectiveRole = user?.active_role || user?.user_role || roleOverride;
      navigate(createPageUrl(effectiveRole === 'landlord' ? 'Dashboard' : 'TenantDashboard'), { replace: true });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const phoneRegex = /^(\+47)?[4|9]\d{7}$/;
    if (!phoneRegex.test(formData.phone_number.replace(/\s/g, ''))) { alert('Vennligst oppgi et gyldig norsk telefonnummer (8 siffer)'); return; }
    updateMutation.mutate(formData);
  };

  if (userLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-blue-50 to-white">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"><UserCircle className="w-10 h-10 text-blue-600" /></div>
          <CardTitle className="text-center">Fullfør din profil</CardTitle>
          <CardDescription className="text-center">Vi trenger litt mer informasjon for å fullføre tilknytningen til boligen</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Fullt navn *</Label><Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Ola Nordmann" required /></div>
            <div><Label>Fødselsdato *</Label><Input type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} required /></div>
            <div><Label>Telefonnummer *</Label><Input type="tel" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} placeholder="12345678" required /><p className="text-xs text-slate-500 mt-1">8 siffer (norsk nummer)</p></div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={updateMutation.isPending || !formData.full_name || !formData.birth_date || !formData.phone_number}>
              {updateMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Lagrer...</> : 'Fullfør og fortsett'}
            </Button>
            <p className="text-xs text-center text-slate-500">Denne informasjonen brukes i leieavtaler og for kommunikasjon med utleier</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}