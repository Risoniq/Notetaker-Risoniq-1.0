import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdminCheck } from '@/hooks/useAdminCheck';

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  impersonatedUserEmail: string | null;
  isImpersonating: boolean;
  startImpersonating: (userId: string, email: string) => void;
  stopImpersonating: () => void;
  getEffectiveUserId: () => string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

interface ImpersonationProviderProps {
  children: ReactNode;
}

export function ImpersonationProvider({ children }: ImpersonationProviderProps) {
  const { user } = useAuth();
  const { isAdmin } = useAdminCheck();
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserEmail, setImpersonatedUserEmail] = useState<string | null>(null);

  const isImpersonating = isAdmin && impersonatedUserId !== null;

  const startImpersonating = useCallback((userId: string, email: string) => {
    if (!isAdmin) {
      console.warn('Only admins can impersonate users');
      return;
    }
    setImpersonatedUserId(userId);
    setImpersonatedUserEmail(email);
  }, [isAdmin]);

  const stopImpersonating = useCallback(() => {
    setImpersonatedUserId(null);
    setImpersonatedUserEmail(null);
  }, []);

  const getEffectiveUserId = useCallback(() => {
    if (isImpersonating && impersonatedUserId) {
      return impersonatedUserId;
    }
    return user?.id ?? null;
  }, [isImpersonating, impersonatedUserId, user?.id]);

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUserId,
        impersonatedUserEmail,
        isImpersonating,
        startImpersonating,
        stopImpersonating,
        getEffectiveUserId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within an ImpersonationProvider');
  }
  return context;
}
