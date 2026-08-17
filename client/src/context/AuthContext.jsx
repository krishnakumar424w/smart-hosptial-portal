import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedUser !== 'undefined') {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && storedToken) {
          setUser(parsedUser);
          setToken(storedToken);
          return;
        }
      } catch (err) {
        console.error('Failed to parse user from localStorage:', err);
      }
    }

    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  }, []);

  const login = (userData, tokenValue) => {
    if (userData && tokenValue) {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', tokenValue);
      setUser(userData);
      setToken(tokenValue);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};