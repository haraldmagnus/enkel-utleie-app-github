import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Home, Check, X, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function Invite() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const [status, setStatus] = useState('loading'); // loading | success | error | already
  const [message, setMessage] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  useEffect(() => {
    if (!user || !token) return;
    processInvitation();
  }, [user, token]);

  const processInvitation = async () => {
    const invitations = await base44.entities.TenantInvitation.filter({ token });
    const invitation = invitations[0];

    if (!invitation) { setStatus('error'); setMessage('Ugyldig invitasjonslenke.'); return; }
    if (invitation.status === 'accepted') { setStatus('already'); setMessage('Denne invitasjonen er allerede akseptert.'); return; }
    if (invitation.status === 'expired' || new Date(invitation.expires_at) < new Date()) {
      setStatus('error'); setMessage('Invitasjonen har utløpt. Be utleieren om å sende en ny.'); return;
    }

    await base44.entities.TenantInvitation.update(invitation.id, {
      status: 'accepted', accepted_by_user_id: user.id, accepted_at: new Date().toISOString()
    });

    const property = await base44.entities.RentalUnit.filter({ id: invitation.rental_unit_id }).then(r => r[0]);
    if (property) {
      const existingTenantIds = property.tenant_ids || [];
      const existingEmails = property.tenant_emails || [];
      await base44.entities.RentalUnit.update(property.id, {
        tenant_id: user.id,
        tenant_ids: [...new Set([...existingTenantIds, user.id])],
        tenant_email: user.email,
        tenant_emails: [...new Set([...existingEmails, user.email])],
        status: 'occupied'
      });
    }

    await base44.auth.updateMe({ active_role: 'tenant', user_role: 'tenant' });
    setStatus('success');
    setTimeout(() => navigate(createPageUrl('TenantDashboard'), { replace: true }), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Home className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Enkel Utleie</h1>

        {status === 'loading' && (
          <>
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto my-4" />
            <p className="text-gray-500">Behandler invitasjon...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto my-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="font-semibold text-green-700 mb-1">Velkommen!</p>
            <p className="text-gray-500 text-sm">Du er nå lagt til som leietaker. Sender deg til dashbordet...</p>
          </>
        )}
        {(status === 'error' || status === 'already') && (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto my-4">
              <X className="w-6 h-6 text-red-600" />
            </div>
            <p className="font-semibold text-red-700 mb-1">{status === 'already' ? 'Allerede akseptert' : 'Feil'}</p>
            <p className="text-gray-500 text-sm mb-5">{message}</p>
            <button onClick={() => navigate(createPageUrl('TenantDashboard'))} className="bg-blue-600 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors">
              Gå til min side
            </button>
          </>
        )}
      </div>
    </div>
  );
}