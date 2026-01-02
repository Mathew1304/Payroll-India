import { secureLog } from '../utils/secureLogger';

interface ErrorLogData {
    errorType?: string;
    errorMessage: string;
    errorStack?: string;
    pageUrl?: string;
    severity?: 'error' | 'warning' | 'critical';
    metadata?: Record<string, any>;
}

export async function logErrorToSupabase(error: Error | string, data?: Partial<ErrorLogData>) {
    try {
        // DISABLED: Supabase error logging to prevent 404 errors
        // The log_error RPC function doesn't exist in the database
        // Only log to console for now (using secure logger)

        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Use secure logger - automatically sanitizes sensitive data
        if (import.meta.env.DEV) {
            secureLog.group('Error Log', false);
            secureLog.error('Message:', errorMessage);
            if (errorStack) secureLog.error('Stack:', errorStack);
            if (data?.errorType) secureLog.error('Type:', data.errorType);
            if (data?.severity) secureLog.error('Severity:', data.severity);
            if (data?.pageUrl) secureLog.error('Page:', data.pageUrl);
            // Metadata is automatically sanitized by secureLog
            if (data?.metadata) secureLog.error('Metadata:', data.metadata);
            secureLog.groupEnd();
        } else {
            // In production, only log sanitized error message
            secureLog.error('Application Error:', errorMessage);
        }

        // TODO: Create the log_error RPC function in Supabase if database logging is needed
        // Then uncomment the code below:

        /*
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) return;

        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        const token = session?.access_token;

        const headers: HeadersInit = {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        let userName: string | null = user?.email || null;
        let organizationId: string | null = null;
        let organizationName: string | null = null;

        if (user && token) {
            try {
                const profileRes = await fetch(
                    `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${user.id}&select=current_organization_id`,
                    { headers }
                );

                if (profileRes.ok) {
                    const profiles = await profileRes.json();
                    const profile = profiles[0];

                    if (profile?.current_organization_id) {
                        organizationId = profile.current_organization_id;

                        const orgRes = await fetch(
                            `${supabaseUrl}/rest/v1/organizations?id=eq.${organizationId}&select=name`,
                            { headers }
                        );

                        if (orgRes.ok) {
                            const orgs = await orgRes.json();
                            organizationName = orgs[0]?.name || null;
                        }
                    }
                }

                if (user.user_metadata?.full_name) {
                    userName = user.user_metadata.full_name;
                }
            } catch (e) {
                secureLog.warn('Failed to fetch context for error log', e);
            }
        }

        const safeMetadata = data?.metadata ? JSON.parse(JSON.stringify(data.metadata, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (value instanceof HTMLElement) return '[HTMLElement]';
                if (value instanceof Window) return '[Window]';
                if (value instanceof Document) return '[Document]';
            }
            return value;
        })) : {};

        const errorData = {
            p_user_id: user?.id || null,
            p_user_email: user?.email || null,
            p_user_name: userName,
            p_organization_id: organizationId,
            p_organization_name: organizationName,
            p_error_message: errorMessage,
            p_error_stack: errorStack || data?.errorStack || null,
            p_error_type: data?.errorType || (error instanceof Error ? error.constructor.name : 'Error'),
            p_page_url: data?.pageUrl || window.location.href,
            p_severity: data?.severity || 'error',
            p_metadata: safeMetadata
        };

        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/log_error`, {
            method: 'POST',
            headers,
            body: JSON.stringify(errorData)
        });

        if (!rpcRes.ok) {
            throw new Error(`RPC failed: ${rpcRes.status} ${rpcRes.statusText}`);
        }

        secureLog.success('Error logged to database successfully');
        */
    } catch (logError) {
        // Silently fail - don't create more errors
        // Use secure logger even for logger failures
        secureLog.warn('Error logger failed:', logError);
    }
}


