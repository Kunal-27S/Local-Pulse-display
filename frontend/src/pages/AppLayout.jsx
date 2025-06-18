import React, { useState, useEffect } from 'react';
import { Box, useMediaQuery, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, AppBar, Toolbar, Typography, CssBaseline, Paper, BottomNavigation, BottomNavigationAction, Fab, InputBase, Divider, IconButton, Avatar, Badge } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { Home as HomeIcon, Map as MapIcon, Explore as ExploreIcon, Person as PersonIcon, Add as AddIcon, NotificationsNoneOutlined, ChatBubbleOutlineOutlined, SettingsOutlined, LogoutOutlined, PhotoCameraOutlined, Send as SendIcon, Close as CloseIcon, PsychologyOutlined } from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import placeholderImage from '../assets/placeholder.jpg';
import AIImage from '../assets/onboarding/step3-3.png'; // Assuming a placeholder image for the bot avatar
import logoImage from '../assets/logo.png'; // Import the logo image
import ChatsPage from './ChatsPage';
import ChatWindow from './ChatWindow';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import ChatBot from '../components/ChatBot';

// Import other page components
import Home from './Home';
import MapView from './MapView';
import Explore from './Explore';
import Profile from './Profile';
import CreatePost from './CreatePost';
import Settings from './Settings';

const drawerWidth = 240;
const chatWidth = 300; // Define width for the chat sidebar

const StyledBottomNavigation = styled(BottomNavigation)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  borderTop: `1px solid ${theme.palette.divider}`,
  height: '65px',
  zIndex: theme.zIndex.drawer + 1,
}));

const ChatToggleButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  right: 16,
  bottom: 16,
  zIndex: theme.zIndex.drawer + 2,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(4),
}));

const NotificationBadge = styled(Box)(({ theme, color }) => ({
  backgroundColor: color,
  color: 'white',
  borderRadius: '50%',
  minWidth: '20px',
  height: '20px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.75rem',
  fontWeight: 'bold',
  padding: '0 6px',
  boxSizing: 'border-box',
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  '&.Mui-selected': {
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    '&:hover': {
      backgroundColor: 'rgba(102, 126, 234, 0.2)',
    },
  },
}));

const AppLayout = ({ toggleTheme, darkMode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const [messages, setMessages] = useState([]); // State to hold chat messages
  const [inputMessage, setInputMessage] = useState(''); // State for the message input
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [totalUnreadChatsCount, setTotalUnreadChatsCount] = useState(0);
  useEffect(() => {
    // Redirect to home if no specific path is accessed
    if (location.pathname === '/') {
      navigate('/home', { replace: true });
    }

    // Prevent back navigation after logout
    const handlePopState = () => {
      if (!currentUser) {
        window.history.forward();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentUser, location.pathname, navigate]);

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotificationsCount(0);
      setTotalUnreadChatsCount(0);
      return;
    }

    const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
    const unreadQuery = query(notificationsRef, where('read', '==', false));

    const unsubscribeNotifications = onSnapshot(unreadQuery, (snapshot) => {
      setUnreadNotificationsCount(snapshot.size);
    }, (error) => {
      console.error('Error fetching unread notifications count:', error);
    });

    const chatsRef = collection(db, 'users', currentUser.uid, 'chats');

    const unsubscribeChats = onSnapshot(chatsRef, (snapshot) => {
      let totalUnread = 0;
      snapshot.forEach(doc => {
        const chatData = doc.data();
        if (chatData.unreadCount > 0) {
          totalUnread += 1; // Count each chat with unread messages as 1
        }
      });
      setTotalUnreadChatsCount(totalUnread);
    }, (error) => {
      console.error('Error fetching total unread chats count:', error);
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeChats();
    };
  }, [currentUser]);

  // Determine active index for BottomNavigation
  const bottomNavValue = [
    '/home',
    '/map',
    '/explore',
    '/profile',
  ].findIndex(path => location.pathname === path);

  const handleBottomNavChange = (event, newValue) => {
    const paths = ['/home', '/map', '/explore', '/profile'];
    navigate(paths[newValue]);
  };

  const handleFabClick = () => {
    navigate('/create');
  };

  const handleSidebarItemClick = (path) => {
    navigate(path);
  };

  const handleSendMessage = () => {
    if (inputMessage.trim() !== '') {
      const newMessage = { text: inputMessage, sender: 'user', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setMessages(prevMessages => [...prevMessages, newMessage]);
      setInputMessage('');

      // Simulate AI bot response
      setTimeout(() => {
        const botMessage = { text: 'I am Fine', sender: 'bot', timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setMessages(prevMessages => [...prevMessages, botMessage]);
      }, 500);
    }
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const mainContentSx = {
    flexGrow: 1,
    p: 3,
    overflowY: 'scroll',
    boxSizing: 'border-box',
    ...(isMobile && { pb: '65px', pt: '56px' }),
    ...(!isMobile && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
    }),
  };
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/', { replace: true }); // Force navigation to landing page
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const navigationItems = [
    { label: 'Home', icon: <HomeIcon />, path: '/home' },
    { label: 'Map', icon: <MapIcon />, path: '/map' },
    { label: 'Explore', icon: <ExploreIcon />, path: '/explore' },
    { label: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { label: 'Create Post', icon: <PhotoCameraOutlined />, path: '/create' },
  ];

  const socialItems = [
    {
      label: 'Notifications',
      icon: <NotificationsNoneOutlined />,
      count: unreadNotificationsCount > 0 ? (unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount.toString()) : null,
      countColor: 'error.main',
      path: '/notifications'
    },
    {
      label: 'Chats',
      icon: <ChatBubbleOutlineOutlined />,
      count: totalUnreadChatsCount > 0 ? (totalUnreadChatsCount > 99 ? '99+' : totalUnreadChatsCount.toString()) : null,
      countColor: 'primary.main',
      path: '/chats'
    },
  ];

  const settingsItems = [
    { label: 'Settings', icon: <SettingsOutlined />, path: '/settings' },
    { 
      label: 'Logout', 
      icon: <LogoutOutlined />, 
      onClick: handleLogout, // Now handleLogout is defined before being used
      path: null // Remove path since we handle navigation in logout function
    },
  ];

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  const handleChatClick = () => {
    if (isMobile) {
      navigate('/chats');
    } else {
      toggleChat();
    }
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw', 
      overflow: 'hidden',
      position: 'relative'
    }}>
      <CssBaseline />
      {/* AppBar for Mobile */}
      {isMobile && (
        <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1, bgcolor: 'background.paper', color: 'text.primary' }} elevation={1}>
          <Toolbar variant="dense">
            {/* App Logo */}
            <Box component="img" src={logoImage} alt="Local Pulse Logo" sx={{ height: 30, width: 30, mr: 1 }} />
            <span
              style={{
                fontWeight: 'bold',
                fontSize: 'clamp(1rem, 2vw, 1.5rem)',
                whiteSpace: 'nowrap',
                overflow: 'visible',
                textOverflow: 'unset',
                flexGrow: 1,
                minWidth: 0,
              }}
            >
              Local Pulse
            </span>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                onClick={handleNotificationClick}
                sx={{ 
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  <NotificationsNoneOutlined />
                  {unreadNotificationsCount > 0 && (
                    <NotificationBadge 
                      color={theme.palette.error.main}
                      sx={{ 
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        fontSize: '0.7rem',
                      }}
                    >
                      {unreadNotificationsCount}
                    </NotificationBadge>
                  )}
                </Box>
              </IconButton>

              <IconButton 
                onClick={handleChatClick}
                sx={{
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <Box sx={{ position: 'relative' }}>
                  <ChatBubbleOutlineOutlined />
                  {totalUnreadChatsCount > 0 && (
                    <NotificationBadge 
                      color={theme.palette.primary.main}
                      sx={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        fontSize: '0.7rem',
                      }}
                    >
                      {totalUnreadChatsCount > 99 ? '99+' : totalUnreadChatsCount}
                    </NotificationBadge>
                  )}
                </Box>
              </IconButton>

              <IconButton 
                onClick={handleSettingsClick}
                sx={{ 
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <SettingsOutlined />
              </IconButton>

              <IconButton 
                onClick={handleLogout}
                sx={{ 
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <LogoutOutlined />
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
      )}
      
      {/* Desktop Layout (Sidebar and Main Content in 20:80 split) */}
      {!isMobile && (
        <>
          {/* Sidebar Box (20%) */}
          <Box sx={{ 
            width: '20%', 
            height: '100vh',
            flexShrink: 0, 
            bgcolor: 'background.default', 
            borderRight: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            flexDirection: 'column',
            position: 'fixed',
            left: 0,
            top: 0,
            zIndex: theme.zIndex.drawer
          }}>
            <Toolbar variant="dense">
              <Box component="img" src={logoImage} alt="Local Pulse Logo" sx={{ height: 50, width: 50, mr: 1 }} />
              <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
                Local Pulse
              </Typography>
            </Toolbar>
            <Box sx={{ 
              flexGrow: 1,
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
                borderRadius: '4px',
                '&:hover': {
                  background: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
                },
              },
            }}>
              <List>
                {navigationItems.map((item) => (
                  <StyledListItem
                    key={item.label}
                    disablePadding
                  >
                    <StyledListItem
                      button
                      selected={location.pathname === item.path}
                      onClick={() => handleSidebarItemClick(item.path)}
                      sx={{
                        color: 'text.primary',
                        '& .MuiListItemIcon-root': {
                          color: 'inherit',
                        },
                      }}
                    >
                      <ListItemIcon>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </StyledListItem>
                  </StyledListItem>
                ))}
              </List>
              <Divider sx={{ my: 1 }} />
              <List>
                {socialItems.map((item) => (
                  <StyledListItem
                    key={item.label}
                    disablePadding
                  >
                    <StyledListItem
                      button
                      selected={location.pathname === item.path}
                      onClick={() => handleSidebarItemClick(item.path)}
                      sx={{
                        color: 'text.primary',
                        '& .MuiListItemIcon-root': {
                          color: 'inherit',
                        },
                      }}
                    >
                      <ListItemIcon>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                      {item.count && (
                        <NotificationBadge color={theme.palette[item.countColor.split('.')[0]][item.countColor.split('.')[1]]}>
                          {item.count}
                        </NotificationBadge>
                      )}
                    </StyledListItem>
                  </StyledListItem>
                ))}
              </List>
              <Divider sx={{ my: 1 }} />
              <List>
                {settingsItems.map((item) => (
                  <StyledListItem
                    key={item.label}
                    disablePadding
                  >
                    <StyledListItem
                      button
                      selected={location.pathname === item.path}
                      onClick={item.onClick || (() => handleSidebarItemClick(item.path))}
                      sx={{
                        color: 'text.primary',
                        '& .MuiListItemIcon-root': {
                          color: 'inherit',
                        },
                      }}
                    >
                      <ListItemIcon>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </StyledListItem>
                  </StyledListItem>
                ))}
              </List>
            </Box>
          </Box>

          {/* Main Content Area (80%) */}
          <Box component="main" sx={{
            width: '80%',
            minHeight: '100vh',
            flexGrow: 1,
            p: 3,
            ml: '20%', // Offset by sidebar width
            position: 'relative',
            boxSizing: 'border-box',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
              borderRadius: '4px',
              '&:hover': {
                background: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
              },
            },
          }}>
            <Box sx={{ 
              width: '100%',
              height: '100%',
              overflowY: 'auto'
            }}>
              <Outlet />
            </Box>
          </Box>
        </>
      )}

      {/* Mobile Layout (Bottom Navigation) */}
      {isMobile && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: theme.zIndex.drawer + 1 }} elevation={3}>
          <BottomNavigation showLabels value={bottomNavValue} onChange={handleBottomNavChange}>
            <BottomNavigationAction label="Home" icon={<HomeIcon />} onClick={() => navigate('/home')} />
            <BottomNavigationAction label="Map" icon={<MapIcon />} onClick={() => navigate('/map')} />
            <BottomNavigationAction label="Explore" icon={<ExploreIcon />} onClick={() => navigate('/explore')} />
            <BottomNavigationAction label="Profile" icon={<PersonIcon />} onClick={() => navigate('/profile')} />
          </BottomNavigation>
        </Paper>
      )}

      {/* Main Content */}
      {isMobile && (
        <Box component="main" sx={{
          width: '100%',
          minHeight: '100vh',
          flexGrow: 1,
          p: 3,
          pt: '56px', // Account for AppBar height
          pb: '65px', // Account for bottom navigation
          boxSizing: 'border-box',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)',
            borderRadius: '4px',
            '&:hover': {
              background: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
            },
          },
        }}>
          <Outlet />
        </Box>
      )}

      {/* Centered Fab for Create Post (Visible on mobile)*/}
       {isMobile && (
         <Fab
          color="secondary"
          aria-label="add"
          sx={{
            position: 'fixed',
            zIndex: theme.zIndex.drawer + 3,
            bottom: 76,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          onClick={handleFabClick}
         >
           <AddIcon />
         </Fab>
       )}

      {/* Chat AI Fab (Visible on mobile) */}
      {isMobile && !isChatOpen && (
        <Fab
          color="primary"
          variant="extended"
          aria-label="chat-ai"
          sx={{
            position: 'fixed',
            zIndex: theme.zIndex.drawer + 3,
            bottom: 30,
            right: 30,
          }}
          onClick={toggleChat}
        >
          <ChatBubbleOutlineOutlined />
          <Typography variant="button" sx={{ ml: 1 }}>
            AI Chat
          </Typography>
        </Fab>
      )}

      {/* Chat Toggle Button (Desktop) */}
      {!isMobile && !isChatOpen && (
        <ChatToggleButton
          color="primary"
          variant="extended"
          onClick={toggleChat}
        >
          <ChatBubbleOutlineOutlined />
          <Typography variant="button" sx={{ ml: 1 }}>
            AI Chat
          </Typography>
        </ChatToggleButton>
      )}

      {/* Chat Sidebar */}
      {isChatOpen && (
        <Box
          sx={{
            position: 'fixed',
            right: 0,
            top: 0,
            height: '100vh',
            width: isMobile ? '100%' : '500px', // Responsive width
            bgcolor: 'background.paper',
            zIndex: theme.zIndex.drawer + 2,
            boxShadow: 3,
            transition: theme.transitions.create('transform', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            transform: isChatOpen
              ? 'translateX(0)'
              : isMobile
                ? 'translateX(100vw)' // Off-screen for mobile
                : 'translateX(500px)', // Off-screen for desktop
          }}
        >
          <ChatBot onClose={toggleChat} />
        </Box>
      )}
    </Box>
  );
};

export default AppLayout;