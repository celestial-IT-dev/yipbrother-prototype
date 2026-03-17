import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import type { Profile } from '../lib/types';
import { AuthContext } from './authContextValue';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
      } else {
        setProfile(data as Profile | null);
      }
    } catch (err) {
      console.error('Exception fetching profile:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    console.log('AuthContext: Initializing authentication...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('AuthContext: Error getting session:', error);
        setLoading(false);
        return;
      }
      
      console.log('AuthContext: Session retrieved:', session ? 'Found' : 'None');
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('AuthContext: Fetching profile for user:', session.user.id);
        void fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('AuthContext: Failed to get session:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        console.log('AuthContext: Auth state changed:', session ? 'Logged in' : 'Logged out');
        setUser(session?.user ?? null);
        if (session?.user) {
          void fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => { 
      console.log('AuthContext: Cleanup - unsubscribing');
      subscription.unsubscribe(); 
    };
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
