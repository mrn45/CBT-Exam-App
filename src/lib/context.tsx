import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Settings } from '../types';
import { api } from './api';

interface AppContextType {
  user: User | null;
  settings: Settings | null;
  login: (u: User) => void;
  logout: () => void;
  refreshSettings: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  const refreshSettings = async () => {
    const res = await api.call('get_settings');
    if (res.success) {
      setSettings(res.data);
    }
  };

  useEffect(() => {
    refreshSettings();
  }, []);

  const login = (u: User) => setUser(u);
  const logout = () => setUser(null);

  return (
    <AppContext.Provider value={{ user, settings, login, logout, refreshSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
