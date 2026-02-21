import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Wallet, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';

export default function FinancesNet() {
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
        <h1 className="text-xl font-bold text-slate-900">Netto</h1>
      </div>

      <div className="p-4 space-y-4">
        <Card className={netIncome >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}>
          <CardContent className="p-4 text-center">
            <Wallet className={`w-6 h-6 mx-auto mb-1 ${netIncome >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
            <p className={`text-sm ${netIncome >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>Netto før skatt</p>
            <p className={`text-2xl font-bold mt-1 ${netIncome >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
              {netIncome.toLocaleString()} kr
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Netto inntekt</span>
              <span className="font-semibold text-slate-800">{netIncome.toLocaleString()} kr</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Estimert skatt (22%)</span>
              <span className="font-semibold text-red-600">−{estimatedTax.toLocaleString()} kr</span>
            </div>
            <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
              <span className="font-medium text-slate-700">Netto etter skatt</span>
              <span className={`font-bold text-lg ${netAfterTax >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                {netAfterTax.toLocaleString()} kr
              </span>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-slate-400 text-center">
          Skatteestimatet er basert på 22% skattesats for sekundærbolig.
        </p>
      </div>
    </div>
  );
}