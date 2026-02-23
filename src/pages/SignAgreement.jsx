import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, Check, PenLine, Trash2, Download } from 'lucide-react';
import { createPageUrl } from '@/utils';
import jsPDF from 'jspdf';

export default function SignAgreement() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const agreementId = urlParams.get('id');

  const [confirmed, setConfirmed] = useState(false);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const lastPos = useRef(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: agreement } = useQuery({
    queryKey: ['sign-agreement', agreementId],
    queryFn: () => base44.entities.RentalAgreement.filter({ id: agreementId }).then(r => r[0]),
    enabled: !!agreementId
  });

  const { data: property } = useQuery({
    queryKey: ['property', agreement?.rental_unit_id],
    queryFn: () => base44.entities.RentalUnit.filter({ id: agreement?.rental_unit_id }).then(r => r[0]),
    enabled: !!agreement?.rental_unit_id
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const role = user?.active_role || user?.user_role;
      const isLandlord = role === 'landlord' || user?.id === agreement?.landlord_id;
      const now = new Date().toISOString();
      const updates = isLandlord
        ? { landlord_signed: true, landlord_signed_date: now }
        : { tenant_signed: true, tenant_signed_date: now };

      const updated = await base44.entities.RentalAgreement.update(agreementId, updates);
      const bothSigned = (isLandlord ? true : updated.landlord_signed) && (!isLandlord ? true : updated.tenant_signed);
      if (bothSigned) {
        await base44.entities.RentalAgreement.update(agreementId, { status: 'active' });
        if (property) await base44.entities.RentalUnit.update(property.id, { status: 'occupied' });
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sign-agreement', agreementId] });
      queryClient.invalidateQueries({ queryKey: ['agreement', agreement?.rental_unit_id] });
    }
  });

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setHasSigned(true);
  };

  const stopDraw = (e) => {
    e?.preventDefault();
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  if (!agreement) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Laster avtale...</p></div>;

  const role = user?.active_role || user?.user_role;
  const isLandlord = role === 'landlord' || user?.id === agreement?.landlord_id;
  const alreadySigned = isLandlord ? agreement.landlord_signed : agreement.tenant_signed;

  const fields = [
    { label: 'Utleier', value: agreement.landlord_name },
    { label: 'Leietaker', value: agreement.tenant_name },
    { label: 'Bolig', value: property?.name },
    { label: 'Adresse', value: property?.address },
    { label: 'Startdato', value: agreement.start_date },
    agreement.end_date && { label: 'Sluttdato', value: agreement.end_date },
    { label: 'Månedlig leie', value: `${agreement.monthly_rent?.toLocaleString()} kr` },
    agreement.deposit && { label: 'Depositum', value: `${agreement.deposit?.toLocaleString()} kr` },
    agreement.rent_due_day && { label: 'Forfallsdag', value: `${agreement.rent_due_day}. i måneden` },
    agreement.rent_account && { label: 'Kontonr. for leie', value: agreement.rent_account },
    { label: 'Oppsigelsestid', value: `${agreement.notice_period_months} måneder` },
    { label: 'Kjæledyr', value: agreement.pets_allowed ? 'Tillatt' : 'Ikke tillatt' },
    { label: 'Røyking', value: agreement.smoking_allowed ? 'Tillatt' : 'Ikke tillatt' },
    { label: 'Strøm/vann', value: agreement.utilities_included ? 'Inkludert' : 'Ikke inkludert' },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">Leieavtale</h1>
            <p className="text-xs text-gray-400">{property?.name}</p>
          </div>
          <span className={`ml-auto text-xs px-2 py-1 rounded-full font-medium ${agreement.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {agreement.status === 'active' ? 'Aktiv' : agreement.status === 'pending_tenant' ? 'Venter signatur' : agreement.status}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Agreement details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-purple-500" /> Avtaleoversikt</h2>
          <div className="space-y-2">
            {fields.map((f, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-500">{f.label}</span>
                <span className="font-medium text-gray-900">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Terms */}
        {agreement.terms && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Vilkår</h2>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{agreement.terms}</pre>
          </div>
        )}

        {/* Signature status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Signaturer</h2>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700">Utleier ({agreement.landlord_name})</span>
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${agreement.landlord_signed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {agreement.landlord_signed ? <><Check className="w-3 h-3" /> Signert</> : 'Venter'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-gray-50">
            <span className="text-sm text-gray-700">Leietaker ({agreement.tenant_name || 'Ikke satt'})</span>
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${agreement.tenant_signed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {agreement.tenant_signed ? <><Check className="w-3 h-3" /> Signert</> : 'Venter'}
            </span>
          </div>
        </div>

        {/* Sign action */}
        {!alreadySigned && agreement.status !== 'active' && (
          <div className="bg-white rounded-2xl shadow-sm border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2"><PenLine className="w-4 h-4 text-blue-600" /> Signer avtalen</p>
            <p className="text-sm text-gray-600">Jeg, <strong>{isLandlord ? agreement.landlord_name : agreement.tenant_name}</strong>, bekrefter at jeg har lest og aksepterer alle vilkårene i denne leieavtalen.</p>

            {/* Signature canvas */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-500 font-medium">Tegn signaturen din nedenfor</p>
                <button onClick={clearCanvas} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3 h-3" /> Tøm
                </button>
              </div>
              <div className="border-2 border-dashed border-blue-300 rounded-xl bg-white overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  className="w-full touch-none cursor-crosshair"
                  style={{ display: 'block' }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
              </div>
              {!hasSigned && <p className="text-xs text-gray-400 text-center mt-1">Bruk finger, penn eller mus for å signere</p>}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-blue-600" />
              <span className="text-sm text-gray-700">Jeg har lest og godtar avtalen</span>
            </label>
            <button
              onClick={() => signMutation.mutate()}
              disabled={!confirmed || !hasSigned || signMutation.isPending}
              className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              <PenLine className="w-4 h-4" />
              {signMutation.isPending ? 'Signerer...' : `Signer som ${isLandlord ? 'utleier' : 'leietaker'}`}
            </button>
          </div>
        )}

        {alreadySigned && agreement.status !== 'active' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-semibold">Du har signert!</p>
            <p className="text-green-600 text-sm">Venter på {isLandlord ? 'leietaker' : 'utleier'}s signatur</p>
          </div>
        )}

        {agreement.status === 'active' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
            <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-semibold">Avtalen er aktiv!</p>
            <p className="text-green-600 text-sm">Begge parter har signert</p>
          </div>
        )}
      </div>
    </div>
  );
}