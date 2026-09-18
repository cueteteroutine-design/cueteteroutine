import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAdminSession, clearAdminSession, getMe } from '@/lib/adminApi';

type Role = 'admin' | 'coadmin';

interface AdminContextType {
  isLoggedIn: boolean;
  authLoading: boolean;
  username: string | null;
  role: Role | null;
  isMainAdmin: boolean;
  assignedBatchIds: string[]; // co-admins: allowed batches; main admin: [] (no restriction)
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [authLoading,setAuthLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [assignedBatchIds, setAssignedBatchIds] = useState<string[]>([]);

  const refreshAuth = async () => {
    const session = getAdminSession();
    if (!session) {
      setIsLoggedIn(false);
      setUsername(null);
      setRole(null);
      setAssignedBatchIds([]);
      setAuthLoading(false);
      return;
    }
    setIsLoggedIn(true);
    setUsername(session.admin.username);
    setRole(session.admin.role ?? null);
    // Refresh authoritative role + assignments from the server.
    try {
      const me = await getMe();
      setRole(me.role);
      setAssignedBatchIds(me.batch_ids || []);
      setIsLoggedIn(true);
    } catch {
      // If /me fails (expired session), clear.
      clearAdminSession();
      setIsLoggedIn(false);
      setUsername(null);
      setRole(null);
      setAssignedBatchIds([]);
    }
    setAuthLoading(false);
  };

  useEffect(() => {
    void refreshAuth();
  }, []);

  const logout = () => {
    clearAdminSession();
    setIsLoggedIn(false);
    setUsername(null);
    setRole(null);
    setAssignedBatchIds([]);
  };

  return (
    <AdminContext.Provider
      value={{
        isLoggedIn,
        authLoading,
        username,
        role,
        isMainAdmin: role === 'admin',
        assignedBatchIds,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
