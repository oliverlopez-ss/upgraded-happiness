import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../api/services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('superkoll_token');
    if (token) {
      auth.getCompanyInfo()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('superkoll_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const res = await auth.login(credentials);
    const { token, ...userData } = res.data;
    localStorage.setItem('superkoll_token', token);
    setUser(userData);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('superkoll_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
