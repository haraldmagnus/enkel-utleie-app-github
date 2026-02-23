import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, AlertCircle, Star } from 'lucide-react';

export default function TenantRatingsSection({ userId }) {
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);

  const { data: ratings = [] } = useQuery({
    queryKey: ['tenantRatings', userId],
    queryFn: () => base44.entities.TenantRating.filter({ tenant_id: userId }, '-created_date', 100),
    enabled: !!userId
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TenantRating.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenantRatings', userId] });
      setDeleteId(null);
    }
  });

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Din vurderingsprofil</p>
            <p className="text-blue-800">Utleiere kan legge til vurderinger av dine leieforhold. Du har rett til å se og slette alle data om deg selv.</p>
          </div>
        </div>
      </div>

      {ratings.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p>Ingen vurderinger registrert</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ratings.map(rating => (
            <div key={rating.id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Fra: Eiendommen #{rating.rental_unit_id.slice(0, 8)}</p>
                  <p className="text-xs text-gray-400">{new Date(rating.created_date).toLocaleDateString('no')}</p>
                </div>
                {deleteId === rating.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteMutation.mutate(rating.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      Slett
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Avbryt
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteId(rating.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {rating.payment_on_time !== undefined && (
                  <p className="text-gray-700">
                    <span className="font-medium">Husleie i tide:</span> {rating.payment_on_time ? 'Ja ✓' : 'Nei ✗'}
                  </p>
                )}
                {rating.property_damage !== undefined && (
                  <p className="text-gray-700">
                    <span className="font-medium">Skader utover normal slitasje:</span> {rating.property_damage ? 'Ja ✗' : 'Nei ✓'}
                  </p>
                )}
                {rating.contract_breach !== undefined && (
                  <p className="text-gray-700">
                    <span className="font-medium">Kontraktbrudd:</span> {rating.contract_breach ? 'Ja ✗' : 'Nei ✓'}
                    {rating.breach_type && <span className="text-gray-500"> ({rating.breach_type})</span>}
                  </p>
                )}
                {rating.neighbor_complaints > 0 && (
                  <p className="text-gray-700">
                    <span className="font-medium">Klager fra naboer:</span> {rating.neighbor_complaints}
                  </p>
                )}
                {rating.comment && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Kommentar:</p>
                    <p className="text-gray-700 text-sm">{rating.comment}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}