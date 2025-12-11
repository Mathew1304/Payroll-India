import { supabase } from '../lib/supabase';

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
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) return;

        // Get current session from main client (safe, no network request usually)
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
                // 1. Get user profile to find organization
                // GET /rest/v1/user_profiles?user_id=eq.ID&select=current_organization_id
                const profileRes = await fetch(
                    `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${user.id}&select=current_organization_id`,
                    { headers }
                );

                if (profileRes.ok) {
                    const profiles = await profileRes.json();
                    const profile = profiles[0];

                    if (profile?.current_organization_id) {
                        organizationId = profile.current_organization_id;

                        // 2. Get organization name
                        // GET /rest/v1/organizations?id=eq.ID&select=name
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

                // Try to get name from metadata
                if (user.user_metadata?.full_name) {
                    userName = user.user_metadata.full_name;
                }
            } catch (e) {
                // Ignore context fetching errors
                console.warn('Failed to fetch context for error log', e);
            }
        }

        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Sanitize metadata
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

        // Call RPC log_error
        // POST /rest/v1/rpc/log_error
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/log_error`, {
            method: 'POST',
            headers,
            body: JSON.stringify(errorData)
        });

        if (!rpcRes.ok) {
            throw new Error(`RPC failed: ${rpcRes.status} ${rpcRes.statusText}`);
        }

        if (import.meta.env.DEV) {
            console.log('%c Error logged to database successfully', 'color: green; font-weight: bold');
        }
    } catch (logError) {
        console.warn('Failed to log error to database:', logError);
    }
}


