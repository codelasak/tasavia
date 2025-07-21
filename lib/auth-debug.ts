// Authentication debugging and monitoring utility
// Provides structured logging and monitoring for auth flows

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogCategory = 'auth' | 'profile' | 'reset' | 'login' | 'session' | 'debug';

interface AuthLogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  event: string;
  data?: any;
  userId?: string;
  sessionId?: string;
}

class AuthDebugger {
  private enabled: boolean;
  private logs: AuthLogEntry[] = [];
  private maxLogs = 1000;

  constructor() {
    // Enable debug mode in development or when explicitly enabled
    this.enabled = process.env.NODE_ENV === 'development' || 
                   typeof window !== 'undefined' && window.localStorage?.getItem('auth-debug') === 'true';
  }

  private log(level: LogLevel, category: LogCategory, event: string, data?: any, userId?: string, sessionId?: string) {
    if (!this.enabled) return;

    const entry: AuthLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      event,
      data,
      userId,
      sessionId
    };

    // Add to in-memory logs
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }

    // Console output with formatting
    const prefix = `[AUTH-${category.toUpperCase()}]`;
    const message = `${prefix} ${event}`;
    
    switch (level) {
      case 'debug':
        console.debug(message, data || '');
        break;
      case 'info':
        console.info(message, data || '');
        break;
      case 'warn':
        console.warn(message, data || '');
        break;
      case 'error':
        console.error(message, data || '');
        break;
    }
  }

  // Public logging methods
  debug(category: LogCategory, event: string, data?: any, userId?: string, sessionId?: string) {
    this.log('debug', category, event, data, userId, sessionId);
  }

  info(category: LogCategory, event: string, data?: any, userId?: string, sessionId?: string) {
    this.log('info', category, event, data, userId, sessionId);
  }

  warn(category: LogCategory, event: string, data?: any, userId?: string, sessionId?: string) {
    this.log('warn', category, event, data, userId, sessionId);
  }

  error(category: LogCategory, event: string, data?: any, userId?: string, sessionId?: string) {
    this.log('error', category, event, data, userId, sessionId);
  }

  // Performance monitoring
  startTimer(category: LogCategory, operation: string): string {
    const timerId = `${category}-${operation}-${Date.now()}`;
    if (this.enabled) {
      console.time(timerId);
    }
    return timerId;
  }

  endTimer(timerId: string, event?: string) {
    if (this.enabled) {
      console.timeEnd(timerId);
      if (event) {
        console.info(`[AUTH-PERF] ${event} completed`);
      }
    }
  }

  // Auth state tracking
  trackAuthState(event: string, session: any, user: any) {
    this.info('auth', `State Change: ${event}`, {
      hasSession: !!session,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    }, user?.id, session?.access_token?.substring(0, 10));
  }

  trackApiCall(endpoint: string, status: number, duration?: number, userId?: string) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this.log(level, 'profile', `API Call: ${endpoint}`, {
      status,
      duration: duration ? `${duration}ms` : undefined
    }, userId);
  }

  trackLoginAttempt(email: string, success: boolean, attempt: number, error?: string) {
    const level = success ? 'info' : 'warn';
    this.log(level, 'login', `Login Attempt #${attempt}`, {
      email: email.substring(0, 5) + '*****', // Partially mask email
      success,
      error
    });
  }

  trackPasswordReset(step: string, success: boolean, method?: string, error?: string) {
    const level = success ? 'info' : 'error';
    this.log(level, 'reset', `Password Reset: ${step}`, {
      method,
      success,
      error
    });
  }

  // Utility methods
  enable() {
    this.enabled = true;
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('auth-debug', 'true');
    }
    this.info('debug', 'Auth debugging enabled');
  }

  disable() {
    this.enabled = false;
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem('auth-debug');
    }
    console.info('[AUTH-DEBUG] Auth debugging disabled');
  }

  getLogs(category?: LogCategory, level?: LogLevel): AuthLogEntry[] {
    let filteredLogs = this.logs;
    
    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    return filteredLogs;
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
    this.info('debug', 'Auth logs cleared');
  }

  // Development helper methods
  getAuthSummary() {
    if (!this.enabled) return null;

    const recent = this.logs.slice(-50); // Last 50 logs
    const summary = {
      totalLogs: this.logs.length,
      recentErrors: recent.filter(log => log.level === 'error').length,
      recentWarnings: recent.filter(log => log.level === 'warn').length,
      categories: [...new Set(recent.map(log => log.category))],
      lastActivity: recent[recent.length - 1]?.timestamp || 'No activity'
    };

    console.table(summary);
    return summary;
  }
}

// Create singleton instance
export const authDebug = new AuthDebugger();

// Make it available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).authDebug = authDebug;
}

export default authDebug;