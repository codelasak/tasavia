// Connection monitoring and runtime error handling utility
// Addresses browser extension conflicts and WebSocket connection issues

import React from 'react';

type ConnectionStatus = 'online' | 'offline' | 'unstable';
type RuntimeErrorType = 'extension-conflict' | 'websocket-error' | 'network-error' | 'unknown';

interface RuntimeError {
  type: RuntimeErrorType;
  message: string;
  timestamp: Date;
  userAgent?: string;
  url?: string;
}

class ConnectionMonitor {
  private status: ConnectionStatus = 'online';
  private errors: RuntimeError[] = [];
  private maxErrors = 100;
  private listeners: ((status: ConnectionStatus) => void)[] = [];
  private checkInterval?: NodeJS.Timeout;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initialize();
    }
  }

  private initialize() {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      console.log('[CONNECTION-MONITOR] Network came online');
      this.updateStatus('online');
    });

    window.addEventListener('offline', () => {
      console.log('[CONNECTION-MONITOR] Network went offline');
      this.updateStatus('offline');
    });

    // Monitor for runtime errors
    this.setupRuntimeErrorHandler();

    // Monitor for WebSocket issues
    this.setupWebSocketMonitoring();

    // Periodic connection check
    this.startPeriodicCheck();
  }

  private setupRuntimeErrorHandler() {
    // Capture Chrome extension runtime errors
    const originalError = window.console.error;
    window.console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      if (message.includes('runtime.lastError') || 
          message.includes('Could not establish connection') ||
          message.includes('Receiving end does not exist')) {
        
        this.logError('extension-conflict', message);
        
        // Don't spam the console with these errors
        if (!message.includes('[CONNECTION-MONITOR]')) {
          console.warn('[CONNECTION-MONITOR] Extension conflict detected, error suppressed:', message);
        }
        return;
      }
      
      // Call original error handler for other errors
      originalError.apply(window.console, args);
    };

    // Global error handler
    window.addEventListener('error', (event) => {
      if (event.error && event.error.message) {
        const message = event.error.message;
        if (message.includes('WebSocket') || message.includes('connection')) {
          this.logError('websocket-error', message);
        }
      }
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message) {
        const message = event.reason.message;
        if (message.includes('fetch') || message.includes('network')) {
          this.logError('network-error', message);
        }
      }
    });
  }

  private setupWebSocketMonitoring() {
    // Monitor WebSocket connections
    const originalWebSocket = window.WebSocket;
    const outerThis = this; // Store reference to outer class instance
    
    if (originalWebSocket) {
      window.WebSocket = class extends originalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);
          
          this.addEventListener('error', (event) => {
            console.warn('[CONNECTION-MONITOR] WebSocket error detected');
            // Don't log WebSocket errors if they're from development hot reload
            if (!url.toString().includes('localhost') && !url.toString().includes('127.0.0.1')) {
              outerThis.logError('websocket-error', `WebSocket error: ${url}`);
            }
          });
          
          this.addEventListener('close', (event) => {
            if (event.code !== 1000 && event.code !== 1001) {
              console.warn('[CONNECTION-MONITOR] WebSocket closed unexpectedly:', event.code, event.reason);
            }
          });
        }
      };
    }
  }

  private startPeriodicCheck() {
    this.checkInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 30000); // Check every 30 seconds
  }

  private async checkConnectionHealth() {
    try {
      // Simple connectivity check
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        if (this.status !== 'online') {
          console.log('[CONNECTION-MONITOR] Connection restored');
          this.updateStatus('online');
        }
      } else {
        console.warn('[CONNECTION-MONITOR] Server connectivity issues');
        this.updateStatus('unstable');
      }
    } catch (error) {
      console.warn('[CONNECTION-MONITOR] Network check failed:', error);
      this.updateStatus('unstable');
    }
  }

  private updateStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.notifyListeners(newStatus);
    }
  }

  private notifyListeners(status: ConnectionStatus) {
    this.listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[CONNECTION-MONITOR] Error in status listener:', error);
      }
    });
  }

  public logError(type: RuntimeErrorType, message: string) {
    const error: RuntimeError = {
      type,
      message,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.errors.push(error);
    
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Update status based on error type
    if (type === 'network-error' || type === 'websocket-error') {
      this.updateStatus('unstable');
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getErrors(type?: RuntimeErrorType): RuntimeError[] {
    if (type) {
      return this.errors.filter(error => error.type === type);
    }
    return [...this.errors];
  }

  public addListener(listener: (status: ConnectionStatus) => void) {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public clearErrors() {
    this.errors = [];
  }

  public getHealthSummary() {
    const recentErrors = this.errors.filter(error => 
      Date.now() - error.timestamp.getTime() < 300000 // Last 5 minutes
    );

    return {
      status: this.status,
      totalErrors: this.errors.length,
      recentErrors: recentErrors.length,
      errorsByType: {
        'extension-conflict': this.errors.filter(e => e.type === 'extension-conflict').length,
        'websocket-error': this.errors.filter(e => e.type === 'websocket-error').length,
        'network-error': this.errors.filter(e => e.type === 'network-error').length,
        'unknown': this.errors.filter(e => e.type === 'unknown').length
      },
      lastError: this.errors[this.errors.length - 1]
    };
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.listeners = [];
  }
}

// Create singleton instance
export const connectionMonitor = new ConnectionMonitor();

// Make it globally available for debugging
if (typeof window !== 'undefined') {
  (window as any).connectionMonitor = connectionMonitor;
}

// React hook for connection status
export function useConnectionStatus() {
  const [status, setStatus] = React.useState<ConnectionStatus>(connectionMonitor.getStatus());

  React.useEffect(() => {
    const unsubscribe = connectionMonitor.addListener(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

export default connectionMonitor;