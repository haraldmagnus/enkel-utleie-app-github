import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6">Siden ble ikke funnet.</p>
        <Link to={createPageUrl('Dashboard')} className="inline-flex items-center gap-2 bg-blue-600 text-white rounded-xl px-6 py-3 font-medium hover:bg-blue-700 transition-colors">
          <Home className="w-4 h-4" /> Til forsiden
        </Link>
      </div>
    </div>
  );
}