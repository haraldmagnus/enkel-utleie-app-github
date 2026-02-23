import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Building2, Edit2, UserPlus, Mail, FileText,
  Camera, Trash2, Users, MessageSquare, Wrench, Wallet, ChevronRight, Plus
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import MaintenanceSection from '@/components/property/MaintenanceSection';
import FinancesSection from '@/components/property/FinancesSection';
import DocsSection from '@/components/property/DocsSection';



export default function PropertyDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editingFinn, setEditingFinn] = useState(false);
  const [finnCode, setFinnCode] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.RentalUnit.filter({ id: propertyId }).then(r => r[0]),
    enabled: !!propertyId
  });

  const { data: agreement } = useQuery({
    queryKey: ['agreement', propertyId],
    queryFn: () => base44.entities.RentalAgreement.filter({ rental_unit_id: propertyId })
      .then(r => r.filter(a => !['terminated','expired'].includes(a.status))[0]),
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

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    const token = `${Date.now()}-${Math.random().toString(36).substr(2,9)}`;
    await base44.entities.TenantInvitation.create({
      rental_unit_id: propertyId, landlord_id: user.id,
      tenant_email: inviteEmail.toLowerCase(), token, status: 'pending',
      expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString()
    });
    await updateMutation.mutateAsync({ tenant_email: inviteEmail.toLowerCase(), status: 'pending_invitation' });
    await base44.integrations.Core.SendEmail({
      to: inviteEmail,
      subject: 'Invitasjon til Enkel Utleie',
      body: `Hei!\n\nDu er invitert til å se din leiebolig (${property?.name}) i Enkel Utleie.\n\nAksepter her: ${window.location.origin}/Invite?token=${token}\n\nInvitasjonen utløper om 7 dager.`
    });
    setInviteEmail('');
    setShowInviteForm(false);
    setInviteLoading(false);
    queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
  };

  const handlePhotoUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPhotoUploading(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    const key = type === 'move_in' ? 'move_in_photos' : 'move_out_photos';
    await updateMutation.mutateAsync({ [key]: [...(property[key] || []), ...urls] });
    setPhotoUploading(false);
  };

  const handleDelete = () => {
    if (window.confirm('Slette denne eiendommen? Kan ikke angres.')) deleteMutation.mutate();
  };

  if (isLoading || !property) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><Building2 className="w-10 h-10 text-gray-200 mx-auto mb-2 animate-pulse" /><p className="text-gray-400">Laster...</p></div>
    </div>
  );

  const statusLabel = { occupied: 'Utleid', vacant: 'Ledig', pending_invitation: 'Invitert' };
  const statusStyle = { occupied: 'bg-blue-100 text-blue-700', vacant: 'bg-green-100 text-green-700', pending_invitation: 'bg-yellow-100 text-yellow-700' };

  const saveFinnCode = () => {
    updateMutation.mutate({ finn_code: finnCode });
    setEditingFinn(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Blue Header */}
      <div className="sticky top-0 z-40 bg-blue-600 shadow-md">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center hover:bg-blue-400 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white truncate">{property.name}</h1>
            <p className="text-xs text-blue-200 truncate">{property.address}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${statusStyle[property.status]}`}>
            {statusLabel[property.status] || property.status}
          </span>
          <Link to={createPageUrl(`EditProperty?id=${propertyId}`)}>
            <button className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center hover:bg-blue-400 transition-colors">
              <Edit2 className="w-4 h-4 text-white" />
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">

        {/* ── OVERSIKT ── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Oversikt</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            {[
              property.monthly_rent && { label: 'Månedlig leie', value: `${property.monthly_rent.toLocaleString()} kr` },
              property.property_type && { label: 'Type', value: property.property_type },
              property.size_sqm && { label: 'Størrelse', value: `${property.size_sqm} m²` },
              property.bedrooms && { label: 'Soverom', value: property.bedrooms },
              property.floor && { label: 'Etasje', value: property.floor },
            ].filter(Boolean).map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
            {property.description && (
              <p className="text-sm text-gray-500 pt-2 border-t border-gray-50">{property.description}</p>
            )}

            {/* Finn.no kode */}
            <div className="pt-2 border-t border-gray-50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Finn.no kode</span>
                <button onClick={() => { setEditingFinn(!editingFinn); setFinnCode(property.finn_code || ''); }} className="text-xs text-blue-600 font-medium hover:underline">
                  {editingFinn ? 'Avbryt' : property.finn_code ? 'Endre' : 'Legg til'}
                </button>
              </div>
              {editingFinn ? (
                <div className="flex gap-2">
                  <input
                    value={finnCode}
                    onChange={e => setFinnCode(e.target.value)}
                    placeholder="F.eks. 123456789"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={saveFinnCode} className="bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">Lagre</button>
                </div>
              ) : property.finn_code ? (
                <a href={`https://www.finn.no/realestate/lettings/ad.html?finnkode=${property.finn_code}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-600 hover:underline">
                  {property.finn_code} ↗
                </a>
              ) : (
                <p className="text-sm text-gray-400">Ikke registrert</p>
              )}
            </div>
          </div>
        </section>

        {/* ── LEIEAVTALE (samlet) ── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Leieavtale</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Digital agreement */}
            <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-purple-500" /> Digital leieavtale</h3>
            </div>
            {agreement ? (
              <div className="p-4 space-y-3">
                <div className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium ${agreement.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${agreement.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  {agreement.status === 'active' ? 'Aktiv og signert' : agreement.status === 'pending_tenant' ? 'Venter på leietakers signatur' : agreement.status === 'draft' ? 'Utkast' : agreement.status}
                </div>
                <p className="text-sm text-gray-600">Periode: {agreement.start_date} → {agreement.end_date || 'løpende'}</p>
                <p className="text-sm text-gray-600">Leie: {agreement.monthly_rent?.toLocaleString()} kr/mnd</p>
                <div className="flex gap-2">
                  <Link to={createPageUrl(`CreateAgreement?propertyId=${propertyId}&agreementId=${agreement.id}`)} className="flex-1 text-center bg-blue-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
                    Rediger
                  </Link>
                  {agreement.status !== 'active' && (
                    <Link to={createPageUrl(`SignAgreement?id=${agreement.id}`)} className="flex-1 text-center bg-green-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-green-700 transition-colors">
                      Signer
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-gray-400 text-sm mb-3">Ingen digital leieavtale opprettet</p>
                <Link to={createPageUrl(`CreateAgreement?propertyId=${propertyId}`)} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" /> Opprett leieavtale
                </Link>
              </div>
            )}

            {/* Uploaded PDF */}
            <div className="border-t border-gray-100">
              <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2"><Upload className="w-4 h-4 text-blue-500" /> Opplastet avtale (PDF)</h3>
                {!property.uploaded_agreement_url && (
                  <label className="flex items-center gap-1 text-blue-600 text-xs font-medium cursor-pointer hover:text-blue-700">
                    <Upload className="w-3.5 h-3.5" /> Last opp
                    <input type="file" accept="application/pdf" onChange={handleUploadAgreement} className="hidden" />
                  </label>
                )}
              </div>
              <div className="p-4">
                {uploadingPdf ? (
                  <div className="flex items-center gap-2 text-sm text-blue-600 animate-pulse"><Upload className="w-4 h-4" /> Laster opp...</div>
                ) : property.uploaded_agreement_url ? (
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Leieavtale.pdf</p>
                      {property.uploaded_agreement_date && <p className="text-xs text-gray-400">Lastet opp {new Date(property.uploaded_agreement_date).toLocaleDateString('no')}</p>}
                    </div>
                    <a href={property.uploaded_agreement_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors">
                      <Download className="w-4 h-4 text-blue-600" />
                    </a>
                    <button onClick={() => updateMutation.mutate({ uploaded_agreement_url: null, uploaded_agreement_date: null })} className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-1">
                    <p className="text-gray-400 text-sm mb-2">Ingen PDF lastet opp</p>
                    <label className="cursor-pointer inline-flex items-center gap-2 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors">
                      <Upload className="w-4 h-4" /> Velg PDF
                      <input type="file" accept="application/pdf" onChange={handleUploadAgreement} className="hidden" />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── LEIETAKER ── */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> Leietaker</h3>
              {property.status !== 'occupied' && (
                <button onClick={() => setShowInviteForm(!showInviteForm)} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors">
                  <UserPlus className="w-3 h-3" /> Inviter
                </button>
              )}
            </div>
            {showInviteForm && (
              <form onSubmit={handleInvite} className="p-4 bg-blue-50 border-b border-blue-100">
                <p className="text-sm font-medium text-blue-800 mb-2">Inviter leietaker via e-post</p>
                <div className="flex gap-2">
                  <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="epost@eksempel.no" required className="flex-1 px-3 py-2 border border-blue-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="submit" disabled={inviteLoading} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">{inviteLoading ? '...' : 'Send'}</button>
                </div>
              </form>
            )}
            <div className="p-4">
              {property.status === 'occupied' && (property.tenant_email || property.manual_tenant_name) ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{property.manual_tenant_name || property.tenant_email}</p>
                    {property.tenant_email && <p className="text-xs text-gray-400">{property.tenant_email}</p>}
                  </div>
                  <Link to={createPageUrl(`Chat?propertyId=${propertyId}`)} className="ml-auto w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </Link>
                </div>
              ) : property.status === 'pending_invitation' ? (
                <div className="flex items-center gap-3 text-yellow-700">
                  <Mail className="w-4 h-4" />
                  <p className="text-sm">Invitasjon sendt til {property.tenant_email}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-2">Ingen leietaker ennå</p>
              )}
            </div>
          </div>
        </section>

        {/* ── INNFLYTTINGSBILDER ── */}
        <section>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Camera className="w-4 h-4 text-green-500" /> Innflyttingsbilder</h3>
              <label className="flex items-center gap-1 text-blue-600 text-sm font-medium cursor-pointer">
                <Plus className="w-4 h-4" /> Legg til
                <input type="file" accept="image/*" multiple onChange={e => handlePhotoUpload(e, 'move_in')} className="hidden" />
              </label>
            </div>
            {(property.move_in_photos || []).length > 0 ? (
              <div className="p-3 grid grid-cols-4 gap-2">
                {property.move_in_photos.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 p-4 text-center">Ingen bilder ennå</p>
            )}
          </div>
        </section>

        {/* ── ØKONOMI ── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Økonomi</h2>
          <FinancesSection propertyId={propertyId} landlordId={user?.id} property={property} onUpdateProperty={(d) => updateMutation.mutate(d)} />
        </section>

        {/* ── DOKUMENTER (utflyttingsbilder) ── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Utflyttingsbilder</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Camera className="w-4 h-4 text-red-500" /> Utflyttingsbilder</h3>
              <label className="flex items-center gap-1 text-blue-600 text-sm font-medium cursor-pointer">
                <Plus className="w-4 h-4" /> Legg til
                <input type="file" accept="image/*" multiple onChange={handleMoveOutPhotoUpload} className="hidden" />
              </label>
            </div>
            {(property.move_out_photos || []).length > 0 ? (
              <div className="p-3 grid grid-cols-4 gap-2">
                {property.move_out_photos.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 p-4 text-center">Ingen bilder ennå</p>
            )}
          </div>
        </section>

        {/* ── VEDLIKEHOLD (nederst) ── */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Vedlikehold</h2>
          <MaintenanceSection propertyId={propertyId} landlordId={user?.id} property={property} />
        </section>

        {/* ── SLETT ── */}
        <button onClick={handleDelete} className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-red-100 text-red-600 hover:bg-red-50 transition-colors mb-4">
          <Trash2 className="w-4 h-4" />
          <span className="text-sm font-medium">Slett eiendom</span>
        </button>
      </div>
    </div>
  );
}