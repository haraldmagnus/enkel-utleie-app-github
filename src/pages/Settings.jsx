import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, Globe, LogOut, Bell, Palette, Shield, Trash2, 
  ChevronRight, RefreshCw, Phone, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter, DialogDescription 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, setLanguage, t } = useLanguage();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phone, setPhone] = useState('');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  });

  const handleLanguageToggle = () => {
    const newLang = language === 'no' ? 'en' : 'no';
    setLanguage(newLang);
    updateMutation.mutate({ language: newLang });
  };

  const handleThemeChange = (theme) => {
    updateMutation.mutate({ theme });
  };

  const handleNotificationToggle = (key) => {
    updateMutation.mutate({ [key]: !user?.[key] });
  };

  const handlePhoneSave = () => {
    updateMutation.mutate({ phone });
    setEditingPhone(false);
  };

  const handleLogout = async () => {
    try {
      // Clear user role before logout
      await base44.auth.updateMe({ user_role: null });
    } catch (e) {
      console.log('Could not clear role:', e);
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    } catch (e) {
      console.log('Clear error:', e);
    }
    base44.auth.logout();
  };

  const handleHardReset = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      window.location.reload();
    } catch (e) {
      window.location.reload();
    }
  };

  const handleDeleteAccount = async () => {
    // In a real app, this would delete user data
    // For now, just log out
    handleLogout();
  };

  const handleGDPRConsent = () => {
    updateMutation.mutate({ 
      gdpr_consent: true, 
      gdpr_consent_date: new Date().toISOString() 
    });
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
              <span className="text-slate-600">Telefon</span>
              {editingPhone ? (
                <div className="flex gap-2">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="12345678"
                    className="w-32 h-8"
                  />
                  <Button size="sm" onClick={handlePhoneSave}>Lagre</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-medium">{user?.phone || '-'}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setPhone(user?.phone || '');
                      setEditingPhone(true);
                    }}
                  >
                    Endre
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-slate-600">Rolle</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate(createPageUrl('RoleSelection'))}
              >
                {user?.user_role === 'landlord' ? t('landlord') : t('tenant')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4" /> Utseende
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Label>Fargetema</Label>
              <Select 
                value={user?.theme || 'blue'} 
                onValueChange={handleThemeChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-600" />
                      Blå
                    </div>
                  </SelectItem>
                  <SelectItem value="pink">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-pink-600" />
                      Rosa
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-4 h-4" /> Varsler
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Kalender</Label>
                <p className="text-xs text-slate-500">Varsler for hendelser</p>
              </div>
              <Switch
                checked={user?.notify_calendar !== false}
                onCheckedChange={() => handleNotificationToggle('notify_calendar')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Betalinger</Label>
                <p className="text-xs text-slate-500">Påminnelser om leie</p>
              </div>
              <Switch
                checked={user?.notify_payments !== false}
                onCheckedChange={() => handleNotificationToggle('notify_payments')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Meldinger</Label>
                <p className="text-xs text-slate-500">Nye meldinger fra leietaker/utleier</p>
              </div>
              <Switch
                checked={user?.notify_messages !== false}
                onCheckedChange={() => handleNotificationToggle('notify_messages')}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Vedlikehold</Label>
                <p className="text-xs text-slate-500">Oppdateringer på oppgaver</p>
              </div>
              <Switch
                checked={user?.notify_maintenance !== false}
                onCheckedChange={() => handleNotificationToggle('notify_maintenance')}
              />
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

        {/* Privacy / GDPR */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-4 h-4" /> Personvern
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-slate-600">Samtykke til databehandling</span>
                <p className="text-xs text-slate-500">GDPR-samtykke for lagring av data</p>
              </div>
              {user?.gdpr_consent ? (
                <span className="text-green-600 text-sm">✓ Godkjent</span>
              ) : (
                <Button size="sm" onClick={handleGDPRConsent}>
                  Godkjenn
                </Button>
              )}
            </div>
            {user?.gdpr_consent_date && (
              <p className="text-xs text-slate-500">
                Godkjent: {new Date(user.gdpr_consent_date).toLocaleDateString('no')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Feilsøking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-3">
              Hvis appen ikke fungerer som forventet, prøv å tilbakestille.
            </p>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleHardReset}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Hard tilbakestilling
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account */}
        <Card className="border-red-200">
          <CardContent className="p-4">
            <Button 
              variant="outline" 
              className="w-full text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Slett konto og data
            </Button>
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

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slett konto?</DialogTitle>
            <DialogDescription>
              Dette vil slette all din data permanent, inkludert eiendommer, avtaler og meldinger. 
              Denne handlingen kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Slett konto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}