import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users } from 'lucide-react';

export default function RentSplitEditor({ splits, onChange, totalAmount }) {
  const totalPercentage = splits.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);
  const isValid = Math.abs(totalPercentage - 100) < 0.01;

  const handleChange = (index, value) => {
    const updated = splits.map((s, i) => {
      if (i === index) {
        const pct = Math.min(100, Math.max(0, Number(value) || 0));
        return { ...s, percentage: pct, amount: totalAmount ? Math.round(totalAmount * pct / 100) : 0 };
      }
      return s;
    });
    onChange(updated);
  };

  if (!splits || splits.length === 0) return null;

  return (
    <div className="space-y-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
        <Users className="w-4 h-4" />
        <span>Splitt husleie mellom leietakere</span>
      </div>

      {splits.map((split, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-700 truncate">
              {split.user_name || split.user_email || `Leietaker ${i + 1}`}
            </p>
          </div>
          <div className="flex items-center gap-1 w-28">
            <Input
              type="number"
              min="0"
              max="100"
              value={split.percentage}
              onChange={(e) => handleChange(i, e.target.value)}
              className="h-8 text-sm"
            />
            <span className="text-sm text-slate-500">%</span>
          </div>
          {totalAmount > 0 && (
            <span className="text-xs text-slate-500 w-20 text-right">
              {Math.round(totalAmount * (split.percentage || 0) / 100).toLocaleString()} kr
            </span>
          )}
        </div>
      ))}

      <div className={`text-xs font-medium text-right ${isValid ? 'text-green-600' : 'text-red-500'}`}>
        Total: {totalPercentage}% {!isValid && '(må være 100%)'}
      </div>
    </div>
  );
}