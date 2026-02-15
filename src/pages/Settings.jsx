import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Globe, LogOut, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/components/LanguageContext';

export default function Settings() {
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useLanguage();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateLanguageMutation = useMutation({
    mutationFn: (lang) => base44.auth.updateMe({ language: lang }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

  const handleLanguageToggle = () => {
    const newLang = language === 'no' ? 'en' : 'no';
    setLanguage(newLang);
    updateLanguageMutation.mutate(newLang);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="pb-20">
      <div className="bg-white border-b px-4 py-4">
        <h1 className="text-xl font-bold text-slate-900">{t('settings')}</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Profile */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" /> Profil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-600">Navn</span>
              <span className="font-medium">{user?.full_name}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-slate-600">E-post</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-slate-600">Rolle</span>
              <span className="font-medium capitalize">
                {user?.user_role === 'landlord' ? t('landlord') : t('tenant')}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="w-4 h-4" /> Språk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>English</Label>
                <p className="text-sm text-slate-500">
                  {language === 'en' ? 'Currently active' : 'Bytt til engelsk'}
                </p>
              </div>
              <Switch
                checked={language === 'en'}
                onCheckedChange={handleLanguageToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logg ut
        </Button>
      </div>
    </div>
  );
}