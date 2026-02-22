import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Download, FileText, Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/LanguageContext';

export default function YearlyReport() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [reportMode, setReportMode] = useState('full'); // 'full' or 'personal'

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.filter({ landlord_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: allEntries = [] } = useQuery({
    queryKey: ['allFinances', user?.id],
    queryFn: () => base44.entities.FinancialEntry.filter({ landlord_id: user?.id }, '-date', 1000),
    enabled: !!user?.id
  });

  // For personal report: filter entries by user_id or adjust rent amounts by split
  const getPersonalAmount = (entry) => {
    if (entry.category === 'rent' && entry.rent_splits && entry.rent_splits.length > 0) {
      const mySplit = entry.rent_splits.find(s => s.user_id === user?.id);
      if (mySplit) return (entry.amount * mySplit.percentage) / 100;
    }
    // For non-rent entries: only include if created by this user
    if (entry.user_id && entry.user_id !== user?.id) return null;
    return entry.amount;
  };

  // Filter by year and property
  const entries = allEntries.filter(e => {
    const entryYear = new Date(e.date).getFullYear().toString();
    const matchesYear = entryYear === selectedYear;
    const matchesProperty = selectedProperty === 'all' || e.rental_unit_id === selectedProperty;
    return matchesYear && matchesProperty;
  });

  // Calculate totals by category
  const incomeByCategory = {};
  const expenseByCategory = {};
  
  entries.forEach(e => {
    if (e.type === 'income') {
      incomeByCategory[e.category] = (incomeByCategory[e.category] || 0) + e.amount;
    } else {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    }
  });

  const totalIncome = Object.values(incomeByCategory).reduce((sum, v) => sum + v, 0);
  const totalExpenses = Object.values(expenseByCategory).reduce((sum, v) => sum + v, 0);
  const netIncome = totalIncome - totalExpenses;

  // Generate years list
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y.toString());
  }

  const downloadCSV = () => {
    const headers = ['Dato', 'Type', 'Kategori', 'Beskrivelse', 'Beløp', 'Eiendom'];
    const rows = entries.map(e => {
      const property = properties.find(p => p.id === e.rental_unit_id);
      return [
        e.date,
        e.type === 'income' ? 'Inntekt' : 'Utgift',
        t(e.category),
        e.description || '',
        e.amount,
        property?.name || ''
      ];
    });

    // Add summary
    rows.push([]);
    rows.push(['OPPSUMMERING']);
    rows.push(['Total inntekt', '', '', '', totalIncome]);
    rows.push(['Totale utgifter', '', '', '', totalExpenses]);
    rows.push(['Netto inntekt', '', '', '', netIncome]);
    
    rows.push([]);
    rows.push(['INNTEKTER PER KATEGORI']);
    Object.entries(incomeByCategory).forEach(([cat, amount]) => {
      rows.push([t(cat), '', '', '', amount]);
    });
    
    rows.push([]);
    rows.push(['UTGIFTER PER KATEGORI']);
    Object.entries(expenseByCategory).forEach(([cat, amount]) => {
      rows.push([t(cat), '', '', '', amount]);
    });

    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `arsrapport-${selectedYear}${selectedProperty !== 'all' ? '-' + properties.find(p => p.id === selectedProperty)?.name : ''}.csv`;
    link.click();
  };

  return (
    <div className="pb-20">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Årsrapport for skatt</h1>
            <p className="text-blue-100 text-sm">Eksporter økonomidata</p>
          </div>
          <FileText className="w-8 h-8 text-blue-200" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Velg år" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Alle eiendommer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle eiendommer</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-4 h-4 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-green-700">Inntekt</p>
              <p className="font-bold text-green-700">{totalIncome.toLocaleString()} kr</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-100">
            <CardContent className="p-3 text-center">
              <TrendingDown className="w-4 h-4 text-red-600 mx-auto mb-1" />
              <p className="text-xs text-red-700">Utgifter</p>
              <p className="font-bold text-red-700">{totalExpenses.toLocaleString()} kr</p>
            </CardContent>
          </Card>
          <Card className={`${netIncome >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
            <CardContent className="p-3 text-center">
              <FileText className={`w-4 h-4 mx-auto mb-1 ${netIncome >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
              <p className={`text-xs ${netIncome >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>Netto</p>
              <p className={`font-bold ${netIncome >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>{netIncome.toLocaleString()} kr</p>
            </CardContent>
          </Card>
        </div>

        {/* Income by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-700">Inntekter per kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(incomeByCategory).length === 0 ? (
              <p className="text-sm text-slate-500">Ingen inntekter registrert</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(incomeByCategory).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm text-slate-600">{t(cat)}</span>
                    <span className="font-medium text-green-600">+{amount.toLocaleString()} kr</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700">Utgifter per kategori</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(expenseByCategory).length === 0 ? (
              <p className="text-sm text-slate-500">Ingen utgifter registrert</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(expenseByCategory).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm text-slate-600">{t(cat)}</span>
                    <span className="font-medium text-red-600">-{amount.toLocaleString()} kr</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700"
          onClick={downloadCSV}
          disabled={entries.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Last ned CSV for skatt
        </Button>

        <p className="text-xs text-slate-500 text-center">
          Filen kan importeres i regnskapsprogram eller åpnes i Excel
        </p>
      </div>
    </div>
  );
}