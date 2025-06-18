import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography, CircularProgress } from '@mui/material';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import LandingPage from './pages/LandingPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import CreatePost from './pages/CreatePost';
import Profile from './pages/Profile';
import MapView from './pages/MapView';
import Explore from './pages/Explore';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import AppLayout from './pages/AppLayout';
import ChatsPage from './pages/ChatsPage';
import ChatWindow from './pages/ChatWindow';
import NotificationsPage from './pages/NotificationsPage';
import PostDetail from './pages/PostDetail';
import React, { useState, useMemo, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import FindUserPage from './pages/FindUserPage';
import UserProfile from './pages/UserProfile';
import DatabaseMigration from './components/DatabaseMigration';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

// Create dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#667eea',
      light: '#7c8ef5',
      dark: '#4a5fd0',
    },
    secondary: {
      main: '#764ba2',
      light: '#8a5fb8',
      dark: '#5a3a7c',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: 'Poppins, sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#6b6b6b #2b2b2b",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            backgroundColor: "#2b2b2b",
            width: 8,
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: "#6b6b6b",
            minHeight: 24,
          },
          "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus": {
            backgroundColor: "#959595",
          },
          "&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active": {
            backgroundColor: "#959595",
          },
          "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#959595",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
          boxShadow: 'none',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1e1e1e',
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e1e1e',
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#667eea',
            },
          },
        },
      },
    },
  },
});

// Create light theme
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#7c8ef5',
      dark: '#4a5fd0',
    },
    secondary: {
      main: '#764ba2',
      light: '#8a5fb8',
      dark: '#5a3a7c',
    },
    background: {
      default: '#f0f2f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
  typography: {
    fontFamily: 'Poppins, sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#a0a0a0 #e0e0e0",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            backgroundColor: "#e0e0e0",
            width: 8,
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: "#a0a0a0",
            minHeight: 24,
          },
          "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus": {
            backgroundColor: "#808080",
          },
          "&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active": {
            backgroundColor: "#808080",
          },
          "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#808080",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
          color: '#212121',
          borderBottom: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.23)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#667eea',
            },
          },
          '& .MuiInputBase-input': {
            color: '#212121',
          },
          '& .MuiInputLabel-root': {
            color: 'rgba(0, 0, 0, 0.6)',
          },
        },
      },
    },
  },
});

// PrivateRoute component to protect routes
function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !currentUser) {
      // Save the attempted URL
      const currentPath = location.pathname.replace(/^\//, ''); // Remove leading slash
      sessionStorage.setItem('redirectAfterSignIn', currentPath);
      // Redirect to signin
      navigate('/signin', { replace: true });
    }
  }, [currentUser, loading, navigate, location]);

  // Show loading state with proper styling
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}>
        <CircularProgress size={40} />
        <Typography variant="body1" sx={{ mt: 2, color: 'text.secondary' }}>
          Loading...
        </Typography>
      </Box>
    );
  }

  // If we have a user, render the route
  if (currentUser) {
    return children;
  }

  // Otherwise return null (navigation handled in useEffect)
  return null;
}

// Create a wrapper component that uses the auth context
const AppContent = () => {
  const [darkMode, setDarkMode] = useState(null);
  const { currentUser, loading } = useAuth();

  // Initialize theme from Firebase settings
  useEffect(() => {
    const initializeTheme = async () => {
      // Wait for auth to be ready
      if (loading) {
        console.log('Auth is still loading...');
        return;
      }

      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('Firebase user data:', userData);
            
            // Check both possible theme locations
            const theme = userData.settings?.theme || userData.theme;
            console.log('Theme from Firebase:', theme);
            
            // Set dark mode based on theme value
            if (theme === "dark" || theme === 0) {
              console.log('Setting dark mode to true');
              setDarkMode(true);
            } else if (theme === "light" || theme === 1) {
              console.log('Setting dark mode to false');
              setDarkMode(false);
            } else {
              console.log('No theme found, defaulting to light');
              setDarkMode(false);
            }
          } else {
            console.log('No user document found, defaulting to light theme');
            setDarkMode(false);
          }
        } catch (error) {
          console.error('Error fetching theme:', error);
          setDarkMode(false);
        }
      } else {
        console.log('No current user, defaulting to light theme');
        setDarkMode(false);
      }
    };

    initializeTheme();
  }, [currentUser, loading]);

  const currentTheme = useMemo(() => {
    console.log('Current darkMode state:', darkMode);
    return darkMode ? darkTheme : lightTheme;
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(prevDarkMode => !prevDarkMode);
  };

  // Show loading state while auth is initializing or theme is being set
  if (loading || darkMode === null) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        bgcolor: 'background.default'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <DatabaseMigration />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Protected routes */}
        <Route path="/*" element={
          <PrivateRoute>
            <AppLayout toggleTheme={toggleTheme} darkMode={darkMode} />
          </PrivateRoute>
        }>
          <Route path="home" element={<Home />} />
          <Route path="create" element={<CreatePost />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:userId" element={<UserProfile />} />
          <Route path="map" element={<MapView />} />
          <Route path="explore" element={<Explore />} />
          <Route path="settings" element={<Settings toggleTheme={toggleTheme} darkMode={darkMode} />} />
          <Route path="chats" element={<ChatsPage />} />
          <Route path="chats/:chatId" element={<ChatWindow />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="posts/:postId" element={<PostDetail />} />
          <Route path="find-user" element={<FindUserPage />} />
        </Route>

        {/* 404 route */}
        <Route path="*" element={
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            bgcolor: 'background.default',
            color: 'text.primary'
          }}>
            <Typography variant="h4">404 - Page Not Found</Typography>
          </Box>
        } />
      </Routes>
    </ThemeProvider>
  );
};

// Main App component
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
