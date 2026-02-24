import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, TrendingUp, TrendingDown, AlertCircle, Wrench, ArrowRight, Calendar, Users, Wallet } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: allProperties = [], isLoading } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.list('-created_date', 100),
    enabled: !!user?.id
  });

  const properties = allProperties.filter(p =>
    p.landlord_id === user?.id || (p.landlord_ids || []).includes(user?.id)
  );

  const currentYear = String(new Date().getFullYear());

  const { data: finances = [] } = useQuery({
    queryKey: ['finances-dash'],
    queryFn: () => base44.entities.FinancialEntry.filter({ landlord_id: user?.id }, '-date', 500),
    enabled: !!user?.id
  });

  const { data: pendingTasks = [] } = useQuery({
    queryKey: ['tasks-dash'],
    queryFn: async () => {
      const all = [];
      for (const p of properties.slice(0, 10)) {
        const t = await base44.entities.MaintenanceTask.filter({ rental_unit_id: p.id, status: 'pending' }, '-created_date', 5);
        all.push(...t.map(task => ({ ...task, propertyName: p.name })));
      }
      return all.slice(0, 5);
    },
    enabled: properties.length > 0
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['events-dash'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const all = [];
      for (const p of properties.slice(0, 10)) {
        const ev = await base44.entities.CalendarEvent.filter({ rental_unit_id: p.id }, 'date', 5);
        all.push(...ev.filter(e => e.date >= today).map(e => ({ ...e, propertyName: p.name })));
      }
      return all.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    },
    enabled: properties.length > 0
  });

  const yearEntries = finances.filter(e => e.date?.startsWith(currentYear));
  const totalIncome = yearEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpenses = yearEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpenses;

  const occupied = properties.filter(p => p.status === 'occupied').length;
  const vacant = properties.filter(p => p.status === 'vacant').length;

  if (isLoading) return (
    <div className="p-4 space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="max-w-lg mx-auto p-4 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{properties.length}</p>
            <p className="text-xs text-gray-400">Eiendommer</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{occupied}</p>
            <p className="text-xs text-gray-400">Utleid</p>
          </div>
        </div>
      </div>

      {/* Finance summary card (like old version) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Økonomi {currentYear}</h2>
          <Link to={createPageUrl('Finances')} className="text-blue-600 text-sm font-medium flex items-center gap-1">
            Se alle <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Total inntekt</span>
            <span className="font-semibold text-green-600">+{totalIncome.toLocaleString('no')} kr</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Totale utgifter</span>
            <span className="font-semibold text-red-600">-{totalExpenses.toLocaleString('no')} kr</span>
          </div>
          <div className="h-px bg-gray-100 my-1" />
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-900">Netto inntekt</span>
            <span className={`font-bold text-lg ${net >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{net.toLocaleString('no')} kr</span>
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Eiendommer</h2>
          <Link to={createPageUrl('AddProperty')} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-xl px-3 py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-3 h-3" /> Legg til
          </Link>
        </div>
        {properties.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-4">Ingen eiendommer ennå</p>
            <Link to={createPageUrl('AddProperty')} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> Legg til eiendom
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {properties.map(p => (
              <Link key={p.id} to={createPageUrl(`PropertyDetail?id=${p.id}`)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.address}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                  p.status === 'occupied' ? 'bg-blue-100 text-blue-700' :
                  p.status === 'pending_invitation' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {p.status === 'occupied' ? 'Utleid' : p.status === 'pending_invitation' ? 'Invitert' : 'Ledig'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Maintenance tasks */}
      {pendingTasks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Wrench className="w-4 h-4 text-orange-500" /> Vedlikehold</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingTasks.map(task => (
              <Link key={task.id} to={createPageUrl(`PropertyDetail?id=${task.rental_unit_id}`)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <p className="text-xs text-gray-400">{task.propertyName}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-500" /> Kommende</h2>
            <Link to={createPageUrl('CalendarPage')} className="text-blue-600 text-sm font-medium flex items-center gap-1">Se alle <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingEvents.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-purple-700">{new Date(ev.date).getDate()}</span>
                  <span className="text-[9px] text-purple-500">{new Date(ev.date).toLocaleDateString('no', { month: 'short' })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                  <p className="text-xs text-gray-400">{ev.propertyName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}