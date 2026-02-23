import { useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Generate a short unique correlation ID
function generateCorrelationId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
}

// Sanitize metadata - remove secrets, passwords, tokens
function sanitizeMeta(meta) {
  if (!meta) return {};
  const REDACTED = '[REDACTED]';
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'authorization', 'cookie', 'ssn'];
  const sanitized = {};
  for (const [k, v] of Object.entries(meta)) {
    const lk = k.toLowerCase();
    if (sensitiveKeys.some(s => lk.includes(s))) {
      sanitized[k] = REDACTED;
    } else if (typeof v === 'string' && v.length > 500) {
      sanitized[k] = v.slice(0, 500) + '…[truncated]';
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

function getBrowserInfo() {
  try {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
    return `${isMobile ? 'Mobile' : 'Desktop'} | ${ua.slice(0, 120)}`;
  } catch {
    return 'unknown';
  }
}

function getEnvironment() {
  try {
    return window.location.hostname === 'localhost' ? 'dev' : 'prod';
  } catch {
    return 'unknown';
  }
}

export function useLogger({ route, userId } = {}) {
  const correlationId = useRef(generateCorrelationId());
  const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';

  const persist = useCallback(async (level, event, message, extra = {}) => {
    // Always persist ERROR and WARN. Persist INFO only in debug mode.
    if (level === 'INFO' && !debugMode) return;

    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await base44.entities.ErrorLog.create({
        correlation_id: correlationId.current,
        level,
        event,
        route: route || window.location.pathname,
        message,
        stack: extra.stack || null,
        meta_json: JSON.stringify(sanitizeMeta(extra.meta || {})),
        user_id: userId || 'anonymous',
        environment: getEnvironment(),
        browser_info: getBrowserInfo(),
        app_version: import.meta.env?.VITE_APP_VERSION || 'unknown',
        expires_at: expiresAt
      });
    } catch (e) {
      // Never let logging break the app
      console.warn('[Logger] Failed to persist log:', e);
    }
  }, [route, userId, debugMode]);

  const log = useCallback((level, event, message, extra = {}) => {
    const prefix = `[${level}][${correlationId.current}][${event}]`;
    if (level === 'ERROR') {
      console.error(prefix, message, extra);
    } else if (level === 'WARN') {
      console.warn(prefix, message, extra);
    } else if (debugMode) {
      console.log(prefix, message, extra);
    }
    persist(level, event, message, extra);
  }, [debugMode, persist]);

  const info = useCallback((event, message, meta = {}) => log('INFO', event, message, { meta }), [log]);
  const warn = useCallback((event, message, meta = {}) => log('WARN', event, message, { meta }), [log]);
  const error = useCallback((event, message, err = null, meta = {}) => log('ERROR', event, message, {
    stack: err?.stack || null,
    meta: { ...meta, errorMessage: err?.message }
  }), [log]);

  // Wrap an async API call with start/success/fail logging
  const loggedCall = useCallback(async (event, fn, meta = {}) => {
    const start = Date.now();
    info(`${event}_START`, `Starting ${event}`, meta);
    try {
      const result = await fn();
      info(`${event}_SUCCESS`, `${event} completed`, { ...meta, durationMs: Date.now() - start });
      return result;
    } catch (err) {
      error(`${event}_FAILED`, `${event} failed`, err, { ...meta, durationMs: Date.now() - start });
      throw err;
    }
  }, [info, error]);

  return {
    correlationId: correlationId.current,
    info,
    warn,
    error,
    loggedCall,
    debugMode
  };
}