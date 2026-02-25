import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Wrench, Plus, Send } from 'lucide-react';

export default function TenantMaintenance() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' });

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: allProps = [] } = useQuery({
    queryKey: ['rentalUnits', user?.id, user?.email],
    queryFn: async () => {
      // Server-side filtering to avoid exposing all rental units in the client
      const byId = user?.id ? await base44.entities.RentalUnit.filter({ tenant_id: user.id }, '-created_date', 100) : [];
      if (byId?.length) return byId;
      const byEmail = user?.email ? await base44.entities.RentalUnit.filter({ tenant_email: user.email }, '-created_date', 100) : [];
      return byEmail || [];
    },
    enabled: !!user?.id
  });

  const myProperty = allProps.find(p =>
    p.tenant_id === user?.id || (p.tenant_ids || []).includes(user?.id) ||
    p.tenant_email === user?.email || (p.tenant_emails || []).includes(user?.email)
  );

  const { data: tasks = [] } = useQuery({
    queryKey: ['tenant-maintenance'],
    queryFn: () => base44.entities.MaintenanceTask.filter({ rental_unit_id: myProperty?.id }, '-created_date', 50),
    enabled: !!myProperty?.id
  });

  const createMutation = useMutation({
    mutationFn: async (d) => {
      const role = user?.active_role || user?.user_role;
      if (role !== 'tenant') throw new Error('Kun leietaker kan opprette vedlikeholdsforespørsel');
      return await base44.entities.MaintenanceTask.create(d);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-maintenance'] });
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'medium' });
      // Notify landlord
      if (myProperty?.landlord_id) {
        await base44.entities.Notification.create({
          user_id: myProperty.landlord_id,
          target_role: 'landlord',
          type: 'maintenance',
          title: 'Ny vedlikeholdsforespørsel', message: `${user.full_name} har meldt en feil: ${d.title}`,
          rental_unit_id: myProperty.id, read: false
        });
      }
    }
  });

  const STATUS = { pending: { label: 'Venter', style: 'bg-yellow-100 text-yellow-700' }, in_progress: { label: 'Pågår', style: 'bg-blue-100 text-blue-700' }, completed: { label: 'Fullført', style: 'bg-green-100 text-green-700' } };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="font-bold text-gray-900">Vedlikehold</h1>
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Meld feil
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Meld vedlikeholdsbehov</h3>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, rental_unit_id: myProperty?.id, landlord_id: myProperty?.landlord_id, status: 'pending' }); }} className="space-y-3">
              <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Hva er problemet? *" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Beskriv problemet mer detaljert..." rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="low">Lav prioritet</option>
                <option value="medium">Medium prioritet</option>
                <option value="high">Høy prioritet – haster</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" disabled={createMutation.isPending} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send forespørsel
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-200">Avbryt</button>
              </div>
            </form>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">Ingen saker ennå</p>
            <p className="text-gray-400 text-sm">Trykk "Meld feil" for å rapportere et problem</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => (
              <div key={task.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">{task.title}</p>
                    {task.description && <p className="text-sm text-gray-500 mb-2">{task.description}</p>}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS[task.status]?.style || 'bg-gray-100 text-gray-600'}`}>{STATUS[task.status]?.label || task.status}</span>
                      <span className="text-xs text-gray-400">{new Date(task.created_date).toLocaleDateString('no')}</span>
                    </div>
                    {task.vendor_name && (
                      <p className="text-xs text-gray-500 mt-2">👷 Håndverker: {task.vendor_name}</p>
                    )}
                  </div>
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}