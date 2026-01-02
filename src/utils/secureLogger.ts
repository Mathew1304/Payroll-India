/**
 * Secure Logger Utility
 * 
 * This utility provides secure logging that sanitizes sensitive data
 * and can be disabled in production environments.
 * 
 * Usage:
 * - Replace console.log with secureLog.info()
 * - Replace console.error with secureLog.error()
 * - Replace console.warn with secureLog.warn()
 */

// List of sensitive keys that should be redacted from logs
const SENSITIVE_KEYS = [
  'id',
  'uuid',
  'user_id',
  'employee_id',
  'organization_id',
  'department_id',
  'company_id',
  'auth_id',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'secret',
  'private_key',
  'ssn',
  'social_security',
  'credit_card',
  'bank_account',
  'iban',
  'swift',
  'email',
  'phone',
  'mobile',
  'address',
  'salary',
  'wage',
  'compensation',
  'created_by',
  'updated_by',
  'reviewer_id',
  'manager_id',
];

// Environment check
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Sanitizes an object by redacting sensitive fields
 */
function sanitizeData(data: any, depth = 0): any {
  // Prevent infinite recursion
  if (depth > 5) {
    return '[Max Depth Reached]';
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    // In production, limit array size shown
    if (isProduction && data.length > 3) {
      return [
        ...data.slice(0, 2).map(item => sanitizeData(item, depth + 1)),
        `... ${data.length - 2} more items`
      ];
    }
    return data.map(item => sanitizeData(item, depth + 1));
  }

  // Handle objects
  const sanitized: any = {};
  for (const key in data) {
    if (data.hasOwnProperty(key)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains sensitive information
      const isSensitive = SENSITIVE_KEYS.some(sensitiveKey => 
        lowerKey.includes(sensitiveKey.toLowerCase())
      );

      if (isSensitive) {
        // Redact sensitive data
        sanitized[key] = '[REDACTED]';
      } else {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeData(data[key], depth + 1);
      }
    }
  }

  return sanitized;
}

/**
 * Formats log arguments for safe output
 */
function formatLogArgs(...args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg === 'object' && arg !== null) {
      return sanitizeData(arg);
    }
    return arg;
  });
}

/**
 * Secure logger class
 */
class SecureLogger {
  private enabled: boolean;
  private showSanitized: boolean;

  constructor() {
    // In production, disable detailed logging
    this.enabled = isDevelopment;
    // In production, always sanitize; in dev, can be toggled
    this.showSanitized = true;
  }

  /**
   * Info level logging
   */
  info(...args: any[]): void {
    if (!this.enabled) return;

    const formattedArgs = this.showSanitized ? formatLogArgs(...args) : args;
    console.log('%c[INFO]', 'color: #3b82f6; font-weight: bold;', ...formattedArgs);
  }

  /**
   * Warning level logging
   */
  warn(...args: any[]): void {
    if (!this.enabled) return;

    const formattedArgs = this.showSanitized ? formatLogArgs(...args) : args;
    console.warn('%c[WARN]', 'color: #f59e0b; font-weight: bold;', ...formattedArgs);
  }

  /**
   * Error level logging (always enabled but sanitized in production)
   */
  error(...args: any[]): void {
    // Errors should always be logged, but sanitized in production
    if (isProduction) {
      const formattedArgs = formatLogArgs(...args);
      console.error('%c[ERROR]', 'color: #ef4444; font-weight: bold;', ...formattedArgs);
    } else {
      const formattedArgs = this.showSanitized ? formatLogArgs(...args) : args;
      console.error('%c[ERROR]', 'color: #ef4444; font-weight: bold;', ...formattedArgs);
    }
  }

  /**
   * Debug level logging (only in development)
   */
  debug(...args: any[]): void {
    if (!isDevelopment) return;

    const formattedArgs = this.showSanitized ? formatLogArgs(...args) : args;
    console.log('%c[DEBUG]', 'color: #8b5cf6; font-weight: bold;', ...formattedArgs);
  }

  /**
   * Success level logging
   */
  success(...args: any[]): void {
    if (!this.enabled) return;

    const formattedArgs = this.showSanitized ? formatLogArgs(...args) : args;
    console.log('%c[SUCCESS]', 'color: #10b981; font-weight: bold;', ...formattedArgs);
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Enable/disable sanitization
   */
  setSanitization(enabled: boolean): void {
    this.showSanitized = enabled;
  }

  /**
   * Log only in development
   */
  devOnly(...args: any[]): void {
    if (isDevelopment) {
      const formattedArgs = this.showSanitized ? formatLogArgs(...args) : args;
      console.log('%c[DEV]', 'color: #06b6d4; font-weight: bold;', ...formattedArgs);
    }
  }

  /**
   * Group logs together
   */
  group(label: string, collapsed = false): void {
    if (!this.enabled) return;
    
    if (collapsed) {
      console.groupCollapsed(label);
    } else {
      console.group(label);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (!this.enabled) return;
    console.groupEnd();
  }

  /**
   * Log a table (sanitized)
   */
  table(data: any): void {
    if (!this.enabled) return;

    const sanitized = sanitizeData(data);
    console.table(sanitized);
  }
}

// Export singleton instance
export const secureLog = new SecureLogger();

// Export utility functions for advanced usage
export { sanitizeData, SENSITIVE_KEYS };

// Export type for custom loggers
export type { SecureLogger };
