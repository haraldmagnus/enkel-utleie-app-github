import React, { useState } from 'react';
import { Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogDescription, DialogFooter 
} from '@/components/ui/dialog';

export default function BankIDSignature({ 
  onSign, 
  isLoading, 
  userName,
  documentType = "leieavtale"
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleBankIDSign = async () => {
    setVerifying(true);
    
    // Simuler BankID-verifisering (i produksjon ville dette vært en ekte BankID-integrasjon)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generer en unik referanse for signaturen
    const bankIdRef = `BANKID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setVerified(true);
    setVerifying(false);
    
    // Vent litt så bruker ser bekreftelsen
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onSign(bankIdRef);
    setShowDialog(false);
    setVerified(false);
  };

  return (
    <>
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">BankID Signering</h3>
              <p className="text-sm text-blue-700">Sikker elektronisk signatur</p>
            </div>
          </div>
          <p className="text-sm text-blue-800 mb-4">
            Signer {documentType}en trygt med BankID. Din signatur er juridisk bindende.
          </p>
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => setShowDialog(true)}
            disabled={isLoading}
          >
            <Shield className="w-4 h-4 mr-2" />
            Signer med BankID
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              BankID Signering
            </DialogTitle>
            <DialogDescription>
              Du signerer nå {documentType}en som {userName}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {!verifying && !verified && (
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-10 h-10 text-blue-600" />
                </div>
                <p className="text-slate-600 mb-2">
                  Klikk for å starte BankID-signering
                </p>
                <p className="text-xs text-slate-500">
                  Du vil bli bedt om å bekrefte med BankID på mobil eller kodebrikke
                </p>
              </div>
            )}

            {verifying && (
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                </div>
                <p className="text-slate-900 font-medium mb-2">
                  Venter på BankID...
                </p>
                <p className="text-sm text-slate-500">
                  Bekreft signeringen i BankID-appen
                </p>
              </div>
            )}

            {verified && (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <p className="text-green-700 font-medium mb-2">
                  Signatur bekreftet!
                </p>
                <p className="text-sm text-slate-500">
                  Din BankID-signatur er registrert
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            {!verifying && !verified && (
              <>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Avbryt
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleBankIDSign}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Start BankID
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}