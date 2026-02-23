import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Globe, LogOut, Bell, Shield, RefreshCw, AlertTriangle, Save, ChevronRight, Camera, HelpCircle, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/components/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  React.useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhone(user.phone_number || user.phone || '');
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    }
  });

  const handleProfileSave = () => updateMutation.mutate({ first_name: firstName, last_name: lastName, phone_number: phone });
  const handleLanguageToggle = () => { const newLang = language === 'no' ? 'en' : 'no'; setLanguage(newLang); updateMutation.mutate({ language: newLang }); };
  const handleNotificationToggle = (key) => updateMutation.mutate({ [key]: !user?.[key] });

  const handleHardReset = async () => {
    try { localStorage.clear(); sessionStorage.clear(); if ('caches' in window) { const names = await caches.keys(); await Promise.all(names.map(n => caches.delete(n))); } } catch (e) {}
    window.location.reload();
  };

  const handleLogout = () => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} base44.auth.logout(); };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ avatar_url: file_url });
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    setAvatarUploading(false);
  };

  return (
    <div className="pb-20 p-4 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> {t('profileInformation')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-3 pb-2">
            <div className="relative">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-blue-200" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                  <User className="w-9 h-9 text-blue-400" />
                </div>
              )}
              <label className="absolute bottom-0 right-0 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-blue-700">
                <Camera className="w-3.5 h-3.5 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
              </label>
            </div>
            <p className="text-xs text-slate-500">{avatarUploading ? t('uploading') : t('tapToChangeImage')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="firstName">{t('firstName')}</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ola" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">{t('lastName')}</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nordmann" />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">{t('phoneNumber')}</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+47 900 00 000" />
          </div>

          <div className="pt-1 border-t space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{t('email')}</span>
              <span className="text-sm font-medium text-slate-700">{user?.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{t('role')}</span>
              <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('RoleSelection'))} className="text-blue-600 h-7 px-2">
                {(user?.active_role || user?.user_role) === 'landlord' ? t('landlord') : t('tenant')}
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>

          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleProfileSave} disabled={updateMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {profileSaved ? t('saved') : t('saveProfile')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" /> {t('notificationSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: 'notify_calendar', label: t('calendar'), desc: t('calendarNotifications') },
            { key: 'notify_payments', label: t('payments'), desc: t('paymentReminders') },
            { key: 'notify_messages', label: t('messages'), desc: t('newMessages') },
            { key: 'notify_maintenance', label: t('maintenance'), desc: t('maintenanceUpdates') },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <div><Label>{label}</Label><p className="text-xs text-slate-500">{desc}</p></div>
              <Switch checked={user?.[key] !== false} onCheckedChange={() => handleNotificationToggle(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> {t('language')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>English</Label>
              <p className="text-sm text-slate-500">{language === 'en' ? t('currentlyActive') : t('switchToEnglish')}</p>
            </div>
            <Switch checked={language === 'en'} onCheckedChange={handleLanguageToggle} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> {t('privacy')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-1">
            <div>
              <span className="text-sm text-slate-600">{t('dataProcessingConsent')}</span>
              <p className="text-xs text-slate-500">{t('gdprConsentDescription')}</p>
            </div>
            {user?.gdpr_consent ? (
              <span className="text-green-600 text-sm">{t('approved')}</span>
            ) : (
              <Button size="sm" onClick={() => updateMutation.mutate({ gdpr_consent: true, gdpr_consent_date: new Date().toISOString() })}>{t('approve')}</Button>
            )}
          </div>
          {user?.gdpr_consent_date && (
            <p className="text-xs text-slate-400 mt-1">{t('approvedOn')} {new Date(user.gdpr_consent_date).toLocaleDateString()}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4" /> {t('contactSupport')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-3">{t('supportDescription')}</p>
          <a href="mailto:support@enkelutleie.com">
            <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50">
              <Mail className="w-4 h-4 mr-2" /> support@enkelutleie.com
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {t('troubleshooting')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-3">{t('troubleshootingDescription')}</p>
          <Button variant="outline" className="w-full" onClick={handleHardReset}>
            <RefreshCw className="w-4 h-4 mr-2" /> {t('hardReset')}
          </Button>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => navigate(createPageUrl('Help'))}>
        <HelpCircle className="w-4 h-4 mr-2" /> {t('helpAndTaxGuide')}
      </Button>

      <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={handleLogout}>
        <LogOut className="w-4 h-4 mr-2" /> {t('logout')}
      </Button>
    </div>
  );
}