import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, ArrowLeft, Copy } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function generateCorrelationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}

class NotificationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.correlationId = generateCorrelationId();
    this.state = { hasError: false, error: null, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ERROR][${this.correlationId}][COMPONENT_CRASH]`, error, errorInfo);

    // Persist the error
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      base44.entities.ErrorLog.create({
        correlation_id: this.correlationId,
        level: 'ERROR',
        event: 'COMPONENT_CRASH',
        route: window.location.pathname,
        message: error?.message || 'Unknown component crash',
        stack: error?.stack || null,
        meta_json: JSON.stringify({
          componentStack: errorInfo?.componentStack?.slice(0, 800),
          route: window.location.pathname,
          search: window.location.search,
        }),
        user_id: 'unknown',
        environment: window.location.hostname === 'localhost' ? 'dev' : 'prod',
        browser_info: navigator.userAgent.slice(0, 120),
        expires_at: expiresAt
      });
    } catch (e) {
      console.warn('Failed to persist crash log', e);
    }
  }

  handleCopy = () => {
    const info = JSON.stringify({
      reportId: this.correlationId,
      error: this.state.error?.message,
      route: window.location.pathname,
      timestamp: new Date().toISOString(),
      browser: navigator.userAgent.slice(0, 100),
      environment: window.location.hostname === 'localhost' ? 'dev' : 'prod',
    }, null, 2);
    navigator.clipboard.writeText(info).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Noe gikk galt</h1>
            <p className="text-slate-500 text-sm mb-2">
              Vi beklager, det oppstod en uventet feil på varsel-siden.
            </p>
            <div className="bg-slate-100 rounded-lg px-3 py-2 mb-6 text-xs text-slate-500 font-mono">
              Rapport-ID: <span className="font-bold text-slate-700">{this.correlationId}</span>
            </div>
            <div className="space-y-3">
              <Button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-700">
                <RefreshCw className="w-4 h-4 mr-2" /> Prøv igjen
              </Button>
              <Button variant="outline" onClick={() => window.history.back()} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" /> Gå tilbake
              </Button>
              <Button variant="ghost" onClick={this.handleCopy} className="w-full text-slate-500">
                <Copy className="w-4 h-4 mr-2" />
                {this.state.copied ? 'Kopiert!' : 'Kopier diagnostikk-info'}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default NotificationErrorBoundary;