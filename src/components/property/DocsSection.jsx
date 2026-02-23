import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { FileText, Upload, Download, Trash2, Plus, Camera } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function DocsSection({ propertyId, property, agreement, onUpdateProperty }) {
  const [uploading, setUploading] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const handleUploadAgreement = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { alert('Kun PDF-filer støttes'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Filen er for stor (maks 10MB)'); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUpdateProperty({ uploaded_agreement_url: file_url, uploaded_agreement_date: new Date().toISOString() });
    setUploading(false);
  };

  const handleMoveOutPhotos = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setPhotoUploading(true);
    const urls = await Promise.all(files.map(f => base44.integrations.Core.UploadFile({ file: f }).then(r => r.file_url)));
    onUpdateProperty({ move_out_photos: [...(property.move_out_photos || []), ...urls] });
    setPhotoUploading(false);
  };

  return (
    <div className="space-y-4">
      {/* Digital agreement */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-purple-500" /> Digital leieavtale</h3>
        </div>
        <div className="p-4">
          {agreement ? (
            <div className="space-y-3">
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
            <div className="text-center py-2">
              <p className="text-gray-400 text-sm mb-3">Ingen digital leieavtale opprettet</p>
              <Link to={createPageUrl(`CreateAgreement?propertyId=${propertyId}`)} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" /> Opprett leieavtale
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded PDF */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Upload className="w-4 h-4 text-blue-500" /> Opplastet avtale (PDF)</h3>
          {!property.uploaded_agreement_url && (
            <label className="flex items-center gap-1 text-blue-600 text-sm font-medium cursor-pointer hover:text-blue-700">
              <Upload className="w-4 h-4" /> Last opp
              <input type="file" accept="application/pdf" onChange={handleUploadAgreement} className="hidden" />
            </label>
          )}
        </div>
        <div className="p-4">
          {uploading ? (
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
              <button onClick={() => onUpdateProperty({ uploaded_agreement_url: null, uploaded_agreement_date: null })} className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-gray-400 text-sm mb-2">Ingen PDF lastet opp</p>
              <label className="cursor-pointer inline-flex items-center gap-2 bg-gray-100 text-gray-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-200 transition-colors">
                <Upload className="w-4 h-4" /> Velg PDF
                <input type="file" accept="application/pdf" onChange={handleUploadAgreement} className="hidden" />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Move-out photos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Camera className="w-4 h-4 text-red-500" /> Utflyttingsbilder</h3>
          <label className="flex items-center gap-1 text-blue-600 text-sm font-medium cursor-pointer">
            <Plus className="w-4 h-4" /> Legg til
            <input type="file" accept="image/*" multiple onChange={handleMoveOutPhotos} className="hidden" />
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
    </div>
  );
}