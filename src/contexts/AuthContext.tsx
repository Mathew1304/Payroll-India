import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { UserRole } from '../lib/database.types';

interface UserProfile {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  employee_id: string | null;
  role: UserRole;
  is_active: boolean;
}

interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  employee_id: string | null;
  admin_id: string | null;
  is_active: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string;
  country?: string;
  features?: Record<string, boolean>;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  organization: Organization | null;
  membership: OrganizationMember | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, organizationName: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
          setOrganization(null);
          setMembership(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      // TEMPORARY WORKAROUND: Fetch user data without triggering RLS recursion
      // Instead of selecting all fields which triggers the recursive policy,
      // we'll build the profile data from auth metadata
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      // Try to get profile with minimal fields to avoid recursion
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, user_id, organization_id, employee_id, role, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error loading user profile:', profileError);
        // If RLS still fails, create a minimal profile from auth data
        // Try to get role from user metadata if available
        const userRole = (user.user_metadata?.role || user.app_metadata?.role || 'admin') as UserRole;
        const minimalProfile = {
          id: userId,
          user_id: userId,
          organization_id: user.user_metadata?.organization_id || null,
          employee_id: user.user_metadata?.employee_id || null,
          role: userRole,
          is_active: true,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
        };
        setProfile(minimalProfile as any);
        setLoading(false);
        return;
      }

      setProfile(profileData);

      if (profileData?.organization_id) {
        await loadOrganizationData(profileData.organization_id, userId);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizationData = async (organizationId: string, userId: string) => {
    try {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .maybeSingle();

      if (orgError) throw orgError;

      // Load organization features
      const { data: featureData } = await supabase
        .from('organization_features')
        .select('feature_key, is_enabled')
        .eq('organization_id', organizationId);

      const features: Record<string, boolean> = {};
      if (featureData) {
        featureData.forEach(f => {
          features[f.feature_key] = f.is_enabled;
        });
      }

      setOrganization({ ...orgData, features });

      // Note: membership data is not needed since role is in user_profiles
      // The organization_members table doesn't exist in this schema
      setMembership(null);
    } catch (error) {
      console.error('Error loading organization:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, organizationName: string, country: string = 'India') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      if (data.user) {
        try {
          const { error: rpcError } = await supabase.rpc('create_new_organization_flow', {
            p_user_id: data.user.id,
            p_user_email: email,
            p_org_name: organizationName,
            p_country: country
          });

          if (rpcError) throw rpcError;

          // Wait a moment for triggers to complete if any
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Refresh session to ensure claims are updated could be beneficial
          await supabase.auth.refreshSession();

        } catch (err) {
          // If RPC fails, we might want to cleanup the user, but for now just throw
          console.error('Organization creation failed:', err);
          throw err;
        }
      }
    }
  };

  const signOut = async () => {
    try {
      setProfile(null);
      setOrganization(null);
      setMembership(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error('Error during sign out:', error);
      throw error;
    }
  };

  const switchOrganization = async (organizationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ organization_id: organizationId })
        .eq('user_id', user.id);

      if (error) throw error;

      await loadOrganizationData(organizationId, user.id);
      setProfile(prev => prev ? { ...prev, organization_id: organizationId } : null);
    } catch (error) {
      console.error('Error switching organization:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, organization, membership, loading, signIn, signUp, signOut, switchOrganization }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
