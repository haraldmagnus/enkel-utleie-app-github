import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Upload, Download, Trash2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function AgreementUpload({ property, onUpdate, isLoading }) {
  const [uploading, setUploading] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Kun PDF-filer er støttet');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('Filen er for stor (maks 20 MB)');
      return;
    }

    if (property?.uploaded_agreement_url) {
      setPendingFile(file);
      setShowReplaceDialog(true);
    } else {
      uploadFile(file);
    }
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setError(null);
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUpdate({
      uploaded_agreement_url: file_url,
      uploaded_agreement_date: new Date().toISOString()
    });
    
    setUploading(false);
    setPendingFile(null);
    setShowReplaceDialog(false);
  };

  const handleDelete = () => {
    onUpdate({
      uploaded_agreement_url: null,
      uploaded_agreement_date: null
    });
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {property?.uploaded_agreement_url ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">Leieavtale.pdf</p>
                <p className="text-xs text-slate-500">
                  Lastet opp {property.uploaded_agreement_date 
                    ? new Date(property.uploaded_agreement_date).toLocaleDateString('no', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })
                    : 'ukjent dato'
                  }
                </p>
              </div>
              <div className="flex gap-1">
                <a href={property.uploaded_agreement_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </a>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-600 hover:text-red-700"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <label className="block">
        <input
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading || isLoading}
        />
        <Button 
          variant="outline" 
          className="w-full" 
          asChild
          disabled={uploading || isLoading}
        >
          <span>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Laster opp...' : property?.uploaded_agreement_url ? 'Erstatt PDF' : 'Last opp leieavtale (PDF)'}
          </span>
        </Button>
      </label>

      <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erstatt eksisterende avtale?</DialogTitle>
            <DialogDescription>
              Du har allerede en leieavtale lastet opp. Vil du erstatte den med den nye filen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplaceDialog(false)}>
              Avbryt
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => pendingFile && uploadFile(pendingFile)}
              disabled={uploading}
            >
              {uploading ? 'Laster opp...' : 'Erstatt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}