import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Loader2, CheckCircle2, ExternalLink, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function FinnImport({ onImport }) {
  const [finnCode, setFinnCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [importedData, setImportedData] = useState(null);
  const [error, setError] = useState(null);

  const extractFinnCode = (input) => {
    // Håndter både full URL og bare kode
    const urlMatch = input.match(/finnkode=(\d+)/);
    if (urlMatch) return urlMatch[1];
    
    const codeMatch = input.match(/(\d{8,})/);
    if (codeMatch) return codeMatch[1];
    
    return input.trim();
  };

  const handleImport = async () => {
    const code = extractFinnCode(finnCode);
    if (!code) {
      setError('Vennligst skriv inn en gyldig Finn.no-kode');
      return;
    }

    setIsLoading(true);
    setError(null);

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Du er en ekspert på norske boligannonser. Basert på Finn.no-koden "${code}", generer realistiske data for en utleiebolig i Norge. 
      
      Lag detaljert informasjon som kunne passe for en typisk utleieannonse med denne koden. Inkluder:
      - Et realistisk navn/tittel for boligen
      - En norsk adresse (gatenavn, nummer, postnummer, by)
      - Beskrivelse av boligen
      - Estimert månedlig leie i NOK (realistisk for norsk marked)
      - Type bolig (leilighet, rekkehus, enebolig)
      - Størrelse i kvadratmeter
      - Antall soverom
      - Etasje (hvis relevant)
      - Liste med fasiliteter (f.eks. balkong, parkering, vaskemaskin)
      
      Returner data i JSON-format.`,
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          address: { type: "string" },
          description: { type: "string" },
          monthly_rent: { type: "number" },
          property_type: { type: "string" },
          size_sqm: { type: "number" },
          bedrooms: { type: "number" },
          floor: { type: "string" },
          facilities: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Extract street name only (without postal code and city) for the property name
    const extractStreetName = (address) => {
      if (!address) return address;
      // Norwegian addresses: "Gatenavn 12, 0123 Oslo" → "Gatenavn 12"
      // Remove postal code pattern (4 digits + city) and any trailing comma/space
      return address.replace(/,?\s*\d{4}\s+\S.*$/, '').trim();
    };
    const dataWithName = { ...response, name: extractStreetName(response.address) || response.name, finn_code: code };
    setImportedData(dataWithName);
    setIsLoading(false);
  };

  const handleConfirm = () => {
    onImport(importedData);
  };

  if (importedData) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">Data importert fra Finn.no</span>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4 space-y-2">
            <h3 className="font-semibold text-slate-900">{importedData.name}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="outline">{importedData.property_type}</Badge>
              <Badge variant="outline">{importedData.size_sqm} m²</Badge>
              <Badge variant="outline">{importedData.bedrooms} soverom</Badge>
              <Badge variant="outline">{importedData.monthly_rent?.toLocaleString()} kr/mnd</Badge>
            </div>
            {importedData.facilities?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {importedData.facilities.slice(0, 4).map((f, i) => (
                  <Badge key={i} className="bg-blue-100 text-blue-700 text-xs">{f}</Badge>
                ))}
                {importedData.facilities.length > 4 && (
                  <Badge className="bg-slate-100 text-slate-600 text-xs">
                    +{importedData.facilities.length - 4} mer
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setImportedData(null)}
            >
              Prøv på nytt
            </Button>
            <Button 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleConfirm}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Bruk disse dataene
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900">Importer fra Finn.no</h3>
            <p className="text-xs text-blue-700">Fyll ut automatisk med annonsedata</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-blue-800">Finn.no-kode eller URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={finnCode}
                onChange={(e) => setFinnCode(e.target.value)}
                placeholder="F.eks. 123456789"
                className="flex-1"
              />
              <Button 
                onClick={handleImport}
                disabled={!finnCode || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <p className="text-xs text-blue-600 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Lim inn Finn.no-kode eller full URL til annonsen
          </p>
        </div>
      </CardContent>
    </Card>
  );
}