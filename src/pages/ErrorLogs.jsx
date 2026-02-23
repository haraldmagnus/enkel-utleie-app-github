import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, Copy, ChevronDown, ChevronRight, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const levelColors = { ERROR: 'bg-red-100 text-red-700 border-red-200', WARN: 'bg-amber-100 text-amber-700 border-amber-200', INFO: 'bg-blue-100 text-blue-700 border-blue-200' };
const levelIcons = { ERROR: AlertTriangle, WARN: AlertCircle, INFO: Info };

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const Icon = levelIcons[log.level] || Info;
  const meta = (() => { try { return JSON.parse(log.meta_json || '{}'); } catch { return {}; } })();

  return (
    <div className={`border rounded-lg mb-2 ${log.level === 'ERROR' ? 'border-red-200' : log.level === 'WARN' ? 'border-amber-200' : 'border-slate-200'}`}>
      <button className="w-full text-left px-4 py-3 flex items-center gap-3" onClick={() => setExpanded(e => !e)}>
        <Icon className={`w-4 h-4 flex-shrink-0 ${log.level === 'ERROR' ? 'text-red-500' : log.level === 'WARN' ? 'text-amber-500' : 'text-blue-500'}`} />
        <Badge className={`text-xs flex-shrink-0 ${levelColors[log.level]}`}>{log.level}</Badge>
        <span className="text-xs font-mono text-slate-400 flex-shrink-0">{log.event}</span>
        <span className="text-sm text-slate-700 flex-1 truncate">{log.message}</span>
        <span className="text-xs text-slate-400 flex-shrink-0">{new Date(log.created_date).toLocaleString('no', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-400">Correlation ID:</span> <span className="font-mono font-bold">{log.correlation_id}</span></div>
            <div><span className="text-slate-400">Route:</span> <span className="font-mono">{log.route}</span></div>
            <div><span className="text-slate-400">User:</span> <span className="font-mono">{log.user_id}</span></div>
            <div><span className="text-slate-400">Env:</span> <span className="font-mono">{log.environment}</span></div>
          </div>
          {Object.keys(meta).length > 0 && <div><p className="text-xs text-slate-400 mb-1">Meta:</p><pre className="bg-slate-50 rounded p-2 text-xs overflow-auto max-h-40 text-slate-700">{JSON.stringify(meta, null, 2)}</pre></div>}
          {log.stack && <div><p className="text-xs text-slate-400 mb-1">Stack trace:</p><pre className="bg-red-50 rounded p-2 text-xs overflow-auto max-h-40 text-red-700">{log.stack}</pre></div>}
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(JSON.stringify(log, null, 2)).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} className="text-xs">
            <Copy className="w-3 h-3 mr-1" />{copied ? 'Kopiert!' : 'Kopier logg'}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ErrorLogs() {
  const queryClient = useQueryClient();
  const [correlationFilter, setCorrelationFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['errorLogs'],
    queryFn: () => base44.entities.ErrorLog.list('-created_date', 200),
    enabled: user?.role === 'admin'
  });

  const deleteOldMutation = useMutation({
    mutationFn: async () => { const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); const old = logs.filter(l => l.created_date < cutoff); await Promise.all(old.map(l => base44.entities.ErrorLog.delete(l.id))); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['errorLogs'] })
  });

  if (user?.role !== 'admin') return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-slate-500">Kun tilgjengelig for administratorer.</p></div>;

  const filtered = logs.filter(l => {
    if (correlationFilter && !l.correlation_id?.toLowerCase().includes(correlationFilter.toLowerCase())) return false;
    if (levelFilter && l.level !== levelFilter) return false;
    if (routeFilter && !l.route?.toLowerCase().includes(routeFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="pb-24 px-4 max-w-4xl mx-auto">
      <div className="py-4 border-b mb-4">
        <h1 className="text-xl font-bold text-slate-900">Feillogger</h1>
        <div className="flex gap-3 mt-2 text-sm">
          <span className="text-red-600 font-medium">{logs.filter(l => l.level === 'ERROR').length} feil</span>
          <span className="text-amber-600 font-medium">{logs.filter(l => l.level === 'WARN').length} advarsler</span>
          <span className="text-slate-400">{logs.length} totalt</span>
        </div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-40"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><Input className="pl-9 text-sm" placeholder="Søk på Correlation ID..." value={correlationFilter} onChange={e => setCorrelationFilter(e.target.value)} /></div>
        <div className="relative flex-1 min-w-32"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><Input className="pl-9 text-sm" placeholder="Rute..." value={routeFilter} onChange={e => setRouteFilter(e.target.value)} /></div>
        <div className="flex gap-1">{['', 'ERROR', 'WARN', 'INFO'].map(l => <Button key={l} size="sm" variant={levelFilter === l ? 'default' : 'outline'} onClick={() => setLevelFilter(l)} className="text-xs">{l || 'Alle'}</Button>)}</div>
        <Button size="sm" variant="outline" onClick={() => deleteOldMutation.mutate()} className="text-xs text-red-500 border-red-200"><Trash2 className="w-3 h-3 mr-1" /> Slett gamle (&gt;30d)</Button>
      </div>
      {isLoading ? <p className="text-center text-slate-400 py-8">Laster...</p> : filtered.length === 0 ? <Card><CardContent className="p-8 text-center text-slate-400">Ingen logger funnet</CardContent></Card> : <div>{filtered.map(log => <LogRow key={log.id} log={log} />)}</div>}
    </div>
  );
}