import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, TrendingUp, TrendingDown, Receipt, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/components/LanguageContext';

const TAX_TYPE_LABELS = {
  secondary: 'Sekundærbolig',
  primary_partial: 'Del av egen bolig (sokkel e.l.)',
  vacation_short: 'Fritidseiendom – korttidsleie (<30 dager)',
  vacation_long: 'Fritidseiendom – langtidsleie',
};

function calcTax(taxType, income, expenses) {
  if (income <= 0) return { taxable: 0, taxAmount: 0, taxFree: 0, note: '' };
  if (taxType === 'primary_partial') {
    if (income <= 20000) return { taxable: 0, taxAmount: 0, taxFree: income, note: 'Under 20 000 kr → skattefri' };
    const taxable = Math.max(0, income - expenses);
    return { taxable, taxAmount: taxable * 0.22, taxFree: 0, note: 'Over 20 000 kr → skattepliktig' };
  }
  if (taxType === 'vacation_short') {
    const FREE = 15000;
    if (income <= FREE) return { taxable: 0, taxAmount: 0, taxFree: income, note: 'Under 15 000 kr → skattefri' };
    const taxable = (income - FREE) * 0.85;
    return { taxable, taxAmount: taxable * 0.22, taxFree: FREE, note: '15 000 kr skattefritt, 85% av rest skattlegges' };
  }
  if (taxType === 'vacation_long') {
    const taxable = Math.max(0, income - expenses);
    return { taxable, taxAmount: taxable * 0.22, taxFree: 0, note: 'Som sekundærbolig – alle inntekter skattepliktige' };
  }
  // secondary (default)
  const taxable = Math.max(0, income - expenses);
  return { taxable, taxAmount: taxable * 0.22, taxFree: 0, note: 'Alle inntekter skattepliktige, fradrag for kostnader' };
}

const categories = {
  income: ['rent', 'deposit', 'other'],
  expense: ['maintenance', 'repairs', 'utilities', 'insurance', 'taxes', 'other']
};

export default function PropertyFinances({ propertyId, landlordId, property, onUpdateProperty }) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [showTax, setShowTax] = useState(false);
  const [entryType, setEntryType] = useState('income');
  const [formData, setFormData] = useState({
    category: 'rent',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    receipt_url: ''
  });
  const [uploading, setUploading] = useState(false);

  const { data: entries = [] } = useQuery({
    queryKey: ['propertyFinances', propertyId],
    queryFn: () => base44.entities.FinancialEntry.filter({ rental_unit_id: propertyId }, '-date', 100),
    enabled: !!propertyId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FinancialEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyFinances', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
      setShowDialog(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.FinancialEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propertyFinances', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['finances'] });
    }
  });

  const resetForm = () => {
    setFormData({
      category: entryType === 'income' ? 'rent' : 'maintenance',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      receipt_url: ''
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, receipt_url: file_url });
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      rental_unit_id: propertyId,
      landlord_id: landlordId,
      type: entryType,
      amount: parseFloat(formData.amount)
    });
  };

  const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const netIncome = totalIncome - totalExpenses;

  const openAddDialog = (type) => {
    setEntryType(type);
    setFormData({
      category: type === 'income' ? 'rent' : 'maintenance',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      receipt_url: ''
    });
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
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
            <Receipt className={`w-4 h-4 mx-auto mb-1 ${netIncome >= 0 ? 'text-blue-600' : 'text-amber-600'}`} />
            <p className={`text-xs ${netIncome >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>Netto</p>
            <p className={`font-bold ${netIncome >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>{netIncome.toLocaleString()} kr</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={() => openAddDialog('income')} 
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <Plus className="w-4 h-4 mr-1" /> Inntekt
        </Button>
        <Button 
          onClick={() => openAddDialog('expense')} 
          variant="outline"
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
        >
          <Plus className="w-4 h-4 mr-1" /> Utgift
        </Button>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Transaksjoner</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-4">Ingen transaksjoner ennå</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {entries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    entry.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {entry.type === 'income' 
                      ? <TrendingUp className="w-4 h-4 text-green-600" />
                      : <TrendingDown className="w-4 h-4 text-red-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{entry.description || t(entry.category)}</span>
                      <Badge variant="outline" className="text-xs">{t(entry.category)}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">{entry.date}</p>
                  </div>
                  <span className={`font-semibold ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.type === 'income' ? '+' : '-'}{entry.amount.toLocaleString()} kr
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-slate-400 hover:text-red-600"
                    onClick={() => deleteMutation.mutate(entry.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entryType === 'income' ? 'Legg til inntekt' : 'Legg til utgift'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Kategori</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories[entryType].map(cat => (
                    <SelectItem key={cat} value={cat}>{t(cat)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Beløp (kr)</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                required
              />
            </div>
            <div>
              <Label>Beskrivelse</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Valgfri"
              />
            </div>
            <div>
              <Label>Dato</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Kvittering/vedlegg</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {formData.receipt_url && (
                <p className="text-xs text-green-600 mt-1">Fil lastet opp</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Avbryt
              </Button>
              <Button 
                type="submit" 
                className={entryType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                disabled={createMutation.isPending || !formData.amount}
              >
                Lagre
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}