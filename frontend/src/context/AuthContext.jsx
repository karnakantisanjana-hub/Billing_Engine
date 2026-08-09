import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const API_BASE_URL = `http://${window.location.hostname}:8000`;

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

  // Use for JSON requests (GET/PUT/POST with a JSON body)
  const getAuthHeaders = () => ({
    "Authorization": `Bearer ${localStorage.getItem("admin_token")}`,
    "Content-Type": "application/json",
  });

  // Use for FormData / file upload requests.
  // Do NOT set Content-Type here — the browser needs to set its own
  // "multipart/form-data; boundary=..." header, or the server can't parse the file.
  const getAuthHeadersMultipart = () => ({
    "Authorization": `Bearer ${localStorage.getItem("admin_token")}`,
  });

  return (
    <AuthContext.Provider
      value={{
        token,
        login,
        logout,
        getAuthHeaders,
        getAuthHeadersMultipart,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);