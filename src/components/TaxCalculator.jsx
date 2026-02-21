import React, { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function fmt(n) {
  return Math.round(n).toLocaleString('no') + ' kr';
}

export default function TaxCalculator({ properties = [], entries = [], selectedYear }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    property_type: 'secondary',
    annual_income: '',
    annual_expenses: '',
    selected_property: ''
  });
  const [result, setResult] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Compute totals from entries filtered by year and property
  const yearStr = selectedYear ? selectedYear.toString() : new Date().getFullYear().toString();
  const filteredEntries = entries.filter(e => {
    const matchYear = e.date?.startsWith(yearStr);
    const matchProp = !form.selected_property || e.rental_unit_id === form.selected_property;
    return matchYear && matchProp;
  });

  const autoIncome = filteredEntries
    .filter(e => e.type === 'income')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Only deductible expense categories
  const deductibleCategories = ['maintenance', 'repairs', 'utilities', 'insurance', 'taxes'];
  const autoExpenses = filteredEntries
    .filter(e => e.type === 'expense' && deductibleCategories.includes(e.category))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const effectiveIncome = form.annual_income !== '' ? Number(form.annual_income) : autoIncome;
  const effectiveExpenses = form.annual_expenses !== '' ? Number(form.annual_expenses) : autoExpenses;
  const usingAutoData = form.annual_income === '' || form.annual_expenses === '';

  const calculate = () => {
    const income = effectiveIncome;
    const expenses = effectiveExpenses;
    let taxable = 0;
    let taxAmount = 0;
    let explanation = '';
    let taxFree = 0;

    if (form.property_type === 'secondary') {
      // Sekundærbolig: alt skattepliktig
      taxable = Math.max(0, income - expenses);
      taxAmount = taxable * 0.22;
      explanation = 'Sekundærbolig: alle leieinntekter er skattepliktige. Fradrag for dokumenterte kostnader.';
    } else if (form.property_type === 'primary_partial') {
      // Primærbolig (sokkel): skattefri hvis du bruker minst halvparten selv
      // Under 20 000 kr skattefri (forenklingsregel), over: alt skattepliktig
      if (income <= 20000) {
        taxFree = income;
        taxable = 0;
        taxAmount = 0;
        explanation = 'Inntekten er under 20 000 kr og du bruker minst halvparten av boligen selv → skattefri.';
      } else {
        taxable = Math.max(0, income - expenses);
        taxAmount = taxable * 0.22;
        explanation = 'Inntekten overstiger 20 000 kr. Alle leieinntekter er skattepliktige, men du kan trekke fra kostnader.';
      }
    } else if (form.property_type === 'vacation_short') {
      // Fritidseiendom korttidsutleie (<30 dager): 15 000 kr skattefritt, 85% av resten skattlegges
      const FREE_AMOUNT = 15000;
      if (income <= FREE_AMOUNT) {
        taxFree = income;
        taxable = 0;
        taxAmount = 0;
        explanation = `Korttidsutleie av fritidseiendom: inntekten er under fribeløpet på 15 000 kr → skattefri.`;
      } else {
        taxFree = FREE_AMOUNT;
        const over = income - FREE_AMOUNT;
        taxable = over * 0.85;
        taxAmount = taxable * 0.22;
        explanation = `Korttidsutleie av fritidseiendom: 15 000 kr er skattefritt. 85 % av resterende ${fmt(over)} (= ${fmt(taxable)}) skattlegges med 22 %.`;
      }
    } else if (form.property_type === 'vacation_long') {
      // Langtidsutleie av fritidseiendom (uten egen bruk): alt skattepliktig som sekundærbolig
      taxable = Math.max(0, income - expenses);
      taxAmount = taxable * 0.22;
      explanation = 'Langtidsutleie av fritidseiendom uten egen bruk: skattepliktig fra første krone, som sekundærbolig.';
    }

    setResult({ income, expenses, taxFree, taxable, taxAmount, explanation });
  };

  const showExpenses = ['secondary', 'primary_partial', 'vacation_long'].includes(form.property_type);

  return (
    <Card className="bg-white shadow-sm border-blue-100">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-blue-600" /> Skattekalkulator
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4 pt-0">
          <p className="text-xs text-slate-500 flex items-start gap-1">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
            Gir et estimat basert på 2025-regler. Kontakt regnskapsfører for presis rådgivning.
          </p>

          {/* Property selector */}
          {properties.length > 0 && (
            <div className="space-y-1">
              <Label>Eiendom (valgfri)</Label>
              <Select value={form.selected_property} onValueChange={v => set('selected_property', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg eiendom…" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Property type */}
          <div className="space-y-1">
            <Label>Type utleie</Label>
            <Select value={form.property_type} onValueChange={v => { set('property_type', v); setResult(null); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="secondary">Sekundærbolig (ikke egen bolig)</SelectItem>
                <SelectItem value="primary_partial">Del av egen bolig (sokkel e.l.)</SelectItem>
                <SelectItem value="vacation_short">Fritidseiendom – korttidsutleie (&lt;30 dager)</SelectItem>
                <SelectItem value="vacation_long">Fritidseiendom – langtidsutleie</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Income */}
          <div className="space-y-1">
            <Label>Årlige leieinntekter (kr)</Label>
            <Input
              type="number"
              placeholder="f.eks. 120000"
              value={form.annual_income}
              onChange={e => { set('annual_income', e.target.value); setResult(null); }}
            />
          </div>

          {/* Expenses – only where relevant */}
          {showExpenses && (
            <div className="space-y-1">
              <Label>Fradragsberettigede utgifter (kr)</Label>
              <Input
                type="number"
                placeholder="vedlikehold, forsikring, avgifter…"
                value={form.annual_expenses}
                onChange={e => { set('annual_expenses', e.target.value); setResult(null); }}
              />
            </div>
          )}

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={calculate}
            disabled={!form.annual_income}
          >
            Beregn estimert skatt
          </Button>

          {/* Result */}
          {result && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Leieinntekter</span>
                  <span className="font-medium">{fmt(result.income)}</span>
                </div>
                {result.taxFree > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Skattefritt beløp</span>
                    <span className="font-medium text-green-600">− {fmt(result.taxFree)}</span>
                  </div>
                )}
                {showExpenses && result.expenses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Fradrag utgifter</span>
                    <span className="font-medium text-green-600">− {fmt(result.expenses)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-700 font-medium">Skattepliktig inntekt</span>
                  <span className="font-semibold">{fmt(result.taxable)}</span>
                </div>
                <div className="flex justify-between bg-red-50 rounded-lg px-3 py-2">
                  <span className="text-red-700 font-semibold">Estimert skatt (22 %)</span>
                  <span className="text-red-700 font-bold text-base">{fmt(result.taxAmount)}</span>
                </div>
                {result.taxAmount === 0 && (
                  <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
                    <span className="text-green-700 font-semibold">✓ Skattefri inntekt</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed border-t pt-2">{result.explanation}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}