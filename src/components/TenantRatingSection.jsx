import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function TenantRatingSection({ propertyId, tenantEmail, tenantId }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const rateMutation = useMutation({
    mutationFn: async (data) => {
      const result = await base44.entities.TenantRating.create(data);
      return result;
    },
    onSuccess: () => {
      setRating(0);
      setComment('');
      setError('');
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['tenantRatings'] });
      setTimeout(() => setSubmitted(false), 3000);
    },
    onError: (err) => {
      setError(err.message || 'Feil ved lagring av vurdering');
      console.error('Rating error:', err);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    
    try {
      const user = await base44.auth.me();
      if (!tenantId || !tenantEmail) {
        setError('Leietaker-info mangler');
        return;
      }
      
      rateMutation.mutate({
        tenant_id: tenantId,
        tenant_email: tenantEmail,
        landlord_id: user.id,
        rental_unit_id: propertyId,
        payment_on_time: rating >= 4,
        property_damage: false,
        contract_breach: false,
        neighbor_complaints: 0,
        comment
      });
    } catch (err) {
      setError(err.message || 'Feil ved autentisering');
      console.error('Submit error:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="pt-3 border-t border-gray-50 space-y-3">
      <div>
        <p className="text-sm font-medium text-gray-900 mb-2">Vurder leietaker</p>
        <div className="flex gap-2 mb-3">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-6 h-6 ${
                  star <= (hoverRating || rating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>
      
      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Valgfritt: Legg til kommentar..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="2"
          />
          <button
            type="submit"
            disabled={rateMutation.isPending}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {rateMutation.isPending ? 'Lagrer...' : 'Lagre vurdering'}
          </button>
        </>
      )}

      {submitted && (
        <p className="text-xs text-green-600 text-center">✓ Vurdering lagret</p>
      )}
    </form>
  );
}