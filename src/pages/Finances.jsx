import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Wallet, Calendar, Building2, Info, Download, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Norwegian rental tax rates 2024
const TAX_RATE = 0.22;
const TAX_FREE_THRESHOLD = 10000; // NOK per year, tax-free if renting part of own home under this

const CAT_LABELS = {
  'rent': 'Leieinntekt',
  'deposit': 'Depositum',
  'maintenance': 'Vedlikehold',
  'repairs': 'Reparasjoner',
  'utilities': 'Verktøy',
  'insurance': 'Forsikring',
  'taxes': 'Skatter',
  'other': 'Annet'
};

function TaxCard({ totalIncome, totalExpenses, selectedYear, properties }) {
  const [showInfo, setShowInfo] = useState(false);

  // Check if any property is primary partial (renting part of own home)
  const hasPrimaryPartial = properties.some(p => p.tax_type === 'primary_partial');
  const hasSecondary = properties.some(p => !p.tax_type || p.tax_type === 'secondary');

  // Taxable income: income minus deductible expenses
  const deductibleExpenses = totalExpenses; // maintenance, repairs etc
  const taxableIncome = Math.max(0, totalIncome - deductibleExpenses);

  // For primary partial: first 10 000 kr is tax-free
  const taxFreeAmount = hasPrimaryPartial && !hasSecondary ? TAX_FREE_THRESHOLD : 0;
  const taxableAfterThreshold = Math.max(0, taxableIncome - taxFreeAmount);
  const estimatedTax = Math.round(taxableAfterThreshold * TAX_RATE);

  return (
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
          <p className="text-amber-600 font-medium">Dette er kun et estimat. Konsulter en regnskapsfører for nøyaktig skatteberegning.</p>
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
            <span className="text-gray-500">Skattefritt beløp (del av bolig)</span>
            <span className="font-medium text-green-600">- {Math.min(taxFreeAmount, taxableIncome).toLocaleString()} kr</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-3 flex justify-between text-sm">
          <span className="text-gray-500">Skattepliktig inntekt</span>
          <span className="font-medium text-gray-900">{taxableAfterThreshold.toLocaleString()} kr</span>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 flex justify-between items-center">
          <div>
            <p className="text-xs text-amber-700">Estimert skatt (22 %)</p>
            <p className="text-xl font-bold text-amber-900">{estimatedTax.toLocaleString()} kr</p>
          </div>
          <div className="text-3xl">🏛️</div>
        </div>
        <p className="text-xs text-gray-400 text-center">Basert på kapitalskattesats 22 % for {selectedYear}</p>
      </div>
    </div>
  );
}

function exportCsv(entries, properties, year) {
  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));
  const rows = [
    ['Dato', 'Type', 'Kategori', 'Eiendom', 'Beskrivelse', 'Beløp (kr)']
  ];
  
  const yearEntries = entries.filter(e => e.date?.startsWith(year));
  yearEntries.forEach(e => {
    rows.push([
      e.date,
      e.type === 'income' ? 'Inntekt' : 'Utgift',
      CAT_LABELS[e.category] || e.category,
      propMap[e.rental_unit_id] || '',
      e.description || '',
      e.amount
    ]);
  });

  const csv = rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `økonomi-${year}.csv`);
  link.click();
  URL.revokeObjectURL(url);
}

export default function Finances() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

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
  const net = totalIncome - totalExpenses;

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    const key = `${selectedYear}-${m}`;
    const monthEntries = yearEntries.filter(e => e.date?.startsWith(key));
    return {
      label: new Date(`${key}-01`).toLocaleDateString('no', { month: 'short' }),
      income: monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      expense: monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    };
  });

  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1);

  const currentYear = new Date().getFullYear();
  const downloadYears = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

  // Per property breakdown
  const propBreakdown = properties.map(p => {
    const pEntries = yearEntries.filter(e => e.rental_unit_id === p.id);
    return {
      ...p,
      income: pEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      expenses: pEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    };
  }).filter(p => p.income > 0 || p.expenses > 0);

  if (isLoading) return <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate(createPageUrl(`TransactionList?type=income&year=${selectedYear}`))}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center hover:border-green-200 hover:shadow-md transition-all active:scale-95"
        >
          <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <p className="text-lg font-bold text-green-700">{totalIncome.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Inntekter (kr)</p>
          <p className="text-[10px] text-green-500 mt-1 flex items-center justify-center gap-0.5">Se alle <ChevronRight className="w-2.5 h-2.5" /></p>
        </button>
        <button
          onClick={() => navigate(createPageUrl(`TransactionList?type=expense&year=${selectedYear}`))}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center hover:border-red-200 hover:shadow-md transition-all active:scale-95"
        >
          <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-2" />
          <p className="text-lg font-bold text-red-700">{totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Utgifter (kr)</p>
          <p className="text-[10px] text-red-500 mt-1 flex items-center justify-center gap-0.5">Se alle <ChevronRight className="w-2.5 h-2.5" /></p>
        </button>
        <div className={`rounded-2xl shadow-sm border p-4 text-center ${net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <Wallet className={`w-5 h-5 mx-auto mb-2 ${net >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
          <p className={`text-lg font-bold ${net >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{net.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Netto (kr)</p>
        </div>
      </div>

      {/* Year selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {downloadYears.map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${selectedYear === y ? 'bg-blue-600 text-white' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'}`}
          >
            {y}
          </button>
        ))}
      </div>

      {/* CSV Export */}
      {entries.length > 0 && (
        <button
          onClick={() => exportCsv(entries, properties, selectedYear)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white border border-blue-600 rounded-2xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Eksporter årsoppgave {selectedYear} (CSV)
        </button>
      )}

      {/* Monthly chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-500" /> Månedsoversikt {selectedYear}</h3>
        <div className="flex items-end gap-1 h-28">
          {months.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '96px' }}>
                <div className="w-full bg-green-400 rounded-sm transition-all" style={{ height: `${(m.income / maxVal) * 80}px` }} />
                <div className="w-full bg-red-400 rounded-sm transition-all" style={{ height: `${(m.expense / maxVal) * 80}px` }} />
              </div>
              <span className="text-[9px] text-gray-400">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-4 text-xs text-gray-500 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-green-400 rounded-sm" /> Inntekter</div>
          <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-400 rounded-sm" /> Utgifter</div>
        </div>
      </div>

      {/* Tax estimate */}
      <TaxCard totalIncome={totalIncome} totalExpenses={totalExpenses} selectedYear={selectedYear} properties={properties} />

      {/* Category breakdown */}
      {yearEntries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2"><span className="text-lg">📊</span> Fordeling etter kategori</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {Object.entries(
              yearEntries.reduce((acc, e) => {
                const cat = e.category;
                if (!acc[cat]) acc[cat] = { income: 0, expense: 0 };
                if (e.type === 'income') acc[cat].income += e.amount;
                else acc[cat].expense += e.amount;
                return acc;
              }, {})
            ).map(([cat, data]) => (
              <div key={cat} className="p-4 space-y-2">
                <p className="font-medium text-gray-900">{CAT_LABELS[cat] || cat}</p>
                {data.income > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Inntekter</span><span className="text-green-600 font-medium">+ {data.income.toLocaleString()} kr</span></div>}
                {data.expense > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Utgifter</span><span className="text-red-600 font-medium">- {data.expense.toLocaleString()} kr</span></div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Properties breakdown */}
      {propBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
            <h3 className="font-semibold text-purple-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-purple-600" /> Per eiendom</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {propBreakdown.map(p => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.address}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+{p.income.toLocaleString()}</p>
                  <p className="text-xs text-red-600">-{p.expenses.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}