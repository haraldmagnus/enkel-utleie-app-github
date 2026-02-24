import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TAX_RATE = 0.22;
const TAX_FREE_THRESHOLD = 10000;

export default function TaxEstimate() {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);
  const selectedYear = String(new Date().getFullYear());

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: properties = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.filter({ landlord_id: user?.id }, '-updated_date', 100),
    enabled: !!user?.id
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['finances-all', user?.id],
    queryFn: () => base44.entities.FinancialEntry.filter({ landlord_id: user?.id }, '-date', 500),
    enabled: !!user?.id
  });

  const yearEntries = entries.filter(e => e.date?.startsWith(selectedYear));
  const totalIncome = yearEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpenses = yearEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  const hasPrimaryPartial = properties.some(p => p.tax_type === 'primary_partial');
  const hasSecondary = properties.some(p => !p.tax_type || p.tax_type === 'secondary');
  const deductibleExpenses = totalExpenses;
  const taxableIncome = Math.max(0, totalIncome - deductibleExpenses);
  const taxFreeAmount = hasPrimaryPartial && !hasSecondary ? TAX_FREE_THRESHOLD : 0;
  const taxableAfterThreshold = Math.max(0, taxableIncome - taxFreeAmount);
  const estimatedTax = Math.round(taxableAfterThreshold * TAX_RATE);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-blue-600 shadow-md">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center hover:bg-blue-400 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="font-bold text-white text-lg">Skatteestimat {selectedYear}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {isLoading ? (
          <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                <span className="text-lg">🧾</span> Skatteestimat {selectedYear}
              </h3>
              <button onClick={() => setShowInfo(!showInfo)} className="text-amber-600 hover:text-amber-800 transition-colors">
                <Info className="w-4 h-4" />
              </button>
            </div>
            {showInfo && (
              <div className="px-4 py-3 bg-amber-50/50 border-b border-amber-100 text-xs text-amber-800 space-y-2">
                <p><strong>Slik beregnes skatten:</strong></p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Leieinntekter er skattepliktige som kapitalinntekt (22 %)</li>
                  <li>Vedlikehold og driftskostnader er fradragsberettiget</li>
                  <li>Leier du ut del av egen bolig: de første 10 000 kr er skattefrie</li>
                  <li>Leier du ut sekundærbolig: hele beløpet er skattepliktig</li>
                  <li>Depositum er ikke skattepliktig</li>
                </ul>
                <p className="text-amber-600 font-medium">Dette er kun et estimat.</p>
              </div>
            )}
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Totale leieinntekter</span>
                <span className="font-medium text-gray-900">+ {totalIncome.toLocaleString()} kr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Fradragsberettigede utgifter</span>
                <span className="font-medium text-red-600">- {deductibleExpenses.toLocaleString()} kr</span>
              </div>
              {taxFreeAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Skattefritt beløp</span>
                  <span className="font-medium text-green-600">- {Math.min(taxFreeAmount, taxableIncome).toLocaleString()} kr</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
                <span className="text-gray-500">Skattepliktig inntekt</span>
                <span className="font-medium text-gray-900">{taxableAfterThreshold.toLocaleString()} kr</span>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs text-amber-700">Estimert skatt (22 %)</p>
                  <p className="text-2xl font-bold text-amber-900">{estimatedTax.toLocaleString()} kr</p>
                </div>
                <div className="text-4xl">🏛️</div>
              </div>
              <p className="text-xs text-gray-400 text-center">Basert på kapitalskattesats 22 % for {selectedYear}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}