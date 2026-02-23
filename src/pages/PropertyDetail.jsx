import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Building2, Edit2, UserPlus, Mail, FileText, Camera,
  Trash2, Bell, Users, MapPin, Home, MessageSquare, ChevronRight, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';
import MaintenanceLog from '@/components/MaintenanceLog';
import PropertyFinances from '@/components/PropertyFinances';
import DocumentationChecklist from '@/components/DocumentationChecklist';
import ManualTenantForm from '@/components/ManualTenantForm';
import SharedHousingRooms from '@/components/SharedHousingRooms';
import AgreementUpload from '@/components/AgreementUpload';

export default function PropertyDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showManualTenantForm, setShowManualTenantForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [photoUploading, setPhotoUploading] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.RentalUnit.filter({ id: propertyId }),
    select: (data) => data[0],
    enabled: !!propertyId
  });

  const { data: agreement } = useQuery({
    queryKey: ['agreement', propertyId],
    queryFn: () => base44.entities.RentalAgreement.filter({ rental_unit_id: propertyId }),
    select: (data) => data?.filter(a => a.status !== 'terminated' && a.status !== 'expired')[0],
    enabled: !!propertyId
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.RentalUnit.update(propertyId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.RentalUnit.delete(propertyId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rentalUnits'] }); navigate(createPageUrl('Properties')); }
  });

  const handleInviteTenant = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      const token = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await base44.entities.TenantInvitation.create({ rental_unit_id: propertyId, landlord_id: user.id, tenant_email: inviteEmail.toLowerCase(), token, status: 'pending', expires_at: expiresAt });
      await updateMutation.mutateAsync({ tenant_email: inviteEmail.toLowerCase(), status: 'pending_invitation' });
      await base44.integrations.Core.SendEmail({ to: inviteEmail, subject: 'Du er invitert til Enkel Utleie', body: `Du er invitert til å se din leiebolig i Enkel Utleie-appen.\n\nTrykk her for å akseptere: ${window.location.origin}/Invite?token=${token}\n\nInvitasjonen utløper om 7 dager.` });
      setInviteEmail('');
      setShowInviteForm(false);
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
    } catch (err) {
      alert('Kunne ikke sende invitasjon: ' + err.message);
    }
    setInviteLoading(false);
  };

  const handlePhotoUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPhotoUploading(true);
    const urls = await Promise.all(files.map(file => base44.integrations.Core.UploadFile({ file }).then(r => r.file_url)));
    const existing = type === 'move_in' ? (property.move_in_photos || []) : (property.move_out_photos || []);
    await updateMutation.mutateAsync({ [type === 'move_in' ? 'move_in_photos' : 'move_out_photos']: [...existing, ...urls] });
    setPhotoUploading(false);
  };

  const handleDeleteProperty = () => {
    if (window.confirm('Er du sikker på at du vil slette denne eiendommen? Dette kan ikke angres.')) {
      deleteMutation.mutate();
    }
  };

  if (isLoading || !property) return <div className="p-4 text-center">Laster...</div>;

  const statusColors = { vacant: 'bg-green-100 text-green-700', occupied: 'bg-blue-100 text-blue-700', pending_invitation: 'bg-yellow-100 text-yellow-700' };
  const tabs = ['overview', 'finances', 'maintenance', 'docs'];
  const tabLabels = { overview: 'Oversikt', finances: 'Økonomi', maintenance: 'Vedlikehold', docs: 'Dokumenter' };

  return (
    <div className="pb-24 min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-blue-600 text-white px-4 py-3 shadow-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-blue-500" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base truncate">{property.name}</h1>
            <p className="text-blue-200 text-xs truncate">{property.address}</p>
          </div>
          <Badge className={`${statusColors[property.status]} border-0 text-xs flex-shrink-0`}>{t(property.status)}</Badge>
          <Link to={createPageUrl(`EditProperty?id=${propertyId}`)}>
            <Button variant="ghost" size="icon" className="text-white hover:bg-blue-500"><Edit2 className="w-4 h-4" /></Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-[60px] z-30">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button key={tab} className={`flex-1 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`} onClick={() => setActiveTab(tab)}>
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Property Info */}
            <Card>
              <CardContent className="p-4 space-y-3">
                {property.monthly_rent && (
                  <div className="flex justify-between"><span className="text-slate-500 text-sm">Månedlig leie</span><span className="font-semibold">{property.monthly_rent.toLocaleString()} kr</span></div>
                )}
                {property.size_sqm && <div className="flex justify-between"><span className="text-slate-500 text-sm">Størrelse</span><span className="font-medium">{property.size_sqm} m²</span></div>}
                {property.bedrooms && <div className="flex justify-between"><span className="text-slate-500 text-sm">Soverom</span><span className="font-medium">{property.bedrooms}</span></div>}
                {property.property_type && <div className="flex justify-between"><span className="text-slate-500 text-sm">Type</span><span className="font-medium">{property.property_type}</span></div>}
              </CardContent>
            </Card>

            {/* Shared Housing */}
            {property.is_shared_housing && (
              <SharedHousingRooms property={property} onUpdate={(data) => updateMutation.mutate(data)} isLoading={updateMutation.isPending} />
            )}

            {/* Tenant Section */}
            {!property.is_shared_housing && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Leietaker</CardTitle>
                    {property.status !== 'occupied' && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowManualTenantForm(true)}>
                          <Home className="w-3 h-3 mr-1" /> Manuell
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => setShowInviteForm(!showInviteForm)}>
                          <UserPlus className="w-3 h-3 mr-1" /> Inviter
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {showInviteForm && (
                    <form onSubmit={handleInviteTenant} className="flex gap-2 mb-3">
                      <input className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="leietaker@epost.no" required />
                      <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700" disabled={inviteLoading}>
                        {inviteLoading ? '...' : <Mail className="w-4 h-4" />}
                      </Button>
                    </form>
                  )}
                  {property.status === 'occupied' && (property.tenant_email || property.manual_tenant_name) ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{property.manual_tenant_name || property.tenant_email}</p>
                          {property.manual_tenant_phone && <p className="text-xs text-slate-500">{property.manual_tenant_phone}</p>}
                        </div>
                        <Button size="sm" variant="ghost" className="text-xs text-blue-600" onClick={() => setShowManualTenantForm(true)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <Link to={createPageUrl(`Chat?propertyId=${propertyId}`)}>
                        <Button variant="outline" className="w-full text-sm"><MessageSquare className="w-4 h-4 mr-2" /> Send melding</Button>
                      </Link>
                    </div>
                  ) : property.status === 'pending_invitation' ? (
                    <p className="text-sm text-amber-600">Invitasjon sendt til {property.tenant_email} – venter på aksept</p>
                  ) : (
                    <p className="text-sm text-slate-500">Ingen leietaker ennå</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Agreement */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Leieavtale</CardTitle>
                  {!agreement?.uploaded_agreement_url && (
                    <Link to={createPageUrl(`CreateAgreement?propertyId=${propertyId}${agreement?.id ? `&agreementId=${agreement.id}` : ''}`)}>
                      <Button size="sm" variant="outline" className="text-xs">
                        {agreement ? 'Rediger' : 'Opprett'}
                      </Button>
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {agreement ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Status</span>
                      <Badge className={agreement.status === 'active' ? 'bg-green-100 text-green-700' : agreement.status === 'pending_tenant' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}>
                        {agreement.status === 'active' ? 'Aktiv' : agreement.status === 'pending_tenant' ? 'Venter på leietaker' : 'Utkast'}
                      </Badge>
                    </div>
                    {agreement.start_date && <div className="flex justify-between"><span className="text-slate-500">Fra</span><span>{agreement.start_date}</span></div>}
                    {agreement.monthly_rent && <div className="flex justify-between"><span className="text-slate-500">Leie</span><span className="font-medium">{agreement.monthly_rent.toLocaleString()} kr/mnd</span></div>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Ingen leieavtale opprettet</p>
                )}
                <AgreementUpload property={property} onUpdate={(data) => updateMutation.mutate(data)} isLoading={updateMutation.isPending} />
              </CardContent>
            </Card>

            {/* Photos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Camera className="w-4 h-4" /> Bilder og dokumentasjon</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Innflyttingsbilder ({(property.move_in_photos || []).length})</p>
                    <label className="block">
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'move_in')} disabled={photoUploading} />
                      <Button variant="outline" size="sm" className="w-full text-xs" asChild disabled={photoUploading}>
                        <span><Upload className="w-3 h-3 mr-1" /> Last opp</span>
                      </Button>
                    </label>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Utflyttingsbilder ({(property.move_out_photos || []).length})</p>
                    <label className="block">
                      <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, 'move_out')} disabled={photoUploading} />
                      <Button variant="outline" size="sm" className="w-full text-xs" asChild disabled={photoUploading}>
                        <span><Upload className="w-3 h-3 mr-1" /> Last opp</span>
                      </Button>
                    </label>
                  </div>
                </div>
                {(property.move_in_photos?.length > 0 || property.move_out_photos?.length > 0) && (
                  <div className="flex gap-2 flex-wrap">
                    {[...(property.move_in_photos || []), ...(property.move_out_photos || [])].slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt="" className="w-16 h-16 object-cover rounded-lg" />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid grid-cols-2 gap-3">
              <Link to={createPageUrl(`PaymentReminders`)}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-3 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-medium">Påminnelser</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to={createPageUrl(`Chat?propertyId=${propertyId}`)}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-3 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-medium">Chat</p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardContent className="p-4">
                <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={handleDeleteProperty} disabled={deleteMutation.isPending}>
                  <Trash2 className="w-4 h-4 mr-2" /> Slett eiendom
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* FINANCES TAB */}
        {activeTab === 'finances' && (
          <PropertyFinances propertyId={propertyId} landlordId={user?.id} property={property} />
        )}

        {/* MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <MaintenanceLog propertyId={propertyId} landlordId={user?.id} />
        )}

        {/* DOCS TAB */}
        {activeTab === 'docs' && (
          <DocumentationChecklist property={property} onUpdate={(data) => updateMutation.mutate(data)} isLoading={updateMutation.isPending} />
        )}
      </div>

      <ManualTenantForm
        open={showManualTenantForm}
        onOpenChange={setShowManualTenantForm}
        property={property}
        onSave={async (data) => { await updateMutation.mutateAsync(data); setShowManualTenantForm(false); }}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}