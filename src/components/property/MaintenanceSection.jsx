import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wrench, Trash2, Check, Calendar } from 'lucide-react';

const STATUS = { pending: { label: 'Venter', style: 'bg-yellow-100 text-yellow-700' }, in_progress: { label: 'Pågår', style: 'bg-blue-100 text-blue-700' }, completed: { label: 'Fullført', style: 'bg-green-100 text-green-700' }, cancelled: { label: 'Kansellert', style: 'bg-gray-100 text-gray-600' } };
const PRIORITY = { low: { label: 'Lav', style: 'bg-gray-100 text-gray-600' }, medium: { label: 'Medium', style: 'bg-yellow-100 text-yellow-700' }, high: { label: 'Høy', style: 'bg-red-100 text-red-700' } };

export default function MaintenanceSection({ propertyId, landlordId, property }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', vendor_name: '', vendor_phone: '', estimated_cost: '', due_date: '' });

  const { data: tasks = [] } = useQuery({
    queryKey: ['maintenance', propertyId],
    queryFn: () => base44.entities.MaintenanceTask.filter({ rental_unit_id: propertyId }, '-created_date', 50),
    enabled: !!propertyId
  });

  const createMutation = useMutation({
    mutationFn: async (d) => {
      const task = await base44.entities.MaintenanceTask.create(d);

      // Create calendar event if due_date is set
      if (d.due_date) {
        await base44.entities.CalendarEvent.create({
          rental_unit_id: propertyId,
          title: `🔧 ${d.title}`,
          description: d.description || '',
          date: d.due_date,
          event_type: 'maintenance',
        });
      }

      // Notify tenant if linked
      const tenantId = property?.tenant_id;
      if (tenantId) {
        await base44.entities.Notification.create({
          user_id: tenantId,
          target_role: 'tenant',
          type: 'maintenance',
          title: 'Ny vedlikeholdsoppgave',
          message: `${d.title}${d.due_date ? ` – planlagt ${new Date(d.due_date).toLocaleDateString('nb-NO')}` : ''}`,
          rental_unit_id: propertyId,
          related_id: task.id,
          read: false,
        });
      }

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'medium', vendor_name: '', vendor_phone: '', estimated_cost: '', due_date: '' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data, task }) => {
      const updated = await base44.entities.MaintenanceTask.update(id, data);

      const wasCompleted = task.status !== 'completed' && data.status === 'completed';
      const wasUncompleted = task.status === 'completed' && data.status !== 'completed';

      if (wasCompleted && (task.actual_cost || task.estimated_cost)) {
        // Create a financial expense entry
        const cost = task.actual_cost || task.estimated_cost;
        const entry = await base44.entities.FinancialEntry.create({
          rental_unit_id: propertyId,
          landlord_id: task.landlord_id,
          type: 'expense',
          category: 'maintenance',
          amount: cost,
          description: task.title + (task.vendor_name ? ` (${task.vendor_name})` : ''),
          date: data.completed_date || new Date().toISOString().split('T')[0],
        });
        // Store the financial entry id on the task so we can delete it later
        await base44.entities.MaintenanceTask.update(id, { financial_entry_id: entry.id });
      }

      if (wasUncompleted && task.financial_entry_id) {
        await base44.entities.FinancialEntry.delete(task.financial_entry_id);
        await base44.entities.MaintenanceTask.update(id, { financial_entry_id: null });
      }

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['financialEntries', propertyId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaintenanceTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['maintenance', propertyId] })
  });

  const submit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      ...form,
      rental_unit_id: propertyId,
      landlord_id: landlordId,
      status: 'pending',
      estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
      due_date: form.due_date || null,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Vedlikeholdslogg</h3>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors">
          <Plus className="w-3 h-3" /> Ny oppgave
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <form onSubmit={submit} className="space-y-3">
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Tittel *" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Beskrivelse" rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            <div className="grid grid-cols-2 gap-3">
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Lav prioritet</option>
                <option value="medium">Medium prioritet</option>
                <option value="high">Høy prioritet</option>
              </select>
              <input type="number" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost: e.target.value})} placeholder="Estimert kostnad (kr)" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={form.vendor_name} onChange={e => setForm({...form, vendor_name: e.target.value})} placeholder="Leverandør/håndverker" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input value={form.vendor_phone} onChange={e => setForm({...form, vendor_phone: e.target.value})} placeholder="Telefon" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Dato (vises i kalender)</label>
              <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">Lagre</button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors">Avbryt</button>
            </div>
          </form>
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <Wrench className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Ingen vedlikeholdsoppgaver</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${task.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  {task.status === 'completed' ? <Check className="w-4 h-4 text-green-600" /> : <Wrench className="w-4 h-4 text-yellow-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-gray-900 text-sm">{task.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS[task.status]?.style}`}>{STATUS[task.status]?.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY[task.priority]?.style}`}>{PRIORITY[task.priority]?.label}</span>
                  </div>
                  {task.description && <p className="text-xs text-gray-500 mb-1">{task.description}</p>}
                  {task.vendor_name && <p className="text-xs text-gray-500">👷 {task.vendor_name} {task.vendor_phone && `· ${task.vendor_phone}`}</p>}
                  {task.estimated_cost && <p className="text-xs text-gray-500">Estimert: {task.estimated_cost.toLocaleString()} kr</p>}
                  {task.due_date && (
                    <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" /> {new Date(task.due_date).toLocaleDateString('nb-NO')}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <select value={task.status} onChange={e => updateMutation.mutate({ id: task.id, task, data: { status: e.target.value, ...(e.target.value === 'completed' ? { completed_date: new Date().toISOString().split('T')[0] } : {}) } })} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                    <option value="pending">Venter</option>
                    <option value="in_progress">Pågår</option>
                    <option value="completed">Fullført</option>
                    <option value="cancelled">Kansellert</option>
                  </select>
                  <button onClick={() => deleteMutation.mutate(task.id)} className="text-xs text-red-400 hover:text-red-600 py-1 transition-colors"><Trash2 className="w-3.5 h-3.5 mx-auto" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}