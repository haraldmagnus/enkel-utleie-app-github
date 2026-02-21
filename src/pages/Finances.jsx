import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Wallet, Plus, TrendingUp, TrendingDown, Download, 
  Filter, Building2, Trash2, Bell, FileText, BarChart2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Finances() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [formData, setFormData] = useState({
    type: 'income',
    category: 'rent',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    rental_unit_id: ''
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: properties = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.filter({ landlord_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['finances', selectedProperty],
    queryFn: async () => {
      if (selectedProperty === 'all') {
        return base44.entities.FinancialEntry.filter({ landlord_id: user?.id }, '-date');
      }
      return base44.entities.FinancialEntry.filter({ 
        landlord_id: user?.id, 
        rental_unit_id: selectedProperty 
      }, '-date');
    },
    enabled: !!user?.id
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FinancialEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      setShowAddDialog(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FinancialEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    }
  });

  const resetForm = () => {
    setFormData({
      type: 'income',
      category: 'rent',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      rental_unit_id: properties[0]?.id || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      amount: Number(formData.amount),
      landlord_id: user.id
    });
  };

  const handleExport = () => {
    const filteredEntries = entries.filter(entry => new Date(entry.date).getFullYear().toString() === selectedYear);
    const headers = ['Dato', 'Type', 'Kategori', 'Beløp', 'Beskrivelse', 'Eiendom'];
    const rows = filteredEntries.map(entry => {
      const property = properties.find(p => p.id === entry.rental_unit_id);
      return [
        entry.date,
        entry.type === 'income' ? 'Inntekt' : 'Utgift',
        t(entry.category),
        entry.amount,
        entry.description || '',
        property?.name || ''
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `utleieokonomi_${selectedYear}.csv`;
    link.click();
  };

  const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  const incomeEntries = entries.filter(e => e.type === 'income');
  const expenseEntries = entries.filter(e => e.type === 'expense');

  // Build monthly chart data for selected year
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, '0');
    const monthEntries = entries.filter(e => e.date?.startsWith(`${selectedYear}-${month}`));
    return {
      month: new Date(2000, i, 1).toLocaleDateString('no', { month: 'short' }),
      Inntekt: monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      Utgift: monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    };
  }).filter(m => m.Inntekt > 0 || m.Utgift > 0);

  const categoryIcons = {
    rent: '🏠',
    deposit: '💰',
    maintenance: '🔧',
    repairs: '🛠️',
    utilities: '💡',
    insurance: '🛡️',
    taxes: '📋',
    other: '📦'
  };

  return (
    <div className="pb-24">
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{t('finances')}</h1>
          <div className="flex gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[90px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              disabled={entries.length === 0}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> {t('add')}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-xs text-green-600">{t('income')}</p>
              <p className="font-bold text-green-700">{totalIncome.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-3 text-center">
              <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <p className="text-xs text-red-600">{t('expense')}</p>
              <p className="font-bold text-red-700">{totalExpenses.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className={netIncome >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}>
            <CardContent className="p-3 text-center">
              <Wallet className={`w-5 h-5 mx-auto mb-1 ${netIncome >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
              <p className={`text-xs ${netIncome >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>Netto</p>
              <p className={`font-bold ${netIncome >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
                {netIncome.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Link to={createPageUrl('PaymentReminders')} className="flex-1">
            <Button variant="outline" className="w-full">
              <Bell className="w-4 h-4 mr-2" /> Påminnelser
            </Button>
          </Link>
          <Link to={createPageUrl('YearlyReport')} className="flex-1">
            <Button variant="outline" className="w-full">
              <FileText className="w-4 h-4 mr-2" /> Årsrapport
            </Button>
          </Link>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle eiendommer</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entries */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="income">{t('income')}</TabsTrigger>
            <TabsTrigger value="expense">{t('expense')}</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-2">
            {entries.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Ingen transaksjoner ennå</p>
                </CardContent>
              </Card>
            ) : (
              entries.map(entry => (
                <EntryCard 
                  key={entry.id} 
                  entry={entry} 
                  properties={properties}
                  t={t}
                  categoryIcons={categoryIcons}
                  onDelete={() => deleteMutation.mutate(entry.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="income" className="space-y-2">
            {incomeEntries.map(entry => (
              <EntryCard 
                key={entry.id} 
                entry={entry} 
                properties={properties}
                t={t}
                categoryIcons={categoryIcons}
                onDelete={() => deleteMutation.mutate(entry.id)}
              />
            ))}
          </TabsContent>

          <TabsContent value="expense" className="space-y-2">
            {expenseEntries.map(entry => (
              <EntryCard 
                key={entry.id} 
                entry={entry} 
                properties={properties}
                t={t}
                categoryIcons={categoryIcons}
                onDelete={() => deleteMutation.mutate(entry.id)}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addEntry')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{t('income')}</SelectItem>
                  <SelectItem value="expense">{t('expense')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t('category')}</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formData.type === 'income' ? (
                    <>
                      <SelectItem value="rent">{t('rent')}</SelectItem>
                      <SelectItem value="deposit">{t('deposit')}</SelectItem>
                      <SelectItem value="other">{t('other')}</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="maintenance">{t('maintenance')}</SelectItem>
                      <SelectItem value="repairs">{t('repairs')}</SelectItem>
                      <SelectItem value="utilities">{t('utilities')}</SelectItem>
                      <SelectItem value="insurance">{t('insurance')}</SelectItem>
                      <SelectItem value="taxes">{t('taxes')}</SelectItem>
                      <SelectItem value="other">{t('other')}</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Eiendom</Label>
              <Select 
                value={formData.rental_unit_id} 
                onValueChange={(v) => setFormData({ ...formData, rental_unit_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Velg eiendom" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('amount')} (kr)</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>{t('date')}</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label>{t('description')}</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Valgfri beskrivelse"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!formData.rental_unit_id || !formData.amount || createMutation.isPending}
              >
                {t('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntryCard({ entry, properties, t, categoryIcons, onDelete }) {
  const property = properties.find(p => p.id === entry.rental_unit_id);
  
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
            entry.type === 'income' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {categoryIcons[entry.category] || '📦'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{t(entry.category)}</span>
              {property && (
                <Badge variant="outline" className="text-xs">
                  <Building2 className="w-2 h-2 mr-1" />
                  {property.name}
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {entry.date} {entry.description && `• ${entry.description}`}
            </p>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${
              entry.type === 'income' ? 'text-green-600' : 'text-red-600'
            }`}>
              {entry.type === 'income' ? '+' : '-'}{entry.amount.toLocaleString()} kr
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-slate-400 hover:text-red-600"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}