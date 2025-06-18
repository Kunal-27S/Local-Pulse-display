import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton, ListItem, ListItemIcon, ListItemText, useTheme, useMediaQuery, BottomNavigation, BottomNavigationAction, Fab, Badge } from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Explore as ExploreIcon,
  Map as MapIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  Notifications as NotificationsIcon,
  ChatBubbleOutlineOutlined,
} from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

const AppLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [totalUnreadChatsCount, setTotalUnreadChatsCount] = useState(0);
  const { currentUser } = useAuth();

  useEffect(() => {
    const handlePopState = (event) => {
      if (window.location.pathname === '/signin') {
        window.history.pushState(null, '', window.location.href);
        alert('Please sign in to access the application');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUnreadNotificationsCount(0);
      setTotalUnreadChatsCount(0);
      return;
    }

    const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
    const unseenQuery = query(notificationsRef, where('read', '==', false));

    const unsubscribeNotifications = onSnapshot(unseenQuery, (snapshot) => {
      setUnreadNotificationsCount(snapshot.size);
    }, (error) => {
      console.error('Error fetching unseen notifications count:', error);
    });

    const chatsRef = collection(db, 'users', currentUser.uid, 'chats');

    const unsubscribeChats = onSnapshot(chatsRef, (snapshot) => {
      let totalUnread = 0;
      snapshot.forEach(doc => {
        const chatData = doc.data();
        totalUnread += (chatData.unreadCount || 0);
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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path, index) => {
    setSelectedIndex(index);
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };
  const handleLogout = async () => {
    try {
      await signOut(auth);
      
      // Clear any stored auth data
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any cached data
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (err) {
          console.error('Error clearing cache:', err);
        }
      }

      // Clear browser history and prevent back navigation
      window.history.replaceState(null, '', '/signin');
      window.history.pushState(null, '', '/signin');
      window.onpopstate = function() {
        window.history.forward();
        window.history.pushState(null, '', '/signin');
      };

      // Force redirect to signin
      window.location.href = '/signin';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/home' },
    { text: 'Explore', icon: <ExploreIcon />, path: '/explore' },
    { text: 'Map', icon: <MapIcon />, path: '/map' },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications', showCount: true },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const settingsItems = [
    {
      label: 'Chats',
      icon: <Box sx={{ position: 'relative' }}>
        <ChatBubbleOutlineOutlined />
        {totalUnreadChatsCount > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              borderRadius: '50%',
              minWidth: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              padding: '0 6px',
              boxSizing: 'border-box',
            }}
          >
            {totalUnreadChatsCount > 99 ? '99+' : totalUnreadChatsCount}
          </Box>
        )}
      </Box>,
      count: totalUnreadChatsCount > 0 ? (totalUnreadChatsCount > 99 ? '99+' : totalUnreadChatsCount.toString()) : null,
      countColor: 'primary.main',
      path: '/chats'
    },
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Local Pulse
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item, index) => (
          <ListItem
            button
            key={item.text}
            onClick={() => handleNavigation(item.path, index)}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>
              {item.text === 'Notifications' ? (
                <Badge badgeContent={unreadNotificationsCount} color="error" showZero>
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText 
              primary={
                item.text === 'Notifications' 
                  ? `${item.text} (${unreadNotificationsCount})`
                  : item.text
              } 
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Local Pulse
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          pb: { xs: 8, sm: 3 },
        }}
      >
        <Toolbar />
        {children}
      </Box>

      {isMobile && (
        <BottomNavigation
          value={menuItems.findIndex(item => item.path === location.pathname)}
          onChange={(event, newValue) => {
            handleNavigation(menuItems[newValue].path, newValue);
          }}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar,
          }}
        >
          {menuItems.map((item, index) => (
            <BottomNavigationAction
              key={item.text}
              label={
                item.text === 'Notifications' 
                  ? `${item.text} (${unreadNotificationsCount})`
                  : item.text
              }
              icon={
                item.text === 'Notifications' ? (
                  <Badge badgeContent={unreadNotificationsCount} color="error" showZero>
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )
              }
              value={index}
            />
          ))}
        </BottomNavigation>
      )}

      {isMobile && (
        <Fab
          color="primary"
          aria-label="create post"
          sx={{
            position: 'fixed',
            bottom: 72,
            right: 16,
            zIndex: theme.zIndex.appBar,
          }}
          onClick={() => handleNavigation('/create-post', -1)}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
};

export default AppLayout; 