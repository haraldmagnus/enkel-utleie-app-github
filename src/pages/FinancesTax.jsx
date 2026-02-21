import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, ArrowLeft, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';

export default function FinancesTax() {
  const { state } = useLocation();
  const netIncome = state?.netIncome ?? 0;
  const estimatedTax = state?.estimatedTax ?? 0;
  const netAfterTax = state?.netAfterTax ?? 0;

  return (
    <div className="pb-24">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link to={createPageUrl('Finances')}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Skatt</h1>
      </div>

      <div className="p-4 space-y-4">
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <FileText className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-sm text-purple-600">Estimert skatt</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">−{estimatedTax.toLocaleString()} kr</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Skattepliktig inntekt</span>
              <span className="font-semibold text-slate-800">{Math.max(0, netIncome).toLocaleString()} kr</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Skattesats</span>
              <span className="font-semibold text-slate-800">22 %</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
              <span className="font-medium text-slate-700">Estimert skatt</span>
              <span className="font-bold text-lg text-purple-700">−{estimatedTax.toLocaleString()} kr</span>
            </div>
          </CardContent>
        </Card>

        <Card className={netAfterTax >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}>
          <CardContent className="p-4 text-center">
            <Wallet className={`w-5 h-5 mx-auto mb-1 ${netAfterTax >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
            <p className={`text-sm ${netAfterTax >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Netto etter skatt</p>
            <p className={`text-xl font-bold mt-1 ${netAfterTax >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {netAfterTax.toLocaleString()} kr
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-400 text-center">
          Dette er et estimat. Kontakt en regnskapsfører for nøyaktig skatteberegning.
        </p>
      </div>
    </div>
  );
}