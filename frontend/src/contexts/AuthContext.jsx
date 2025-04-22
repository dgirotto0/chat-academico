import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    }
    // Remova qualquer chamada para api.get('/auth/profile') aqui!
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user, message } = response.data;
      const userWithBoolReset = { ...user, mustResetPassword: !!user.mustResetPassword };
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userWithBoolReset));
      setUser(userWithBoolReset);
      setIsAuthenticated(true);
      setLoading(false);
      return { 
        success: true, 
        message, 
        mustResetPassword: userWithBoolReset.mustResetPassword 
      };
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.data) {
        const { message, status } = err.response.data;
        setError(message);
        return { success: false, message, status };
      }
      setError('Erro de conexão com o servidor');
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const resetPassword = async (oldPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      await api.post('/auth/reset-password', { oldPassword, newPassword });
      if (user) {
        const updatedUser = { ...user, mustResetPassword: false };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return { success: true };
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      let errorMessage = 'Erro ao redefinir senha. Tente novamente.';
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      }
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resetRequiredPassword = async (oldPassword, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      await api.post('/auth/reset-password', { oldPassword, newPassword });
      if (user) {
        const updatedUser = { ...user, mustResetPassword: false };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return { success: true };
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      let errorMessage = 'Erro ao redefinir senha. Tente novamente.';
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      }
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      await api.post('/auth/forgot-password', { email });
      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar solicitação de recuperação de senha:', error);
      let errorMessage = 'Erro ao solicitar recuperação de senha. Tente novamente.';
      if (error.response) {
        errorMessage = error.response.data.message || errorMessage;
      }
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated,
        mustResetPassword: !!user?.mustResetPassword,
        login,
        logout,
        resetPassword,
        resetRequiredPassword,
        forgotPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
