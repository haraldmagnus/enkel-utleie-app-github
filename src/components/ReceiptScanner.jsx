import React, { useRef, useState } from 'react';
import { Camera, Upload, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function ReceiptScanner({ onScanned }) {
  const fileInputRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const categoryMap = {
    vedlikehold: 'maintenance',
    reparasjon: 'repairs',
    strøm: 'utilities',
    vann: 'utilities',
    forsikring: 'insurance',
    skatt: 'taxes',
    maintenance: 'maintenance',
    repairs: 'repairs',
    utilities: 'utilities',
    insurance: 'insurance',
    taxes: 'taxes',
  };

  const guessCategory = (text) => {
    const lower = (text || '').toLowerCase();
    for (const [keyword, cat] of Object.entries(categoryMap)) {
      if (lower.includes(keyword)) return cat;
    }
    return 'other';
  };

  const handleFile = async (file) => {
    if (!file) return;
    setScanning(true);
    setScanned(false);

    // Upload file first
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    // Use InvokeLLM vision to extract receipt data
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Du er en kvitteringsleser. Analyser dette kvitteringsbildet og trekk ut:
1. Totalt beløp (bare tallet, ingen valutasymbol)
2. Dato (format YYYY-MM-DD)
3. Butikk/leverandørnavn
4. Type utgift (maintenance, repairs, utilities, insurance, taxes, eller other)

Svar KUN med JSON.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          date: { type: 'string' },
          vendor: { type: 'string' },
          category: { type: 'string' },
        },
      },
    });

    const category = categoryMap[result.category] || guessCategory(result.vendor) || 'other';

    onScanned({
      amount: result.amount ? String(Math.round(result.amount)) : '',
      date: result.date || new Date().toISOString().split('T')[0],
      description: result.vendor || '',
      category,
      type: 'expense',
      receipt_url: file_url,
    });

    setScanning(false);
    setScanned(true);
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed border-blue-300 text-blue-600 hover:bg-blue-50"
        onClick={() => fileInputRef.current?.click()}
        disabled={scanning}
      >
        {scanning ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Leser kvittering...
          </>
        ) : scanned ? (
          <>
            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
            Kvittering lest! Ta ny?
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 mr-2" />
            Skann kvittering med kamera
          </>
        )}
      </Button>
    </div>
  );
}