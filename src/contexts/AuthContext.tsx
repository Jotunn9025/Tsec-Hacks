import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  wallet: number;
  preferences: string[];
  hasCompletedOnboarding: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateWallet: (amount: number) => void;
  updatePreferences: (preferences: string[]) => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const saveUser = (userData: User) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem(`user_${userData.email}`, JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const storedUser = localStorage.getItem(`user_${email}`);
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      const storedPassword = localStorage.getItem(`password_${email}`);
      if (storedPassword === password) {
        saveUser(userData);
        return true;
      }
    }
    return false;
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    const existingUser = localStorage.getItem(`user_${email}`);
    if (existingUser) {
      return false;
    }
    
    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      name,
      wallet: 500, // Starting with ₹500 dummy money
      preferences: [],
      hasCompletedOnboarding: false,
    };
    
    localStorage.setItem(`password_${email}`, password);
    saveUser(newUser);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
  };

  const updateWallet = (amount: number) => {
    if (user) {
      const updatedUser = { ...user, wallet: Math.max(0, user.wallet + amount) };
      saveUser(updatedUser);
    }
  };

  const updatePreferences = (preferences: string[]) => {
    if (user) {
      const updatedUser = { ...user, preferences };
      saveUser(updatedUser);
    }
  };

  const completeOnboarding = () => {
    if (user) {
      const updatedUser = { ...user, hasCompletedOnboarding: true };
      saveUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, updateWallet, updatePreferences, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
