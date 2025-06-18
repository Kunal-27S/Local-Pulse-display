import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Paper,
  CircularProgress,
  IconButton,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  Comment as CommentIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  Timestamp,
  writeBatch,
  updateDoc,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

// const sampleNotifications = [ ... ]; // Remove mock data

const NotificationsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    console.log('Starting notifications setup for user:', currentUser.uid);
    setError(null);

    const setupNotifications = async () => {
      try {
        // First, check if the user document exists
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        console.log('User document check:', {
          exists: userDoc.exists(),
          userId: currentUser.uid
        });

        if (!userDoc.exists()) {
          console.log('Creating user document for:', currentUser.uid);
          await setDoc(userDocRef, {
            email: currentUser.email,
            displayName: currentUser.displayName || 'Anonymous User',
            photoURL: currentUser.photoURL || '',
            createdAt: Timestamp.now(),
            notificationCount: 0
          });
        }

        // Set up the notifications listener
        const notificationsRef = collection(userDocRef, 'notifications');
        const notificationsQuery = query(
          notificationsRef,
          orderBy('timestamp', 'desc')
        );

        console.log('Setting up notifications listener for path:', `users/${currentUser.uid}/notifications`);

        const unsubscribe = onSnapshot(
          notificationsQuery,
          async (snapshot) => {
            try {
              console.log('Received notifications snapshot:', {
                count: snapshot.docs.length,
                docs: snapshot.docs.map(doc => ({
                  id: doc.id,
                  type: doc.data().type,
                  timestamp: doc.data().timestamp?.toDate()
                }))
              });
              
              const notificationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));

              // Calculate unread count
              const unreadCount = notificationsData.filter(n => !n.read).length;
              
              // Update user document with current unread count
              await updateDoc(userDocRef, {
                notificationCount: unreadCount
              });

              console.log('Processed notifications:', notificationsData);
              setNotifications(notificationsData);
              setLoading(false);
              setError(null);

              // DON'T automatically mark as read here
              // Let user explicitly interact with notifications
              
            } catch (err) {
              console.error('Error processing notifications:', err);
              console.error('Full error details:', {
                error: err.message,
                code: err.code,
                stack: err.stack
              });
              setError('Error processing notifications. Please try again.');
              setLoading(false);
            }
          },
          (err) => {
            console.error('Error in notifications listener:', err);
            console.error('Full listener error details:', {
              error: err.message,
              code: err.code,
              stack: err.stack
            });
            setError('Error loading notifications. Please try again.');
            setLoading(false);
          }
        );

        return unsubscribe;
      } catch (err) {
        console.error('Error setting up notifications:', err);
        console.error('Full setup error details:', {
          error: err.message,
          code: err.code,
          stack: err.stack
        });
        setError('Error setting up notifications. Please try again.');
        setLoading(false);
        return () => {};
      }
    };

    let unsubscribe;
    setupNotifications().then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) {
        console.log('Cleaning up notifications listener');
        unsubscribe();
      }
    };
  }, [currentUser]);

  const handleNotificationClick = async (notification) => {
    try {
      if (notification.postId) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const notificationRef = doc(
          db,
          'users',
          currentUser.uid,
          'notifications',
          notification.id
        );

        // Mark as read first if not already read
        if (!notification.read) {
          await updateDoc(notificationRef, { read: true });
          
          // The onSnapshot listener will automatically recalculate 
          // and update the count in the user document
        }

        // Delete the notification
        await deleteDoc(notificationRef);
        console.log('Automatically deleted notification:', notification.id);
        
        // Then navigate to the post
        navigate(`/posts/${notification.postId}`);
      }
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const handleDeleteNotification = async (notificationId, event) => {
    event.stopPropagation();
    try {
      const notificationRef = doc(
        db,
        'users',
        currentUser.uid,
        'notifications',
        notificationId
      );

      // Just delete - the onSnapshot listener will recalculate the count
      await deleteDoc(notificationRef);
      console.log('Deleted notification:', notificationId);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <FavoriteIcon color="error" />;
      case 'comment':
        return <CommentIcon color="primary" />;
      case 'eyewitness':
        return <VisibilityIcon color="action" />;
      case 'reply':
        return <CommentIcon color="secondary" />;
      case 'tag_match':
        return <VisibilityIcon color="success" />;
      default:
        return null;
    }
  };

  const getNotificationText = (notification) => {
    const userName = notification.triggeringUserName || 'Anonymous User';
    switch (notification.type) {
      case 'like':
        return `${userName} liked your post`;
      case 'unlike':
        return `${userName} unliked your post`;
      case 'comment':
        return `${userName} commented on your post`;
      case 'reply':
        return `${userName} replied to your comment`;
      case 'eyewitness':
        return `${userName} marked themselves as an eyewitness on your post`;
      case 'remove_eyewitness':
        return `${userName} removed eyewitness status`;
      case 'comment_like':
        return `${userName} liked your comment`;
      case 'reply_like':
        return `${userName} liked your reply`;
      case 'post_pending':
        return `New post created. awaiting verification.`;
      case 'tag_match':
        return `${userName} created a post with your subscribed tags (${notification.matchedTags.join(', ')}) within ${notification.distance}km`;
      default:
        return `${userName} interacted with your post`;
    }
  };
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleDeleteAllNotifications = async () => {
    try {
      const batch = writeBatch(db);
      
      // Add all notifications to the batch
      notifications.forEach(notification => {
        const notificationRef = doc(
          db,
          'users',
          currentUser.uid,
          'notifications',
          notification.id
        );
        batch.delete(notificationRef);
      });

      // Commit the batch
      await batch.commit();
      console.log('Deleted all notifications');
      
      // Close the dialog
      setDeleteAllDialogOpen(false);
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      setError('Failed to delete all notifications. Please try again.');
    }
  };

  if (!currentUser) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Typography align="center" color="text.secondary">
          Please sign in to view notifications
        </Typography>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper' }}>
          <Typography color="error" align="center">
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please try refreshing the page.
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          Notifications
        </Typography>
        {notifications.length > 0 && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => setDeleteAllDialogOpen(true)}
          >
            Delete All
          </Button>
        )}
      </Box>

      {notifications.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.paper' }}>
          <Typography color="text.secondary">
            No notifications yet
          </Typography>
        </Paper>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {notifications.map((notification, index) => (
            <Box key={notification.id}>
              <ListItem
                alignItems="flex-start"
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.hover',
                  },
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemAvatar>
                  <Avatar
                    src={notification.triggeringUserAvatar}
                    sx={{ bgcolor: 'primary.main' }}
                  >
                    {getNotificationIcon(notification.type)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={getNotificationText(notification)}
                  secondary={
                    <React.Fragment>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        {formatTimestamp(notification.timestamp)}
                      </Typography>
                    </React.Fragment>
                  }
                />
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={(e) => handleDeleteNotification(notification.id, e)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItem>
              {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
            </Box>
          ))}
        </List>
      )}

      <Dialog
        open={deleteAllDialogOpen}
        onClose={() => setDeleteAllDialogOpen(false)}
      >
        <DialogTitle>Delete All Notifications</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete all notifications? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteAllNotifications} color="error">
            Delete All
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default NotificationsPage;