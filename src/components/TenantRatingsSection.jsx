import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, AlertCircle, Star } from 'lucide-react';

  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState(null);

    enabled: !!userId
  });

  const deleteMutation = useMutation({
    onSuccess: () => {
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

        <div className="text-center py-6 text-gray-400">
          <p>Ingen vurderinger registrert</p>
        </div>
      ) : (
        <div className="space-y-3">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                  <div className="flex gap-2">
                    <button
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
                    className="text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-2 text-sm">
                  <p className="text-gray-700">
                  </p>
                )}
                  <p className="text-gray-700">
                  </p>
                )}
                  <p className="text-gray-700">
                  </p>
                )}
                  <p className="text-gray-700">
                  </p>
                )}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1">Kommentar:</p>
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