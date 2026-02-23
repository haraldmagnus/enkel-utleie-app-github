import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Home, MessageSquare, FileText, Calendar, Wrench, CreditCard, ChevronRight, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function TenantDashboard() {
  const navigate = useNavigate();
  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: allProps = [] } = useQuery({
    queryKey: ['rentalUnits'],
    queryFn: () => base44.entities.RentalUnit.list('-created_date', 100),
    enabled: !!user?.id
  });

  const myProperties = allProps.filter(p =>
    p.tenant_id === user?.id ||
    (p.tenant_ids || []).includes(user?.id) ||
    p.tenant_email === user?.email ||
    (p.tenant_emails || []).includes(user?.email)
  );

  const { data: events = [] } = useQuery({
    queryKey: ['tenant-events', user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const all = [];
      for (const p of myProperties) {
        const ev = await base44.entities.CalendarEvent.filter({ rental_unit_id: p.id }, 'date', 10);
        all.push(...ev.filter(e => e.date >= today).map(e => ({ ...e, propertyName: p.name })));
      }
      return all.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    },
    enabled: myProperties.length > 0
  });

  const { data: agreements = [] } = useQuery({
    queryKey: ['tenant-agreements'],
    queryFn: async () => {
      const all = [];
      for (const p of myProperties) {
        const a = await base44.entities.RentalAgreement.filter({ rental_unit_id: p.id });
        all.push(...a.filter(ag => !['terminated','expired'].includes(ag.status)));
      }
      return all;
    },
    enabled: myProperties.length > 0
  });

  const activeAgreement = agreements[0];

  const property = myProperties[0];

  if (!property) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <Home className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-700 mb-1">Ingen bolig funnet</p>
          <p className="text-gray-400 text-sm">Be utleieren din om å invitere deg til Enkel Utleie.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Property card */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-blue-200 text-xs font-medium mb-1">DIN BOLIG</p>
        <h2 className="text-xl font-bold mb-0.5">{property.name}</h2>
        <p className="text-blue-200 text-sm">{property.address}</p>
        {property.monthly_rent && (
          <div className="mt-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-300" />
            <span className="text-white font-semibold">{property.monthly_rent.toLocaleString()} kr/mnd</span>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={createPageUrl(`Chat?propertyId=${property.id}`)} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Meldinger</p>
            <p className="text-xs text-gray-400">Chat med utleier</p>
          </div>
        </Link>

        <Link to={createPageUrl('CalendarPage')} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Kalender</p>
            <p className="text-xs text-gray-400">Hendelser</p>
          </div>
        </Link>

        {activeAgreement && (
          <Link to={createPageUrl(`SignAgreement?id=${activeAgreement.id}`)} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-all">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Leieavtale</p>
              <p className={`text-xs ${activeAgreement.status === 'pending_tenant' ? 'text-yellow-600 font-medium' : 'text-gray-400'}`}>
                {activeAgreement.status === 'active' ? 'Aktiv' : activeAgreement.status === 'pending_tenant' ? '⚠️ Signer nå' : activeAgreement.status}
              </p>
            </div>
          </Link>
        )}

        <Link to={createPageUrl('TenantMaintenance')} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Wrench className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Vedlikehold</p>
            <p className="text-xs text-gray-400">Meld feil</p>
          </div>
        </Link>
      </div>

      {/* Lease info */}
      {activeAgreement && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-green-500" /> Leiedetaljer</h3>
          <div className="space-y-2">
            {[
              activeAgreement.start_date && { label: 'Startdato', value: activeAgreement.start_date },
              activeAgreement.end_date && { label: 'Sluttdato', value: activeAgreement.end_date },
              activeAgreement.monthly_rent && { label: 'Månedlig leie', value: `${activeAgreement.monthly_rent.toLocaleString()} kr` },
              activeAgreement.deposit && { label: 'Depositum', value: `${activeAgreement.deposit.toLocaleString()} kr` },
              activeAgreement.rent_due_day && { label: 'Forfallsdag', value: `${activeAgreement.rent_due_day}. i måneden` },
              activeAgreement.rent_account && { label: 'Konto for leie', value: activeAgreement.rent_account },
            ].filter(Boolean).map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      {events.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-500" /> Kommende</h3>
            <Link to={createPageUrl('CalendarPage')} className="text-blue-600 text-sm font-medium flex items-center gap-1">Se alle <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="divide-y divide-gray-50">
            {events.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 bg-purple-100 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-purple-700">{new Date(ev.date).getDate()}</span>
                  <span className="text-[9px] text-purple-500">{new Date(ev.date).toLocaleDateString('no', { month: 'short' })}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                  {ev.time && <p className="text-xs text-gray-400">{ev.time}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}