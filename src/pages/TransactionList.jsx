import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, TrendingUp, TrendingDown, Filter } from 'lucide-react';

const CAT_LABELS = {
  rent: 'Leie',
  deposit: 'Depositum',
  maintenance: 'Vedlikehold',
  repairs: 'Reparasjoner',
  utilities: 'Strøm/vann',
  insurance: 'Forsikring',
  taxes: 'Skatt',
  other: 'Annet',
};

const CAT_COLORS = {
  rent: 'bg-blue-100 text-blue-700',
  deposit: 'bg-purple-100 text-purple-700',
  maintenance: 'bg-orange-100 text-orange-700',
  repairs: 'bg-red-100 text-red-700',
  utilities: 'bg-teal-100 text-teal-700',
  insurance: 'bg-indigo-100 text-indigo-700',
  taxes: 'bg-gray-100 text-gray-700',
  other: 'bg-gray-100 text-gray-600',
};

export default function TransactionList() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const type = urlParams.get('type'); // 'income' or 'expense'
  const year = urlParams.get('year') || new Date().getFullYear().toString();

  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id, type, year],
    queryFn: () => base44.entities.FinancialEntry.filter({ landlord_id: user?.id, type }, '-date', 500),
    enabled: !!user?.id && !!type
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['rentalUnits', user?.id],
    queryFn: () => base44.entities.RentalUnit.filter({ landlord_id: user?.id }, '-created_date', 100),
    enabled: !!user?.id
  });

  const propMap = Object.fromEntries(properties.map(p => [p.id, p.name]));

  const yearEntries = entries.filter(e => e.date?.startsWith(year));

  const filteredEntries = selectedCategory === 'all'
    ? yearEntries
    : yearEntries.filter(e => e.category === selectedCategory);

  const categories = [...new Set(yearEntries.map(e => e.category).filter(Boolean))];

  const total = filteredEntries.reduce((s, e) => s + e.amount, 0);

  const isIncome = type === 'income';
  const title = isIncome ? 'Inntekter' : 'Utgifter';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">{title} {year}</h1>
            <p className="text-xs text-gray-400">{filteredEntries.length} transaksjoner</p>
          </div>
          <div className={`ml-auto text-base font-bold ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
            {isIncome ? '+' : '-'}{total.toLocaleString()} kr
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Category filter */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
            >
              Alle
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
              >
                <Filter className="w-3 h-3" />
                {CAT_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {/* Category summary */}
        {selectedCategory === 'all' && categories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <p className="text-sm font-semibold text-gray-700">Fordeling per kategori</p>
            </div>
            <div className="divide-y divide-gray-50">
              {categories.map(cat => {
                const catTotal = yearEntries.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
                const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${CAT_COLORS[cat] || 'bg-gray-100 text-gray-600'}`}>
                      {CAT_LABELS[cat] || cat}
                    </span>
                    <div className="flex-1">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isIncome ? 'bg-green-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{catTotal.toLocaleString()} kr</span>
                    <span className="text-xs text-gray-400">{pct}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaction list */}
        {isLoading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-white rounded-2xl animate-pulse border border-gray-100" />)}</div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            {isIncome ? <TrendingUp className="w-10 h-10 text-gray-200 mx-auto mb-3" /> : <TrendingDown className="w-10 h-10 text-gray-200 mx-auto mb-3" />}
            <p className="text-gray-400 text-sm">Ingen transaksjoner</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filteredEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isIncome ? 'bg-green-100' : 'bg-red-100'}`}>
                    {isIncome
                      ? <TrendingUp className="w-4 h-4 text-green-600" />
                      : <TrendingDown className="w-4 h-4 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{entry.description || CAT_LABELS[entry.category] || entry.category}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {entry.category && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CAT_COLORS[entry.category] || 'bg-gray-100 text-gray-600'}`}>
                          {CAT_LABELS[entry.category] || entry.category}
                        </span>
                      )}
                      {entry.rental_unit_id && propMap[entry.rental_unit_id] && (
                        <span className="text-[10px] text-gray-400">{propMap[entry.rental_unit_id]}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${isIncome ? 'text-green-700' : 'text-red-700'}`}>
                      {isIncome ? '+' : '-'}{entry.amount.toLocaleString()} kr
                    </p>
                    <p className="text-[10px] text-gray-400">{entry.date ? new Date(entry.date).toLocaleDateString('nb-NO') : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}