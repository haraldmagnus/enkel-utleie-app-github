import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TrendingUp, TrendingDown, Trash2, Receipt } from 'lucide-react';

const INCOME_CATS = ['rent', 'deposit', 'other'];
const EXPENSE_CATS = ['maintenance', 'repairs', 'utilities', 'insurance', 'taxes', 'other'];
const CAT_LABELS = { rent: 'Leie', deposit: 'Depositum', maintenance: 'Vedlikehold', repairs: 'Reparasjoner', utilities: 'Strøm/vann', insurance: 'Forsikring', taxes: 'Skatt', other: 'Annet' };

const TAX_LABELS = { secondary: 'Sekundærbolig', primary_partial: 'Del av egen bolig', vacation_short: 'Fritidsbolig (<30 dager)', vacation_long: 'Fritidsbolig (langtid)' };

function calcTax(type, income, expenses) {
  if (income <= 0) return { taxable: 0, tax: 0 };
  if (type === 'primary_partial') {
    if (income <= 20000) return { taxable: 0, tax: 0, note: 'Under 20 000 kr – skattefri' };
    const t = Math.max(0, income - expenses); return { taxable: t, tax: t * 0.22 };
  }
  if (type === 'vacation_short') {
    if (income <= 15000) return { taxable: 0, tax: 0, note: 'Under 15 000 kr – skattefri' };
    const t = (income - 15000) * 0.85; return { taxable: t, tax: t * 0.22 };
  }
  const t = Math.max(0, income - expenses); return { taxable: t, tax: t * 0.22 };
}

export default function FinancesSection({ propertyId, landlordId, property, onUpdateProperty }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [entryType, setEntryType] = useState('income');
  const [form, setForm] = useState({ category: 'rent', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

  const { data: entries = [] } = useQuery({
    queryKey: ['finances', propertyId],
    queryFn: () => base44.entities.FinancialEntry.filter({ rental_unit_id: propertyId }, '-date', 200),
    enabled: !!propertyId
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.FinancialEntry.create(d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['finances', propertyId] }); setShowForm(false); setForm({ category: 'rent', amount: '', description: '', date: new Date().toISOString().split('T')[0] }); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FinancialEntry.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finances', propertyId] })
  });

  const totalIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpenses = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpenses;
  const taxType = property?.tax_type || 'secondary';
  const { tax } = calcTax(taxType, totalIncome, totalExpenses);

  const submit = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...form, rental_unit_id: propertyId, landlord_id: landlordId, type: entryType, amount: parseFloat(form.amount) });
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 text-center">
          <TrendingUp className="w-4 h-4 text-green-500 mx-auto mb-1" />
          <p className="text-sm font-bold text-green-700">{totalIncome.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">Inntekter (kr)</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 text-center">
          <TrendingDown className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <p className="text-sm font-bold text-red-700">{totalExpenses.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">Utgifter (kr)</p>
        </div>
        <div className={`rounded-2xl shadow-sm border p-3 text-center ${net >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-sm font-bold ${net >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{net.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400">Netto (kr)</p>
          {tax > 0 && <p className="text-[10px] text-orange-500">~{Math.round(tax).toLocaleString()} kr skatt</p>}
        </div>
      </div>

      {/* Tax type */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Skattetype</p>
          <p className="text-sm font-medium text-gray-800">{TAX_LABELS[taxType]}</p>
        </div>
        <select value={taxType} onChange={e => onUpdateProperty({ tax_type: e.target.value })} className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 bg-white focus:outline-none text-gray-700">
          {Object.entries(TAX_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Add entry */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Transaksjoner</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-3 h-3" /> Ny
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-3">
            {['income','expense'].map(t => (
              <button key={t} type="button" onClick={() => { setEntryType(t); setForm({...form, category: t === 'income' ? 'rent' : 'maintenance'}); }} className={`flex-1 py-2 text-sm font-medium transition-colors ${entryType === t ? (t === 'income' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'text-gray-500 hover:bg-gray-50'}`}>
                {t === 'income' ? 'Inntekt' : 'Utgift'}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {(entryType === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
              </select>
              <input type="number" required placeholder="Beløp (kr)" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Beskrivelse" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">Lagre</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors">Avbryt</button>
            </div>
          </form>
        </div>
      )}

      {/* Entries list */}
      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Ingen transaksjoner ennå</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="bg-white rounded-xl shadow-sm border border-gray-100 flex items-center gap-3 px-4 py-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${e.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                {e.type === 'income' ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{CAT_LABELS[e.category] || e.category} {e.description && `– ${e.description}`}</p>
                <p className="text-xs text-gray-400">{e.date}</p>
              </div>
              <p className={`text-sm font-bold flex-shrink-0 ${e.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                {e.type === 'income' ? '+' : '-'}{e.amount.toLocaleString()} kr
              </p>
              <button onClick={() => deleteMutation.mutate(e.id)} className="text-gray-300 hover:text-red-500 transition-colors ml-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}