import { supabase } from '../lib/supabase';

interface FeatureCache {
    organizationId: string;
    features: Set<string>;
    timestamp: number;
}

interface RecentFeature {
    featureKey: string;
    lastAccessed: number;
    accessCount: number;
}

let cache: FeatureCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RECENT_FEATURES_KEY = 'loghr_recent_features';
const MAX_RECENT_FEATURES = 5;

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
            // Silently handle 404 errors (table doesn't exist)
            // This is expected when organization_features table is missing
            if (error.code !== 'PGRST205' && error.code !== '42P01') {
                console.error('Error fetching features:', error);
            }
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
        // Silently handle missing table errors
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

/**
 * Track when a feature is accessed
 */
export function trackFeatureAccess(featureKey: string) {
    try {
        const stored = localStorage.getItem(RECENT_FEATURES_KEY);
        const recentFeatures: RecentFeature[] = stored ? JSON.parse(stored) : [];

        // Find existing feature or create new entry
        const existingIndex = recentFeatures.findIndex(f => f.featureKey === featureKey);

        if (existingIndex >= 0) {
            // Update existing
            recentFeatures[existingIndex].lastAccessed = Date.now();
            recentFeatures[existingIndex].accessCount++;
        } else {
            // Add new
            recentFeatures.push({
                featureKey,
                lastAccessed: Date.now(),
                accessCount: 1
            });
        }

        // Sort by most recently accessed and keep only top N
        const sorted = recentFeatures
            .sort((a, b) => b.lastAccessed - a.lastAccessed)
            .slice(0, MAX_RECENT_FEATURES);

        localStorage.setItem(RECENT_FEATURES_KEY, JSON.stringify(sorted));
    } catch (error) {
        console.error('Error tracking feature access:', error);
    }
}

/**
 * Get recently accessed features
 */
export function getRecentFeatures(): RecentFeature[] {
    try {
        const stored = localStorage.getItem(RECENT_FEATURES_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error getting recent features:', error);
        return [];
    }
}

/**
 * Clear recent features history
 */
export function clearRecentFeatures() {
    try {
        localStorage.removeItem(RECENT_FEATURES_KEY);
    } catch (error) {
        console.error('Error clearing recent features:', error);
    }
}
