import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Trash2, RefreshCw, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export default function ErrorLogs() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['errorLogs'],
    queryFn: () => base44.entities.ErrorLog.list('-created_date', 100),
    enabled: user?.role === 'admin'
  });

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter);

  const deleteAll = async () => {
    if (!window.confirm('Slett alle logger?')) return;
    await Promise.all(logs.map(l => base44.entities.ErrorLog.delete(l.id)));
    queryClient.invalidateQueries({ queryKey: ['errorLogs'] });
  };

  const LEVEL_STYLE = {
    ERROR: { style: 'bg-red-100 text-red-700', Icon: AlertCircle },
    WARN: { style: 'bg-yellow-100 text-yellow-700', Icon: AlertTriangle },
    INFO: { style: 'bg-blue-100 text-blue-700', Icon: Info },
  };

  if (user?.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">Kun for administratorer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'ERROR', 'WARN', 'INFO'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f === 'all' ? 'Alle' : f}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={() => refetch()} className="w-9 h-9 bg-white rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          {logs.length > 0 && (
            <button onClick={deleteAll} className="w-9 h-9 bg-white rounded-xl border border-red-200 flex items-center justify-center hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <Activity className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Ingen logger</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map(log => {
            const cfg = LEVEL_STYLE[log.level] || LEVEL_STYLE.INFO;
            const { Icon } = cfg;
            return (
              <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.style.split(' ')[0]}`}>
                    <Icon className={`w-4 h-4 ${cfg.style.split(' ')[1]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.style}`}>{log.level}</span>
                      {log.event && <span className="text-xs text-gray-500 font-mono">{log.event}</span>}
                      {log.route && <span className="text-xs text-gray-400">{log.route}</span>}
                    </div>
                    <p className="text-sm text-gray-800 mb-1">{log.message}</p>
                    {log.stack && (
                      <pre className="text-xs text-gray-400 mt-1 overflow-x-auto whitespace-pre-wrap font-mono bg-gray-50 rounded-lg p-2">{log.stack}</pre>
                    )}
                    <p className="text-xs text-gray-300 mt-1">{new Date(log.created_date).toLocaleString('no')}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}