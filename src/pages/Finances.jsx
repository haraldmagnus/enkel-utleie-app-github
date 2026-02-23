import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Wallet, Calendar, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const CAT_LABELS = { rent: 'Leie', deposit: 'Depositum', maintenance: 'Vedlikehold', repairs: 'Reparasjoner', utilities: 'Strøm/vann', insurance: 'Forsikring', taxes: 'Skatt', other: 'Annet' };

export default function Finances() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: allProps = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.list('-created_date', 100),
    enabled: !!user?.id
  });
  const properties = allProps.filter(p => p.landlord_id === user?.id || (p.landlord_ids || []).includes(user?.id));

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

  const years = Array.from({ length: 3 }, (_, i) => String(new Date().getFullYear() - i));

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
      {/* Year selector */}
      <div className="flex gap-2">
        {years.map(y => (
          <button key={y} onClick={() => setSelectedYear(y)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedYear === y ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {y}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <p className="text-lg font-bold text-green-700">{totalIncome.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Inntekter (kr)</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
          <TrendingDown className="w-5 h-5 text-red-500 mx-auto mb-2" />
          <p className="text-lg font-bold text-red-700">{totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Utgifter (kr)</p>
        </div>
        <div className={`rounded-2xl shadow-sm border p-4 text-center ${net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <Wallet className={`w-5 h-5 mx-auto mb-2 ${net >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
          <p className={`text-lg font-bold ${net >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{net.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Netto (kr)</p>
        </div>
      </div>

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
        <div className="flex gap-4 mt-2 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-green-400" /><span className="text-xs text-gray-500">Inntekt</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /><span className="text-xs text-gray-500">Utgift</span></div>
        </div>
      </div>

      {/* Per property */}
      {propBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" /> Per eiendom</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {propBreakdown.map(p => (
              <Link key={p.id} to={createPageUrl(`PropertyDetail?id=${p.id}`)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-xs text-green-600">+{p.income.toLocaleString()} kr</span>
                    <span className="text-xs text-red-500">-{p.expenses.toLocaleString()} kr</span>
                  </div>
                </div>
                <p className={`text-sm font-bold ${(p.income - p.expenses) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{(p.income - p.expenses).toLocaleString()} kr</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <Wallet className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Ingen transaksjoner ennå</p>
          <p className="text-gray-400 text-xs mt-1">Legg til transaksjoner fra en eiendom</p>
        </div>
      )}
    </div>
  );
}