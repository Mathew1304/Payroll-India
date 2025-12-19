
interface ErrorLogData {
    errorType?: string;
    errorMessage?: string;
    errorStack?: string;
    pageUrl?: string;
    severity?: 'error' | 'warning' | 'critical';
    metadata?: Record<string, any>;
}

type LoggerFunction = (error: Error | string, data?: Partial<ErrorLogData>) => void;

let logger: LoggerFunction | null = null;

export const setErrorLogger = (fn: LoggerFunction) => {
    logger = fn;
};

// Capture original fetch immediately
const originalFetch = window.fetch;

// Export raw fetch for internal use (like by the logger itself)
export const rawFetch = originalFetch;

// Global error handler - captures all uncaught errors
export function setupGlobalErrorHandler() {
    // Capture uncaught errors
    window.addEventListener('error', (event) => {
        if (logger) {
            logger(event.error || event.message, {
                errorType: 'Uncaught Error',
                severity: 'critical',
                metadata: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            });
        }
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        if (logger) {
            logger(event.reason, {
                errorType: 'Unhandled Promise Rejection',
                severity: 'critical'
            });
        }
    });

    // Intercept console.error
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
        // Call original console.error so it still shows in dev tools
        originalConsoleError(...args);

        if (!logger) return;

        // Extract error object if present
        const errorObj = args.find(arg => arg instanceof Error);
        const message = args.map(arg =>
            arg instanceof Error ? arg.message :
                typeof arg === 'object' ? JSON.stringify(arg, (k, v) => {
                    if (typeof v === 'object' && v !== null) {
                        if (v instanceof HTMLElement) return '[HTMLElement]';
                        if (v instanceof Window) return '[Window]';
                    }
                    return v;
                }) : String(arg)
        ).join(' ');

        // Don't log the "Error logged to database" message itself
        if (message.includes('Error logged to database') || message.includes('Failed to log error')) {
            return;
        }

        // Create safe args for metadata
        const safeArgs = args.map(arg => {
            try {
                return JSON.parse(JSON.stringify(arg, (k, v) => {
                    if (typeof v === 'object' && v !== null) {
                        if (v instanceof HTMLElement) return '[HTMLElement]';
                        if (v instanceof Window) return '[Window]';
                    }
                    return v;
                }));
            } catch (e) {
                return '[Circular/Unserializable]';
            }
        });

        logger(errorObj || message, {
            errorType: 'Console Error',
            severity: 'error',
            metadata: { originalArgs: safeArgs }
        });
    };
}

// DISABLED: Custom fetch wrapper - causing performance issues with excessive logging
// Custom fetch wrapper for Supabase and global use
export const fetchWithInterceptor = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Just use original fetch without interception to prevent performance issues
    return originalFetch(input, init);

    /* ORIGINAL CODE - DISABLED
    try {
        // Use the captured originalFetch to avoid recursion
        const response = await originalFetch(input, init);

        // Check if response is an error (4xx or 5xx)
        if (!response.ok) {
            const url = typeof input === 'string' ? input :
                input instanceof Request ? input.url : String(input);

            // CRITICAL: Avoid infinite loops. 
            // Do NOT log errors if the request was TO Supabase's log_error endpoint or similar
            if (url.includes('rpc/log_error') || url.includes('error_logs')) {
                return response;
            }

            // Clone response to read body without consuming it for the app
            const clone = response.clone();
            let responseBody;
            try {
                responseBody = await clone.text();
                try {
                    responseBody = JSON.parse(responseBody);
                } catch (e) {
                    // Keep as text if not JSON
                }
            } catch (e) {
                responseBody = '[Could not read response body]';
            }

            if (logger) {
                logger(`Network Error: ${response.status} ${response.statusText}`, {
                    errorType: 'Network Error',
                    severity: response.status >= 500 ? 'critical' : 'error',
                    pageUrl: window.location.href,
                    metadata: {
                        url: url,
                        method: init?.method || 'GET',
                        status: response.status,
                        statusText: response.statusText,
                        responseBody: responseBody
                    }
                });
            }
        }

        return response;
    } catch (error) {
        // Network failure (e.g. offline)
        const url = typeof input === 'string' ? input :
            input instanceof Request ? input.url : String(input);

        if ((!url.includes('rpc/log_error') && !url.includes('error_logs')) && logger) {
            logger(error as Error, {
                errorType: 'Network Failure',
                severity: 'critical',
                metadata: { url }
            });
        }
        throw error;
    }
    */
};

// DISABLED: Override global fetch - causing performance issues
// window.fetch = fetchWithInterceptor;
