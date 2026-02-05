import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

const API_BASE = 'https://sequestrable-elsie-knurliest.ngrok-free.dev';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'instructor';
  wallet_balance: number;
  phone_number?: string;
  preferences?: string[];
  hasCompletedOnboarding?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string, role?: 'user' | 'instructor') => Promise<boolean>;
  logout: () => void;
  updateWallet: (amount: number) => void;
  updatePreferences: (preferences: string[]) => void;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate and restore session on mount
  useEffect(() => {
    validateSession();
  }, []);

  const saveUser = (userData: User, token?: string) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('access_token', token);
    }
    setUser(userData);
  };

  // 🔄 VALIDATE SESSION
  const validateSession = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('currentUser');

      if (!token || !storedUser) {
        console.log('📭 No stored session found');
        setLoading(false);
        return;
      }

      console.log('🔄 Validating stored session...');
      const userData = JSON.parse(storedUser);

      // Try to validate the token by fetching the appropriate dashboard
      try {
        if (userData.role === 'user') {
          // Validate student token
          const studentRes = await fetch(`${API_BASE}/student/dashboard`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (studentRes.ok) {
            const contentType = studentRes.headers.get('content-type');
            if (contentType?.includes('application/json')) {
              const studentData = await studentRes.json();
              // Update user data with fresh backend data
              const freshUserData: User = {
                ...userData,
                email: studentData.email || userData.email,
                name: studentData.name || userData.name,
                wallet_balance: studentData.wallet_balance ?? userData.wallet_balance,
              };
              setUser(freshUserData);
              localStorage.setItem('currentUser', JSON.stringify(freshUserData));
              console.log('✅ Student session validated');
              setLoading(false);
              return;
            }
          }
        } else if (userData.role === 'instructor') {
          // Validate instructor token
          const instructorRes = await fetch(`${API_BASE}/instructor/`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (instructorRes.ok) {
            const contentType = instructorRes.headers.get('content-type');
            if (contentType?.includes('application/json')) {
              setUser(userData);
              console.log('✅ Instructor session validated');
              setLoading(false);
              return;
            }
          }
        }

        // If validation failed, clear session
        console.warn('⚠️ Token validation failed, clearing session');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('access_token');
        setUser(null);
      } catch (error) {
        console.error('❌ Session validation error:', error);
        // On network error, optimistically trust the stored session
        // This allows offline/poor network scenarios to still work
        console.log('⚠️ Network error during validation, using cached session');
        setUser(userData);
      }
    } catch (error) {
      console.error('❌ Error validating session:', error);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // 🔐 LOGIN (FastAPI)
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Login attempt for:', email);

      // API expects Form Data with 'username' and 'password' fields
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      console.log('📡 Login response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Login failed:', res.status, errorText);
        return false;
      }

      const data = await res.json();
      console.log('✅ Login successful, received token');

      // API returns access_token and token_type
      if (data?.access_token) {
        // Store the token
        localStorage.setItem('access_token', data.access_token);
        console.log('💾 Token stored, fetching user profile...');

        // Fetch user profile to determine role
        try {
          // Try student dashboard first
          console.log('👨‍🎓 Trying student dashboard...');
          const studentRes = await fetch(`${API_BASE}/student/dashboard`, {
            headers: {
              Authorization: `Bearer ${data.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          console.log('Student dashboard response:', studentRes.status);

          // Check if response is JSON
          const contentType = studentRes.headers.get('content-type');
          if (studentRes.ok && contentType?.includes('application/json')) {
            const studentData = await studentRes.json();
            console.log('✅ Student profile fetched:', studentData);
            const userData: User = {
              id: 0,
              email: studentData.email || email,
              name: studentData.name || 'Student',
              role: 'user',
              wallet_balance: studentData.wallet_balance || 0,
              preferences: [],
              hasCompletedOnboarding: false,
            };
            saveUser(userData);
            console.log('✅ User saved, login complete!');
            return true;
          }

          // Try instructor dashboard
          console.log('👨‍🏫 Trying instructor dashboard...');
          const instructorRes = await fetch(`${API_BASE}/instructor/`, {
            headers: {
              Authorization: `Bearer ${data.access_token}`,
              'Content-Type': 'application/json',
            },
          });

          console.log('Instructor dashboard response:', instructorRes.status);

          const instructorContentType = instructorRes.headers.get('content-type');
          if (instructorRes.ok && instructorContentType?.includes('application/json')) {
            console.log('✅ Instructor profile fetched');
            const userData: User = {
              id: 0,
              email: email,
              name: 'Instructor',
              role: 'instructor',
              wallet_balance: 0,
              preferences: [],
              hasCompletedOnboarding: true,
            };
            saveUser(userData);
            console.log('✅ Instructor saved, login complete!');
            return true;
          }

          console.warn('⚠️ Dashboard endpoints not available, using fallback');

          // FALLBACK: If both dashboard endpoints fail, decode JWT to get role
          // This allows login to work even if dashboard endpoints aren't implemented yet
          let userRole: 'user' | 'instructor' = 'user';
          let userName = email.split('@')[0];

          // Try to decode JWT token to get the actual role
          try {
            const token = data.access_token;
            const payload = JSON.parse(atob(token.split('.')[1]));
            console.log('🔍 Decoded JWT payload:', payload);

            if (payload.role) {
              userRole = payload.role;
              console.log('✅ Found role in JWT:', userRole);
            } else if (payload.is_instructor) {
              userRole = 'instructor';
              console.log('✅ Found is_instructor in JWT');
            } else if (payload.user_type === 'instructor') {
              userRole = 'instructor';
              console.log('✅ Found user_type=instructor in JWT');
            } else {
              console.log('⚠️ No role field in JWT token, checking email...');
              // Fallback: check if email contains 'instructor' or if this was recently signed up as instructor
              const recentSignup = localStorage.getItem('recent_instructor_signup');
              if (recentSignup === email) {
                userRole = 'instructor';
                console.log('✅ Recent instructor signup detected');
                localStorage.removeItem('recent_instructor_signup');
              }
            }

            if (payload.sub) {
              userName = payload.sub; // Username from token
            }
          } catch (e) {
            console.error('❌ Could not decode token:', e);
          }

          const fallbackUser: User = {
            id: 0,
            email: email,
            name: userName,
            role: userRole, // Use role from JWT token
            wallet_balance: 1000,
            preferences: [],
            hasCompletedOnboarding: false,
          };
          saveUser(fallbackUser);
          console.log('✅ User logged in with fallback profile, role:', userRole);
          return true;

        } catch (profileError) {
          console.error('❌ Error fetching profile:', profileError);

          // FALLBACK: Even if profile fetch crashes, try to decode token
          let userRole: 'user' | 'instructor' = 'user';
          let userName = email.split('@')[0];

          try {
            const token = data.access_token;
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role) {
              userRole = payload.role;
            }
            if (payload.sub) {
              userName = payload.sub;
            }
          } catch (e) {
            console.log('Could not decode token, using defaults');
          }

          const fallbackUser: User = {
            id: 0,
            email: email,
            name: userName,
            role: userRole,
            wallet_balance: 1000,
            preferences: [],
            hasCompletedOnboarding: false,
          };
          saveUser(fallbackUser);
          console.log('✅ User logged in with error fallback profile, role:', userRole);
          return true;
        }
      } else {
        console.error('❌ No access_token in response:', data);
      }

      return false;
    } catch (error) {
      console.error('❌ Login error:', error);
      return false;
    }
  };

  // 📝 SIGNUP (FastAPI)
  const signup = async (
    email: string,
    password: string,
    name: string,
    role: 'user' | 'instructor' = 'user'
  ): Promise<boolean> => {
    try {
      console.log('📝 Signup attempt for:', email, 'as role:', role);

      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          phone_number: '0000000000', // Default value
          role
        }),
      });

      if (!res.ok) {
        console.error('❌ Signup failed:', res.status);
        return false;
      }

      console.log('✅ Signup successful, logging in...');

      // After signup, login to get token
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!loginRes.ok) {
        console.error('❌ Login after signup failed');
        return false;
      }

      const loginData = await loginRes.json();
      localStorage.setItem('access_token', loginData.access_token);

      // Mark if this is an instructor signup for fallback detection
      if (role === 'instructor') {
        localStorage.setItem('recent_instructor_signup', email);
      }

      // Save user with the ROLE FROM SIGNUP, not from dashboard endpoints
      const userData: User = {
        id: 0,
        email: email,
        name: name,
        role: role, // Use the role from signup form
        wallet_balance: 1000,
        preferences: [],
        hasCompletedOnboarding: false,
      };

      saveUser(userData);
      console.log('✅ User created and logged in with role:', role);

      return true;
    } catch (error) {
      console.error('❌ Signup error:', error);
      return false;
    }
  };

  // 🚪 LOGOUT
  const logout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('access_token');
    setUser(null);
  };

  // 💰 LOCAL UI UPDATES (until backend APIs exist)
  const updateWallet = (amount: number) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      wallet_balance: Math.max(0, user.wallet_balance + amount),
    };
    saveUser(updatedUser);
  };

  const updatePreferences = (preferences: string[]) => {
    if (!user) return;
    const updatedUser = { ...user, preferences };
    saveUser(updatedUser);
  };

  const completeOnboarding = () => {
    if (!user) return;
    const updatedUser = { ...user, hasCompletedOnboarding: true };
    saveUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateWallet,
        updatePreferences,
        completeOnboarding,
      }}
    >
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