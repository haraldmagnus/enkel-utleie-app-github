import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Wallet, Calendar, Building2, FileText, Download, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TAX_RATE = 0.22;
const TAX_FREE_THRESHOLD = 10000;

function calcTax(totalIncome, totalExpenses, properties) {
  const hasPrimaryPartial = properties.some(p => p.tax_type === 'primary_partial');
  const hasSecondary = properties.some(p => !p.tax_type || p.tax_type === 'secondary');
  const taxableIncome = Math.max(0, totalIncome - totalExpenses);
  const taxFreeAmount = hasPrimaryPartial && !hasSecondary ? TAX_FREE_THRESHOLD : 0;
  const taxableAfterThreshold = Math.max(0, taxableIncome - taxFreeAmount);
  return Math.round(taxableAfterThreshold * TAX_RATE);
}

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



function ExportYearModal({ entries, properties, onClose }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => String(currentYear - i));
  const [selectedExportYear, setSelectedExportYear] = useState(String(currentYear));

  const handleExport = () => {
    const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));
    const rows = [['Dato', 'Type', 'Kategori', 'Eiendom', 'Beskrivelse', 'Beløp (kr)']];
    const yearEntries = entries.filter(e => e.date?.startsWith(selectedExportYear));
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
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `økonomi-${selectedExportYear}.csv`);
    link.click();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 text-lg">Eksporter årsoppgave</h3>
        <p className="text-sm text-gray-500">Velg hvilket år du vil eksportere for:</p>
        <div className="grid grid-cols-3 gap-2">
          {years.map(y => (
            <button
              key={y}
              onClick={() => setSelectedExportYear(y)}
              className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${selectedExportYear === y ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {y}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          className="w-full py-3 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" /> Eksporter {selectedExportYear} (CSV)
        </button>
        <button onClick={onClose} className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-sm hover:bg-gray-200 transition-colors">
          Avbryt
        </button>
      </div>
    </div>
  );
}

export default function Finances() {
  const navigate = useNavigate();
  const [showExportModal, setShowExportModal] = useState(false);
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

  const propBreakdown = properties.map(p => {
    const pEntries = yearEntries.filter(e => e.rental_unit_id === p.id);
    return {
      ...p,
      income: pEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      expenses: pEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    };
  }).filter(p => p.income > 0 || p.expenses > 0);

  // Last 10 transactions across all properties
  const recentTransactions = entries.slice(0, 10);
  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));

  if (isLoading) return <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;

  const estimatedTax = calcTax(totalIncome, totalExpenses, properties);
  const netAfterTax = net - estimatedTax;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Summary 2x2 grid like the original design */}
      <div className="grid grid-cols-2 gap-3">
        {/* Inntekt */}
        <button
          onClick={() => navigate(createPageUrl(`TransactionList?type=income&year=${selectedYear}`))}
          className="bg-green-50 rounded-2xl border border-green-100 p-4 text-center hover:shadow-md transition-all active:scale-95"
        >
          <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-xs text-green-600 font-medium mb-1">Inntekt</p>
          <p className="text-xl font-bold text-green-700">{totalIncome.toLocaleString()} kr</p>
        </button>
        {/* Utgift */}
        <button
          onClick={() => navigate(createPageUrl(`TransactionList?type=expense&year=${selectedYear}`))}
          className="bg-red-50 rounded-2xl border border-red-100 p-4 text-center hover:shadow-md transition-all active:scale-95"
        >
          <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-xs text-red-600 font-medium mb-1">Utgift</p>
          <p className="text-xl font-bold text-red-700">{totalExpenses.toLocaleString()} kr</p>
        </button>
        {/* Netto */}
        <div className={`rounded-2xl border p-4 text-center ${net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <Wallet className={`w-5 h-5 mx-auto mb-1 ${net >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
          <p className={`text-xs font-medium mb-1 ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Netto</p>
          <p className={`text-xl font-bold ${net >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{net.toLocaleString()} kr</p>
          <p className="text-[10px] text-gray-400 mt-0.5">etter skatt: {netAfterTax.toLocaleString()} kr</p>
        </div>
        {/* Skatt - clickable */}
        <button
          onClick={() => navigate(createPageUrl('TaxEstimate'))}
          className="bg-purple-50 rounded-2xl border border-purple-100 p-4 text-center hover:shadow-md transition-all active:scale-95"
        >
          <FileText className="w-5 h-5 text-purple-500 mx-auto mb-1" />
          <p className="text-xs text-purple-600 font-medium mb-1">Skatt</p>
          <p className="text-xl font-bold text-purple-700">-{estimatedTax.toLocaleString()} kr</p>
        </button>
      </div>

      {/* Export CSV button */}
      {entries.length > 0 && (
        <button
          onClick={() => setShowExportModal(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white border border-blue-600 rounded-2xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" /> Eksporter årsoppgave
        </button>
      )}

      {/* Recent transactions across all properties */}
      {recentTransactions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Siste transaksjoner</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {recentTransactions.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${e.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {e.type === 'income'
                    ? <TrendingUp className="w-4 h-4 text-green-600" />
                    : <TrendingDown className="w-4 h-4 text-red-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{CAT_LABELS[e.category] || e.category}{e.description ? ` – ${e.description}` : ''}</p>
                  <p className="text-xs text-gray-400">{propMap[e.rental_unit_id] || ''} · {e.date}</p>
                </div>
                <span className={`text-sm font-semibold flex-shrink-0 ${e.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {e.type === 'income' ? '+' : '-'}{e.amount.toLocaleString()} kr
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax card */}
      <TaxCard totalIncome={totalIncome} totalExpenses={totalExpenses} selectedYear={selectedYear} properties={properties} />

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

      {showExportModal && (
        <ExportYearModal entries={entries} properties={properties} onClose={() => setShowExportModal(false)} />
      )}
    </div>
  );
}