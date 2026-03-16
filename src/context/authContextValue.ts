import { createContext } from 'react';
import type { AuthError, User } from '@supabase/supabase-js';
import type { Profile } from '../lib/types';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

