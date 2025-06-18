import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      setCurrentUser(user);
      setLoading(false);

      if (!user) {
        // Clear user data on logout
        clearUserData();
      }
    });

    return unsubscribe;
  }, []);

  // Function to clear user data and cache
  const clearUserData = async () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      } catch (err) {
        console.error('Error clearing cache:', err);
      }
    }
  };
  // Logout function
  const logout = async () => {
    try {
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear all user data and cache
      await clearUserData();
      
      // Clear navigation history and redirect to signin
      window.history.replaceState(null, '', '/signin');
      
      // Force navigation to signin
      navigate('/signin', { replace: true });
      
      // Prevent back navigation after logout
      window.history.pushState(null, '', '/signin');
      window.onpopstate = function() {
        window.history.forward();
        window.history.pushState(null, '', '/signin');
      };
    } catch (error) {
      console.error('Error during logout:', error);
      throw error; // Propagate error to handle it in the UI
    }
  };

  const value = {
    currentUser,
    loading,
    logout,
    clearUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}