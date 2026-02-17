import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight,
  Wrench, Users, ClipboardCheck, Building2, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { useLanguage } from '@/components/LanguageContext';

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    event_type: 'other',
    rental_unit_id: '',
    reminder_minutes: 60
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const effectiveRole = user?.active_role || user?.user_role;
  const isLandlord = effectiveRole === 'landlord';

  const { data: properties = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: async () => {
      if (isLandlord) {
        return base44.entities.RentalUnit.filter({ landlord_id: user?.id });
      } else {
        const byTenantId = await base44.entities.RentalUnit.filter({ tenant_id: user?.id });
        if (byTenantId.length > 0) return byTenantId;
        // Fallback: match by email for tenants not yet linked by ID
        return base44.entities.RentalUnit.filter({ tenant_email: user?.email });
      }
    },
    enabled: !!user?.id
  });

  const { data: events = [] } = useQuery({
    queryKey: ['calendarEvents'],
    queryFn: async () => {
      const propertyIds = properties.map(p => p.id);
      const allEvents = await base44.entities.CalendarEvent.list('-date', 100);
      return allEvents.filter(e => propertyIds.includes(e.rental_unit_id));
    },
    enabled: properties.length > 0
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setShowAddDialog(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: selectedDate || '',
      time: '',
      event_type: 'other',
      rental_unit_id: properties[0]?.id || '',
      reminder_minutes: 60
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  // Calendar logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 
                      'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
  const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const eventTypeColors = {
    maintenance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    inspection: 'bg-blue-100 text-blue-700 border-blue-200',
    meeting: 'bg-purple-100 text-purple-700 border-purple-200',
    repair: 'bg-red-100 text-red-700 border-red-200',
    other: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const eventTypeIcons = {
    maintenance: Wrench,
    inspection: ClipboardCheck,
    meeting: Users,
    repair: Wrench,
    other: CalendarIcon
  };

  const selectedDateEvents = selectedDate ? events.filter(e => e.date === selectedDate) : [];

  return (
    <div className="pb-24">
      <div className="bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">{t('calendar')}</h1>
          <Button 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              resetForm();
              setShowAddDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" /> {t('addEvent')}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Calendar */}
        <Card>
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={prevMonth}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="font-semibold text-lg">
                {monthNames[month]} {year}
              </h2>
              <Button variant="ghost" size="icon" onClick={nextMonth}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayEvents = getEventsForDate(day);
                const isToday = dateStr === new Date().toISOString().split('T')[0];
                const isSelected = dateStr === selectedDate;
                
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-10 rounded-lg flex flex-col items-center justify-center relative transition-colors ${
                      isSelected 
                        ? 'bg-blue-600 text-white' 
                        : isToday 
                          ? 'bg-blue-100 text-blue-700'
                          : 'hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-sm">{day}</span>
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-1 flex gap-0.5">
                        {dayEvents.slice(0, 3).map((e, idx) => (
                          <div 
                            key={idx} 
                            className={`w-1 h-1 rounded-full ${
                              isSelected ? 'bg-white' : 'bg-blue-500'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        {selectedDate && (
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900">
              {new Date(selectedDate).toLocaleDateString('no', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </h3>
            {selectedDateEvents.length === 0 ? (
              <Card>
                <CardContent className="p-4 text-center text-slate-500 text-sm">
                  Ingen hendelser denne dagen
                </CardContent>
              </Card>
            ) : (
              selectedDateEvents.map(event => {
                const Icon = eventTypeIcons[event.event_type] || CalendarIcon;
                const property = properties.find(p => p.id === event.rental_unit_id);
                
                return (
                  <Card key={event.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          eventTypeColors[event.event_type]?.split(' ')[0] || 'bg-slate-100'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{event.title}</span>
                            <Badge className={eventTypeColors[event.event_type]}>
                              {t(event.event_type)}
                            </Badge>
                          </div>
                          {property && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Building2 className="w-3 h-3" /> {property.name}
                            </p>
                          )}
                          {event.time && (
                            <p className="text-sm text-slate-600 mt-1">Kl. {event.time}</p>
                          )}
                          {event.description && (
                            <p className="text-sm text-slate-500 mt-1">{event.description}</p>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-slate-400 hover:text-red-600"
                          onClick={() => deleteMutation.mutate(event.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('addEvent')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t('eventTitle')} *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="F.eks. Rørlegger kommer"
                required
              />
            </div>

            <div>
              <Label>Eiendom *</Label>
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

            <div>
              <Label>{t('eventType')}</Label>
              <Select 
                value={formData.event_type} 
                onValueChange={(v) => setFormData({ ...formData, event_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">{t('maintenance')}</SelectItem>
                  <SelectItem value="inspection">{t('inspection')}</SelectItem>
                  <SelectItem value="meeting">{t('meeting')}</SelectItem>
                  <SelectItem value="repair">{t('repair')}</SelectItem>
                  <SelectItem value="other">{t('other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('date')} *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Klokkeslett</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
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

            <div>
              <Label>Påminnelse</Label>
              <Select 
                value={formData.reminder_minutes?.toString() || '60'} 
                onValueChange={(v) => setFormData({ ...formData, reminder_minutes: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutter før</SelectItem>
                  <SelectItem value="15">15 minutter før</SelectItem>
                  <SelectItem value="60">1 time før</SelectItem>
                  <SelectItem value="1440">1 dag før</SelectItem>
                  <SelectItem value="0">Ingen påminnelse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                {t('cancel')}
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!formData.title || !formData.date || !formData.rental_unit_id || createMutation.isPending}
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