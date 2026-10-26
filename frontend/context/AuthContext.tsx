'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { apiClient, setAuthToken, getAuthToken, ApiError } from '../lib/api-client';

export type UserRole = 'Public' | 'Founder' | 'Investor' | 'Mentor' | 'Incubator' | 'Admin';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'founder' | 'investor' | 'mentor' | 'incubator' | 'admin';
  is_student: boolean;
  organization: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  status: 'active' | 'suspended';
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

interface SignUpInput {
  email: string;
  password?: string;
  full_name: string;
  role: 'founder' | 'investor' | 'mentor' | 'incubator';
  is_student?: boolean;
  organization?: string;
  bio?: string;
  location?: string;
  website?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  loading: boolean;
  error: string | null;
  signUp: (data: SignUpInput) => Promise<UserProfile>;
  signIn: (email: string, password?: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  refreshProfile: () => Promise<UserProfile | null>;
  switchDemoRole: (targetRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const roleToUiRole = (dbRole?: string): UserRole => {
  if (!dbRole) return 'Public';
  switch (dbRole.toLowerCase()) {
    case 'founder':
      return 'Founder';
    case 'investor':
      return 'Investor';
    case 'mentor':
      return 'Mentor';
    case 'incubator':
      return 'Incubator';
    case 'admin':
      return 'Admin';
    default:
      return 'Public';
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('Public');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile from /me endpoint
  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const res = await apiClient.get<UserProfile>('/me');
      if (res && res.data) {
        setUser(res.data);
        setRole(roleToUiRole(res.data.role));
        return res.data;
      }
      return null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAuthToken(null);
        setUser(null);
        setRole('Public');
      }
      return null;
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const existingToken = getAuthToken();

      if (existingToken) {
        await refreshProfile();
      } else {
        // Check if there is an active Supabase session
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setAuthToken(data.session.access_token);
          await refreshProfile();
        }
      }
      setLoading(false);
    };

    initAuth();

    // Listen for Supabase token refresh / auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
          setAuthToken(session.access_token);
          await refreshProfile();
        }
      } else if (event === 'SIGNED_OUT') {
        setAuthToken(null);
        setUser(null);
        setRole('Public');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  // Sign up flow: creates Supabase user and registers backend profile
  const signUp = async (input: SignUpInput): Promise<UserProfile> => {
    setError(null);
    try {
      // 1. Create credential via Supabase Auth client if password provided
      if (input.password && input.password.length >= 6) {
        try {
          const { data: sbData, error: sbErr } = await supabase.auth.signUp({
            email: input.email,
            password: input.password,
            options: {
              data: {
                full_name: input.full_name,
                role: input.role,
              },
            },
          });
          if (sbErr && !sbErr.message.includes('already registered')) {
            console.warn('Supabase auth sign-up notice:', sbErr.message);
          }
          if (sbData.session?.access_token) {
            setAuthToken(sbData.session.access_token);
          }
        } catch (sbEx) {
          console.warn('Supabase sign-up attempt completed with notice:', sbEx);
        }
      }

      // 2. Register profile in Founders Den backend API
      const res = await apiClient.post<{ user: UserProfile; profile: UserProfile; token: string }>(
        '/auth/register-profile',
        input
      );

      const registeredProfile = res.data.profile || res.data.user;
      if (res.data.token) {
        setAuthToken(res.data.token);
      }

      setUser(registeredProfile);
      setRole(roleToUiRole(registeredProfile.role));
      return registeredProfile;
    } catch (err: any) {
      const msg = err?.message || 'Failed to complete registration';
      setError(msg);
      throw err;
    }
  };

  // Sign in flow: authenticates credentials and routes to role portal
  const signIn = async (email: string, password = 'Password123!'): Promise<UserProfile> => {
    setError(null);
    try {
      // 1. Authenticate with Supabase Auth if possible
      try {
        const { data: sbData } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (sbData.session?.access_token) {
          setAuthToken(sbData.session.access_token);
        }
      } catch (sbEx) {
        console.warn('Supabase direct login notice:', sbEx);
      }

      // 2. Authenticate with backend API to verify role and account status
      const res = await apiClient.post<{ user: UserProfile; token: string }>('/auth/login', {
        email,
        password,
      });

      if (res.data.token) {
        setAuthToken(res.data.token);
      }

      setUser(res.data.user);
      setRole(roleToUiRole(res.data.user.role));
      return res.data.user;
    } catch (err: any) {
      const msg = err?.message || 'Invalid email or password';
      setError(msg);
      throw err;
    }
  };

  // Sign out flow
  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign-out error:', err);
    }
    setAuthToken(null);
    setUser(null);
    setRole('Public');
  };

  // Password reset via Supabase Auth
  const resetPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
      });

      if (resetErr) {
        return { success: false, message: resetErr.message };
      }

      return {
        success: true,
        message: `Password reset instructions sent to ${email} via Supabase Auth.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to send password reset email.',
      };
    }
  };

  // Quick switcher for demo and testing between all 5 roles
  const switchDemoRole = async (targetRole: UserRole): Promise<void> => {
    if (targetRole === 'Public') {
      await signOut();
      return;
    }

    const demoEmails: Record<Exclude<UserRole, 'Public'>, string> = {
      Founder: 'manmeet@foundersden.test',
      Investor: 'northstar@foundersden.test',
      Mentor: 'kavita@foundersden.test',
      Incubator: 'punjab@foundersden.test',
      Admin: 'admin@foundersden.test',
    };

    const targetEmail = demoEmails[targetRole];
    if (targetEmail) {
      await signIn(targetEmail, 'any-valid-input-for-seed');
    } else {
      setRole(targetRole);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        resetPassword,
        refreshProfile,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
