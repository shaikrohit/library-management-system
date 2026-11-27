import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { AppUser, Member, MembershipType } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  appUser: AppUser | null;
  memberProfile: Member | null;
  loading: boolean;
  signIn: (email: string, password: string, expectedRole?: 'ADMIN' | 'MEMBER') => Promise<AppUser>;
  registerMember: (input: {
    name: string;
    email: string;
    phone: string;
    membershipType: MembershipType;
    password: string;
  }) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [memberProfile, setMemberProfile] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = useCallback(async (userId: string): Promise<AppUser | null> => {
    const { data: appUserData, error: appUserError } = await supabase
      .from('app_user')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (appUserError) {
      throw appUserError;
    }

    const typedAppUser = appUserData as AppUser | null;
    setAppUser(typedAppUser);

    if (typedAppUser?.member_id) {
      const { data: memberData } = await supabase
        .from('member')
        .select('*')
        .eq('member_id', typedAppUser.member_id)
        .maybeSingle();
      setMemberProfile((memberData as Member | null) ?? null);
    } else {
      setMemberProfile(null);
    }

    return typedAppUser;
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const activeSession = data.session;
    setSession(activeSession);
    setUser(activeSession?.user ?? null);
    if (activeSession?.user) {
      await loadUserProfile(activeSession.user.id);
    } else {
      setAppUser(null);
      setMemberProfile(null);
    }
  }, [loadUserProfile]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const currentSession = data.session;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await loadUserProfile(currentSession.user.id);
        }
      } catch (err) {
        console.error('Auth initialization failed:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        void loadUserProfile(nextSession.user.id).catch((err) => {
          console.error('Failed to load profile on auth change:', err);
        });
      } else {
        setAppUser(null);
        setMemberProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  const signIn = useCallback(
    async (email: string, password: string, expectedRole?: 'ADMIN' | 'MEMBER'): Promise<AppUser> => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Invalid login credentials.');
      }

      const profile = await loadUserProfile(data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('User profile record not found. Please contact the administrator.');
      }

      if (expectedRole && profile.role !== expectedRole) {
        await supabase.auth.signOut();
        throw new Error(
          expectedRole === 'ADMIN'
            ? 'This account does not have Administrator privileges. Please use the Member Login page.'
            : 'Administrator accounts must sign in through the Administrator Login page.'
        );
      }

      return profile;
    },
    [loadUserProfile]
  );

  const registerMember = useCallback(
    async (input: {
      name: string;
      email: string;
      phone: string;
      membershipType: MembershipType;
      password: string;
    }): Promise<{ requiresEmailConfirmation: boolean }> => {
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          data: {
            name: input.name.trim(),
            phone: input.phone.trim(),
            membership_type: input.membershipType,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session && data.user) {
        await loadUserProfile(data.user.id);
        return { requiresEmailConfirmation: false };
      }

      return { requiresEmailConfirmation: true };
    },
    [loadUserProfile]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAppUser(null);
    setMemberProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        appUser,
        memberProfile,
        loading,
        signIn,
        registerMember,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return ctx;
}
