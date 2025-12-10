import { loggingSupabase } from '../lib/supabase';

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
        // Get current user using logging client (avoids interceptor loop)
        const { data: { user } } = await loggingSupabase.auth.getUser();

        let userName: string | null = user?.email || null;
        let organizationId: string | null = null;
        let organizationName: string | null = null;

        if (user) {
            // Get user's profile to find organization
            const { data: profile } = await loggingSupabase
                .from('user_profiles')
                .select('current_organization_id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (profile?.current_organization_id) {
                organizationId = profile.current_organization_id;

                const { data: org } = await loggingSupabase
                    .from('organizations')
                    .select('name')
                    .eq('id', organizationId)
                    .maybeSingle();

                organizationName = org?.name || null;
            }

            // Try to get name from metadata
            if (user.user_metadata?.full_name) {
                userName = user.user_metadata.full_name;
            }
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Sanitize metadata to ensure it's JSON serializable
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

        // Insert or update error log via RPC using logging client
        const { error: rpcError } = await loggingSupabase.rpc('log_error', errorData);

        if (rpcError) throw rpcError;

        // Log to console in development
        if (import.meta.env.DEV) {
            console.log('%c Error logged to database successfully', 'color: green; font-weight: bold');
        }
    } catch (logError) {
        // Fallback: log to console if database logging fails
        console.warn('Failed to log error to database:', logError);
    }
}


