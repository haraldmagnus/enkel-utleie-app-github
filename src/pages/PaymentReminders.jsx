import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, Bell, Trash2, Edit2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function PaymentReminders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({ rental_unit_id: '', tenant_email: '', amount: '', due_day: '1', reminder_days_before: '3', send_email: true, send_push: true, start_date: '', end_date: '' });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: properties = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.filter({ landlord_id: user?.id }),
    enabled: !!user?.id
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['paymentReminders', user?.id],
    queryFn: () => base44.entities.PaymentReminder.filter({ landlord_id: user?.id }),
    enabled: !!user?.id
  });

  const resetForm = () => setFormData({ rental_unit_id: properties[0]?.id || '', tenant_email: '', amount: '', due_day: '1', reminder_days_before: '3', send_email: true, send_push: true, start_date: '', end_date: '' });

  const createMutation = useMutation({ mutationFn: (data) => base44.entities.PaymentReminder.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['paymentReminders'] }); setShowDialog(false); resetForm(); } });
  const updateMutation = useMutation({ mutationFn: ({ id, data }) => base44.entities.PaymentReminder.update(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['paymentReminders'] }); setShowDialog(false); setEditingReminder(null); resetForm(); } });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.PaymentReminder.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['paymentReminders'] }) });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData, landlord_id: user?.id, amount: parseFloat(formData.amount), due_day: parseInt(formData.due_day), reminder_days_before: parseInt(formData.reminder_days_before), active: true };
    if (editingReminder) { updateMutation.mutate({ id: editingReminder.id, data }); } else { createMutation.mutate(data); }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setFormData({ rental_unit_id: reminder.rental_unit_id, tenant_email: reminder.tenant_email || '', amount: reminder.amount?.toString() || '', due_day: reminder.due_day?.toString() || '1', reminder_days_before: reminder.reminder_days_before?.toString() || '3', send_email: reminder.send_email !== false, send_push: reminder.send_push !== false, start_date: reminder.start_date || '', end_date: reminder.end_date || '' });
    setShowDialog(true);
  };

  return (
    <div className="pb-24">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Betalingspåminnelser</h1>
            <p className="text-blue-100 text-sm">Automatiske varsler for husleie</p>
          </div>
          <Button size="sm" className="bg-white/20 hover:bg-white/30" onClick={() => { resetForm(); setEditingReminder(null); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Ny
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {reminders.length === 0 ? (
          <Card><CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-3">Ingen betalingspåminnelser satt opp</p>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowDialog(true)}><Plus className="w-4 h-4 mr-1" /> Opprett påminnelse</Button>
          </CardContent></Card>
        ) : reminders.map(reminder => {
          const property = properties.find(p => p.id === reminder.rental_unit_id);
          return (
            <Card key={reminder.id} className={!reminder.active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${reminder.active ? 'bg-green-100' : 'bg-slate-100'}`}>
                    <Bell className={`w-5 h-5 ${reminder.active ? 'text-green-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{reminder.amount?.toLocaleString()} kr</span>
                      <Badge variant={reminder.active ? 'default' : 'secondary'}>{reminder.active ? 'Aktiv' : 'Inaktiv'}</Badge>
                    </div>
                    {property && <p className="text-sm text-slate-500 flex items-center gap-1 mt-1"><Building2 className="w-3 h-3" /> {property.name}</p>}
                    <p className="text-xs text-slate-500 mt-1">Forfaller den {reminder.due_day}. hver måned • Varsel {reminder.reminder_days_before} dager før</p>
                    {reminder.tenant_email && <p className="text-xs text-slate-500">Til: {reminder.tenant_email}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Switch checked={reminder.active} onCheckedChange={() => updateMutation.mutate({ id: reminder.id, data: { active: !reminder.active } })} />
                    <div className="flex gap-1 mt-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(reminder)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => deleteMutation.mutate(reminder.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingReminder ? 'Rediger påminnelse' : 'Ny betalingspåminnelse'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Eiendom *</Label>
              <Select value={formData.rental_unit_id} onValueChange={(v) => setFormData({ ...formData, rental_unit_id: v })}>
                <SelectTrigger><SelectValue placeholder="Velg eiendom" /></SelectTrigger>
                <SelectContent>{properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Leietakers e-post</Label>
              <Input type="email" value={formData.tenant_email} onChange={(e) => setFormData({ ...formData, tenant_email: e.target.value })} placeholder="leietaker@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Beløp (kr) *</Label>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="10000" required />
              </div>
              <div>
                <Label>Forfallsdag *</Label>
                <Select value={formData.due_day} onValueChange={(v) => setFormData({ ...formData, due_day: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Array.from({ length: 28 }, (_, i) => <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}. i måneden</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Send varsel</Label>
              <Select value={formData.reminder_days_before} onValueChange={(v) => setFormData({ ...formData, reminder_days_before: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dag før</SelectItem>
                  <SelectItem value="3">3 dager før</SelectItem>
                  <SelectItem value="5">5 dager før</SelectItem>
                  <SelectItem value="7">1 uke før</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Startdato</Label><Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} /></div>
              <div><Label>Sluttdato</Label><Input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} /></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><Label>Send e-post</Label><Switch checked={formData.send_email} onCheckedChange={(v) => setFormData({ ...formData, send_email: v })} /></div>
              <div className="flex items-center justify-between"><Label>Send push-varsel</Label><Switch checked={formData.send_push} onCheckedChange={(v) => setFormData({ ...formData, send_push: v })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Avbryt</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending || !formData.rental_unit_id || !formData.amount}>{editingReminder ? 'Oppdater' : 'Opprett'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}