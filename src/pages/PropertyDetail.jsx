import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Building2, Edit2, UserPlus, Mail, FileText,
  Camera, Trash2, Users, MessageSquare, Wallet, ChevronRight, Plus, Upload, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import { createPageUrl } from '@/utils';
import FinancesSection from '@/components/property/FinancesSection';



export default function PropertyDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
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
    const inviteUrl = `${window.location.origin}/Invite?token=${token}`;
    await base44.integrations.Core.SendEmail({
      to: inviteEmail,
      subject: `Du er invitert til ${property?.name} – Enkel Utleie`,
      body: `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:36px 32px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:16px;padding:12px 16px;margin-bottom:16px;">
              <span style="font-size:28px;">🏠</span>
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Enkel Utleie</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Din digitale utleiehjelper</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;font-weight:700;">Du har fått en invitasjon! 🎉</h2>
            <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
              Du er invitert til å få tilgang til din leiebolig i Enkel Utleie:
            </p>
            <!-- Property card -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <span style="font-size:22px;">🏡</span>
                <div>
                  <p style="margin:0;font-weight:700;color:#1e293b;font-size:15px;">${property?.name || 'Din leiebolig'}</p>
                  ${property?.address ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px;">📍 ${property.address}</p>` : ''}
                </div>
              </div>
            </div>
            <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
              Gjennom Enkel Utleie kan du enkelt kommunisere med utleier, se leiekontrakt, holde oversikt over betalinger og mye mer.
            </p>
            <!-- CTA Button -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${inviteUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:15px 36px;border-radius:12px;letter-spacing:0.1px;">
                Aksepter invitasjon →
              </a>
            </div>
            <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
              Invitasjonen er gyldig i 7 dager. Har du spørsmål? Kontakt din utleier direkte.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} Enkel Utleie · Denne e-posten ble sendt av din utleier</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
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

  const handleUploadAgreement = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Kun PDF-filer støttes'); return; }
    setUploadingPdf(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    updateMutation.mutate({ uploaded_agreement_url: file_url, uploaded_agreement_date: new Date().toISOString() });
    setUploadingPdf(false);
  };

  const handleMoveOutPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPhotoUploading(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    updateMutation.mutate({ move_out_photos: [...(property.move_out_photos || []), ...urls] });
    setPhotoUploading(false);
  };

  const handleDelete = () => {
    if (window.confirm('Slette denne eiendommen? Kan ikke angres.')) deleteMutation.mutate();
  };

  const exportAgreementPdf = () => {
    if (!agreement) return;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const colW = pageW - margin * 2;
    let y = 20;

    const addText = (text, size = 10, bold = false, color = [30, 30, 30]) => {
      doc.setFontSize(size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setTextColor(...color);
      const lines = doc.splitTextToSize(String(text || ''), colW);
      lines.forEach(line => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += size * 0.45;
      });
      y += 2;
    };

    addText('LEIEAVTALE', 20, true, [30, 64, 175]);
    if (property?.name) addText(property.name, 11, false, [100, 100, 100]);
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    const fieldPairs = [
      ['Utleier', agreement.landlord_name],
      ['Utleiers adresse', agreement.landlord_address],
      ['Leietaker', agreement.tenant_name],
      ['Adresse', property?.address],
      ['Startdato', agreement.start_date],
      agreement.end_date && ['Sluttdato', agreement.end_date],
      ['Månedlig leie', `${agreement.monthly_rent?.toLocaleString()} kr`],
      agreement.deposit && ['Depositum', `${agreement.deposit?.toLocaleString()} kr`],
      agreement.rent_due_day && ['Forfallsdag', `${agreement.rent_due_day}. i måneden`],
      agreement.rent_account && ['Kontonr. for leie', agreement.rent_account],
      agreement.deposit_account && ['Kontonr. for depositum', agreement.deposit_account],
      ['Oppsigelsestid', `${agreement.notice_period_months} måneder`],
      ['Kjæledyr', agreement.pets_allowed ? 'Tillatt' : 'Ikke tillatt'],
      ['Røyking', agreement.smoking_allowed ? 'Tillatt' : 'Ikke tillatt'],
      ['Strøm/vann', agreement.utilities_included ? 'Inkludert' : 'Ikke inkludert'],
    ].filter(Boolean);

    fieldPairs.forEach(([label, value]) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(label + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 30, 30);
      doc.text(String(value || ''), margin + 55, y);
      y += 6;
    });

    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    if (agreement.terms) {
      addText('VILKÅR OG BETINGELSER', 11, true);
      addText(agreement.terms, 8.5);
      y += 4;
    }

    if (y > 200) { doc.addPage(); y = 20; }
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
    addText('SIGNATURER', 11, true);
    y += 4;

    const halfW = (pageW - margin * 2) / 2;
    const sigImgH = 20;
    const sigImgW = 60;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Utleier', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(agreement.landlord_name || '', margin, y + 5);
    if (agreement.landlord_signature_image) {
      doc.addImage(agreement.landlord_signature_image, 'PNG', margin, y + 8, sigImgW, sigImgH);
    }
    doc.setDrawColor(150, 150, 150);
    doc.line(margin, y + 30, margin + 70, y + 30);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    if (agreement.landlord_signed && agreement.landlord_signed_date) {
      doc.text('Signert ' + new Date(agreement.landlord_signed_date).toLocaleDateString('nb-NO'), margin, y + 35);
    } else {
      doc.text('Ikke signert', margin, y + 35);
    }

    const col2 = margin + halfW + 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Leietaker', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(agreement.tenant_name || '', col2, y + 5);
    if (agreement.tenant_signature_image) {
      doc.addImage(agreement.tenant_signature_image, 'PNG', col2, y + 8, sigImgW, sigImgH);
    }
    doc.setDrawColor(150, 150, 150);
    doc.line(col2, y + 30, col2 + 70, y + 30);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    if (agreement.tenant_signed && agreement.tenant_signed_date) {
      doc.text('Signert ' + new Date(agreement.tenant_signed_date).toLocaleDateString('nb-NO'), col2, y + 35);
    } else {
      doc.text('Ikke signert', col2, y + 35);
    }

    doc.save(`leieavtale-${property?.name || 'avtale'}.pdf`);
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
                  <button onClick={exportAgreementPdf} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 text-sm font-medium transition-colors">
                    <Download className="w-4 h-4" /> PDF
                  </button>
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

        {/* ── SLETT ── */}
        <button onClick={handleDelete} className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-red-100 text-red-600 hover:bg-red-50 transition-colors mb-4">
          <Trash2 className="w-4 h-4" />
          <span className="text-sm font-medium">Slett eiendom</span>
        </button>
      </div>
    </div>
  );
}