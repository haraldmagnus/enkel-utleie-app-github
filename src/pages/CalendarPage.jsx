import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Trash2, Building2, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useLanguage } from '@/components/LanguageContext';

const eventTypeColors = {
  maintenance: 'bg-yellow-100 text-yellow-700',
  inspection: 'bg-blue-100 text-blue-700',
  meeting: 'bg-purple-100 text-purple-700',
  repair: 'bg-red-100 text-red-700',
  other: 'bg-slate-100 text-slate-700'
};

const eventTypeLabels = {
  maintenance: 'Vedlikehold',
  inspection: 'Befaring',
  meeting: 'Møte',
  repair: 'Reparasjon',
  other: 'Annet'
};

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [formData, setFormData] = useState({
    title: '', description: '', date: new Date().toISOString().split('T')[0],
    time: '', event_type: 'other', rental_unit_id: '', reminder_minutes: 60
  });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const roleOverride = typeof window !== 'undefined' ? localStorage.getItem('user_role_override') : null;
  const effectiveRole = user?.active_role || user?.user_role || roleOverride;
  const isLandlord = effectiveRole === 'landlord';

  const { data: allProperties = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.list('-created_date', 100),
    enabled: !!user?.id
  });

  const myProperties = allProperties.filter(p => {
    if (isLandlord) return p.landlord_id === user?.id || (p.landlord_ids || []).includes(user?.id);
    return p.tenant_id === user?.id || (p.tenant_ids || []).includes(user?.id) ||
           p.tenant_email === user?.email || (p.tenant_emails || []).includes(user?.email);
  });

  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents', user?.id],
    queryFn: async () => {
      const allEvents = [];
      for (const p of myProperties) {
        const pEvents = await base44.entities.CalendarEvent.filter({ rental_unit_id: p.id }, 'date', 100);
        allEvents.push(...pEvents);
      }
      return allEvents.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: myProperties.length > 0
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['calendarEvents'] }); setShowDialog(false); resetForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendarEvents'] })
  });

  const resetForm = () => setFormData({ title: '', description: '', date: new Date().toISOString().split('T')[0], time: '', event_type: 'other', rental_unit_id: myProperties[0]?.id || '', reminder_minutes: 60 });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({ ...formData, reminder_minutes: Number(formData.reminder_minutes) });
  };

  const filteredEvents = events.filter(e => e.date?.startsWith(selectedMonth));
  const upcomingEvents = events.filter(e => e.date >= new Date().toISOString().split('T')[0]);

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i - 1);
    return d.toISOString().slice(0, 7);
  });

  return (
    <div className="pb-24">
      <div className="px-4 pt-3 flex justify-between items-center">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('no', { month: 'long', year: 'numeric' })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isLandlord && (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { resetForm(); setShowDialog(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Ny
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* This month's events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(selectedMonth + '-01').toLocaleDateString('no', { month: 'long', year: 'numeric' })}
              {filteredEvents.length > 0 && <Badge variant="outline">{filteredEvents.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Ingen hendelser denne måneden</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map(event => {
                  const property = myProperties.find(p => p.id === event.rental_unit_id);
                  return (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-purple-600">{new Date(event.date).getDate()}</span>
                        <span className="text-[10px] text-purple-500">{new Date(event.date).toLocaleDateString('no', { month: 'short' })}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm text-slate-900">{event.title}</p>
                          <Badge className={eventTypeColors[event.event_type] || 'bg-slate-100 text-slate-700'}>
                            {eventTypeLabels[event.event_type] || event.event_type}
                          </Badge>
                        </div>
                        {event.time && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {event.time}</p>}
                        {property && <p className="text-xs text-slate-500 flex items-center gap-1"><Building2 className="w-3 h-3" /> {property.name}</p>}
                        {event.description && <p className="text-xs text-slate-500 mt-1">{event.description}</p>}
                      </div>
                      {isLandlord && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 flex-shrink-0" onClick={() => deleteMutation.mutate(event.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        {upcomingEvents.length > 0 && !filteredEvents.some(e => e.date >= new Date().toISOString().split('T')[0]) && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Kommende hendelser</CardTitle></CardHeader>
            <CardContent className="pt-0 space-y-2">
              {upcomingEvents.slice(0, 5).map(event => (
                <div key={event.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <span className="text-xs font-bold text-purple-600 w-6 text-center">{new Date(event.date).getDate()}</span>
                  <span className="text-xs text-slate-500 w-10">{new Date(event.date).toLocaleDateString('no', { month: 'short' })}</span>
                  <p className="text-sm text-slate-700 flex-1">{event.title}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ny kalenderhendelse</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Tittel *</Label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="F.eks. Befaring" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Dato *</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
              <div><Label>Tid</Label><Input type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} /></div>
            </div>
            <div><Label>Type</Label>
              <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(eventTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Eiendom</Label>
              <Select value={formData.rental_unit_id} onValueChange={(v) => setFormData({ ...formData, rental_unit_id: v })}>
                <SelectTrigger><SelectValue placeholder="Velg eiendom" /></SelectTrigger>
                <SelectContent>{myProperties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Beskrivelse</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Avbryt</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={!formData.title || !formData.date || createMutation.isPending}>Opprett</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}