import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const API_BASE_URL = "http://localhost:8000";

export function AuthProvider({ children }) {
  // Store token in localStorage so the admin doesn't lose their session on refresh
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '');

  const login = (newToken) => {
    localStorage.setItem('admin_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
  };

  const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
  "Content-Type": "application/json",
});

  return (
    <AuthContext.Provider value={{ token, login, logout, getAuthHeaders, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);