import React from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingDown, Trash2, Building2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/components/LanguageContext';
import { createPageUrl } from '@/utils';

const categoryIcons = { maintenance: '🔧', repairs: '🛠️', utilities: '💡', insurance: '🛡️', taxes: '📋', other: '📦' };

export default function FinancesExpense() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: properties = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.filter({ landlord_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['finances-expense'],
    queryFn: () => base44.entities.FinancialEntry.filter({ landlord_id: user?.id, type: 'expense' }, '-date'),
    enabled: !!user?.id
  });

  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.FinancialEntry.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finances-expense'] }) });
  const total = entries.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="pb-24">
      <div className="bg-white border-b px-4 py-4 flex items-center gap-3">
        <Link to={createPageUrl('Finances')}><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <h1 className="text-xl font-bold text-slate-900">Utgifter</h1>
      </div>
      <div className="p-4 space-y-4">
        <Card className="bg-red-50 border-red-200"><CardContent className="p-3 text-center"><TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" /><p className="text-xs text-red-600">Totale utgifter</p><p className="font-bold text-red-700">{total.toLocaleString()} kr</p></CardContent></Card>
        <div className="space-y-2">
          {isLoading ? <p className="text-slate-500 text-center py-8">Laster...</p> : entries.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><TrendingDown className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">Ingen utgifter registrert ennå</p></CardContent></Card>
          ) : entries.map(entry => {
            const property = properties.find(p => p.id === entry.rental_unit_id);
            return (
              <Card key={entry.id}><CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-red-100">{categoryIcons[entry.category] || '📦'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><span className="font-medium text-slate-900">{t(entry.category)}</span>{property && <Badge variant="outline" className="text-xs"><Building2 className="w-2 h-2 mr-1" />{property.name}</Badge>}</div>
                    <p className="text-xs text-slate-500">{entry.date}{entry.description && ` • ${entry.description}`}</p>
                  </div>
                  <p className="font-semibold text-red-600">-{entry.amount.toLocaleString()} kr</p>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" onClick={() => deleteMutation.mutate(entry.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </CardContent></Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}