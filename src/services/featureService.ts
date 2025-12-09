import { supabase } from '../lib/supabase';

interface FeatureCache {
    organizationId: string;
    features: Set<string>;
    timestamp: number;
}

let cache: FeatureCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch enabled features for an organization
 */
export async function getEnabledFeatures(organizationId: string): Promise<Set<string>> {
    // Check cache
    if (cache && cache.organizationId === organizationId && Date.now() - cache.timestamp < CACHE_DURATION) {
        return cache.features;
    }

    try {
        const { data, error } = await supabase
            .from('organization_features')
            .select('feature_key, is_enabled')
            .eq('organization_id', organizationId);

        if (error) {
            console.error('Error fetching features:', error);
            return new Set(); // Return empty set on error
        }

        // Filter for enabled features only
        const enabledFeatures = new Set(
            data?.filter(row => row.is_enabled).map(row => row.feature_key) || []
        );

        // Update cache
        cache = {
            organizationId,
            features: enabledFeatures,
            timestamp: Date.now()
        };

        return enabledFeatures;
    } catch (error) {
        console.error('Error in getEnabledFeatures:', error);
        return new Set();
    }
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(organizationId: string, featureKey: string): Promise<boolean> {
    const enabledFeatures = await getEnabledFeatures(organizationId);
    return enabledFeatures.has(featureKey);
}

/**
 * Clear the feature cache (call when organization changes)
 */
export function clearFeatureCache() {
    cache = null;
}
