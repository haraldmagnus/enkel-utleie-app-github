import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, Trash2, Building2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

const EVENT_TYPES = { maintenance: { label: 'Vedlikehold', style: 'bg-yellow-100 text-yellow-700' }, inspection: { label: 'Befaring', style: 'bg-blue-100 text-blue-700' }, meeting: { label: 'Møte', style: 'bg-purple-100 text-purple-700' }, repair: { label: 'Reparasjon', style: 'bg-red-100 text-red-700' }, other: { label: 'Annet', style: 'bg-gray-100 text-gray-600' } };

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [form, setForm] = useState({ title: '', date: new Date().toISOString().split('T')[0], time: '', event_type: 'other', description: '', rental_unit_id: '' });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const role = user?.active_role || user?.user_role;
  const isLandlord = role === 'landlord';

  const { data: allProps = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.list('-created_date', 100),
    enabled: !!user?.id
  });

  const myProps = allProps.filter(p => isLandlord
    ? (p.landlord_id === user?.id || (p.landlord_ids || []).includes(user?.id))
    : (p.tenant_id === user?.id || (p.tenant_ids || []).includes(user?.id) || p.tenant_email === user?.email)
  );

  const { data: events = [] } = useQuery({
    queryKey: ['events', user?.id],
    queryFn: async () => {
      const all = [];
      for (const p of myProps) {
        const ev = await base44.entities.CalendarEvent.filter({ rental_unit_id: p.id }, 'date', 200);
        all.push(...ev.map(e => ({ ...e, propertyName: p.name })));
      }
      return all.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: myProps.length > 0
  });

  const createMutation = useMutation({
    mutationFn: async (d) => {
      const event = await base44.entities.CalendarEvent.create(d);
      
      // Send notification to relevant users
      const propertyData = myProps.find(p => p.id === d.rental_unit_id);
      if (propertyData) {
        const notificationRecipients = [];
        if (!isLandlord && propertyData.landlord_ids?.length > 0) {
          notificationRecipients.push(...propertyData.landlord_ids);
        } else if (!isLandlord && propertyData.landlord_id) {
          notificationRecipients.push(propertyData.landlord_id);
        } else if (isLandlord && propertyData.tenant_ids?.length > 0) {
          notificationRecipients.push(...propertyData.tenant_ids);
        } else if (isLandlord && propertyData.tenant_id) {
          notificationRecipients.push(propertyData.tenant_id);
        }
        
        for (const recipientId of notificationRecipients) {
          await base44.entities.Notification.create({
            user_id: recipientId,
            type: 'calendar_event',
            title: d.title,
            message: `Ny hendelse lagt til: ${d.title}`,
            rental_unit_id: d.rental_unit_id,
            related_id: event.id,
            read: false
          });
        }
      }
      return event;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['events'] }); setShowForm(false); setForm({ title: '', date: new Date().toISOString().split('T')[0], time: '', event_type: 'other', description: '', rental_unit_id: myProps[0]?.id || '' }); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] })
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const selectedDayStr = selectedDay ? `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}` : null;
  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const dayNames = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
  const calStart = firstDay === 0 ? 6 : firstDay - 1;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Month nav */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="font-bold text-gray-900">{new Date(year, month).toLocaleDateString('no', { month: 'long', year: 'numeric' })}</h2>
          <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-50">
          {dayNames.map(d => <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>)}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 p-2 gap-1">
          {Array.from({ length: calStart }).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = getEventsForDay(day);
            const isToday = dateStr === today;
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-medium transition-colors relative ${isSelected ? 'bg-blue-600 text-white' : isToday ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                {day}
                {dayEvents.length > 0 && (
                  <div className={`absolute bottom-1 flex gap-0.5 ${isSelected ? '' : ''}`}>
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`} />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      {selectedDay && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">{new Date(selectedDayStr).toLocaleDateString('no', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            {isLandlord && (
              <button onClick={() => { setForm({...form, date: selectedDayStr, rental_unit_id: myProps[0]?.id || ''}); setShowForm(true); }} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors">
                <Plus className="w-3 h-3" /> Legg til
              </button>
            )}
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-gray-400 text-sm p-4 text-center">Ingen hendelser denne dagen</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {selectedEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm text-gray-900">{ev.title}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_TYPES[ev.event_type]?.style || 'bg-gray-100 text-gray-600'}`}>{EVENT_TYPES[ev.event_type]?.label || ev.event_type}</span>
                    </div>
                    {ev.time && <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.time}</p>}
                    {ev.propertyName && <p className="text-xs text-gray-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> {ev.propertyName}</p>}
                    {ev.description && <p className="text-xs text-gray-500 mt-1">{ev.description}</p>}
                  </div>
                  {isLandlord && (
                    <button onClick={() => deleteMutation.mutate(ev.id)} className="text-gray-300 hover:text-red-500 transition-colors mt-0.5"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Ny hendelse</h3>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Tittel *" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(EVENT_TYPES).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
              </select>
              <select value={form.rental_unit_id} onChange={e => setForm({...form, rental_unit_id: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {myProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Beskrivelse" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">Lagre</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors">Avbryt</button>
            </div>
          </form>
        </div>
      )}

      {/* Upcoming events */}
      {!selectedDay && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900">Kommende hendelser</h3>
            {isLandlord && (
              <button onClick={() => { setForm({...form, date: today, rental_unit_id: myProps[0]?.id || ''}); setShowForm(true); }} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors">
                <Plus className="w-3 h-3" /> Ny
              </button>
            )}
          </div>
          {events.filter(e => e.date >= today).slice(0, 10).length === 0 ? (
            <div className="p-8 text-center"><Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">Ingen kommende hendelser</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {events.filter(e => e.date >= today).slice(0, 10).map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-purple-700">{new Date(ev.date).getDate()}</span>
                    <span className="text-[9px] text-purple-500">{new Date(ev.date).toLocaleDateString('no', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{ev.title}</p>
                    {ev.time && <p className="text-xs text-gray-500">{ev.time}</p>}
                    {ev.propertyName && <p className="text-xs text-gray-400">{ev.propertyName}</p>}
                  </div>
                  {isLandlord && (
                    <button onClick={() => deleteMutation.mutate(ev.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}