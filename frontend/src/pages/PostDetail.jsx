import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  Avatar,
  Divider,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Collapse,
  CircularProgress,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Paper,
  Grid,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  FavoriteBorderOutlined as FavoriteBorderOutlinedIcon,
  Favorite as FavoriteIcon,
  ChatBubbleOutline as ChatBubbleOutlineIcon,
  VisibilityOutlined as VisibilityOutlinedIcon,
  ReplyOutlined as ReplyOutlinedIcon,
  MoreHoriz as MoreHorizIcon,
  ExpandMore,
  ExpandLess,
  Send,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Favorite,
  Comment,
  Visibility,
  Settings as SettingsIcon,
  PhotoCamera,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { db } from '../firebaseConfig'; // Import db
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { collection, doc, getDoc, query, orderBy, onSnapshot, addDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, deleteDoc, setDoc, getDocs, limit, runTransaction, where } from 'firebase/firestore';
import axios from 'axios';
import { getUserDisplayName, getUserProfile } from '../utils/userUtils';
import placeholderImage from '../assets/placeholder.jpg';

// Mock data for a single post and comments (will be replaced with fetched data)
// const mockPost = { ... };

// Recursive function to find a comment or reply by ID
const findCommentById = (commentsList, id) => {
  for (const comment of commentsList) {
    if (comment.id === id) {
      return comment;
    }
    if (comment.replies && comment.replies.length > 0) {
      const foundInReplies = findCommentById(comment.replies, id);
      if (foundInReplies) {
        return foundInReplies;
      }
    }
  }
  return null;
};

const CommentItem = ({ comment, onReply, onLike }) => {
  const [openReplies, setOpenReplies] = useState(false);
  // const [liked, setLiked] = useState(false); // Local state managed by parent real-time listener
  const [replyText, setReplyText] = useState('');
  const { currentUser } = useAuth();

  // Check if the current user has liked this comment - state updated by parent real-time listener
  const liked = currentUser && comment.likedBy?.includes(currentUser.uid);

  const handleLikeComment = async () => {
    if (!currentUser) return;
    try {
      // Pass the comment ID and the current liked status
      await onLike(comment.id, liked);
      // Local state update is handled by the onLike prop function in PostDetail's real-time listener
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const handleReplyComment = () => {
    if (replyText.trim() !== '') {
      // Pass the parent comment ID and the reply text to the handler
      onReply(comment.id, replyText.trim());
      setReplyText('');
      // No need to manually setOpenReplies(true) here, let the state update from fetch handle it
    }
  };

  const handleToggleReplies = () => {
    setOpenReplies(!openReplies);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <ListItem alignItems="flex-start" sx={{ bgcolor: 'background.paper', borderRadius: 2, mb: 1 }}>
        <ListItemAvatar>
          <Avatar alt={comment.username} src={comment.userAvatar || ''} /> {/* Use userAvatar from Firestore */}
        </ListItemAvatar>
        <ListItemText
          primary={
            <Typography variant="subtitle2" fontWeight={500}>
              {comment.username} {/* Use username from Firestore */}
            </Typography>
          }
          secondary={
            <React.Fragment>
              <Typography
                sx={{ display: 'inline' }}
                component="span"
                variant="body2"
                color="text.primary"
              >
                {comment.text} {/* Use comment text from Firestore */}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                  {comment.timestamp?.toDate().toLocaleString()} {/* Display timestamp */}
                </Typography>
                <Button 
                  variant="text" 
                  size="small" 
                  sx={{ 
                    textTransform: 'none', 
                    minWidth: 0,
                    mr: 1,
                    color: liked ? 'error.main' : 'inherit'
                  }} 
                  onClick={handleLikeComment}
                >
                  Like ({comment.likes || 0})
                </Button>
                {/* Only show reply button if it's a top-level comment or if nested replies are supported and implemented */}
                {!comment.parentId && (
                   <Button variant="text" size="small" sx={{ textTransform: 'none', minWidth: 0 }} onClick={() => setOpenReplies(true)}>Reply</Button>
                )}
              </Box>
            </React.Fragment>
          }
        />
         {/* Only show expand/collapse for comments that have replies and are not replies themselves */}
         {comment.replies?.length > 0 && !comment.parentId && (
          <IconButton onClick={handleToggleReplies} size="small">
            {openReplies ? <ExpandLess /> : <ExpandMore />} {/* Use ExpandMore/Less icons */}
          </IconButton>
        )}
      </ListItem>

      {/* Only show replies section for comments that have replies and are not replies themselves */}
      {comment.replies?.length > 0 && !comment.parentId && (
        <Collapse in={openReplies} timeout="auto" unmountOnExit sx={{ ml: 4 }}>
          <List component="div" disablePadding>
            {/* Pass a reply handler that indicates this is a nested reply */}
            {comment.replies.map(reply => (
              <CommentItem 
                key={reply.id} 
                comment={{...reply, parentId: comment.id}} // Pass parentId to nested replies
                onReply={onReply} 
                onLike={onLike}
              />
            ))}
          </List>
        </Collapse>
      )}

      {/* Reply Input (shown when expanded and it's a top-level comment) */}
      <Collapse in={openReplies && !comment.parentId} timeout="auto" unmountOnExit sx={{ ml: 4, mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.paper', borderRadius: 2, p: 1 }}>
          <TextField
            fullWidth
            placeholder="Add a reply..."
            size="small"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                fieldset: { border: 'none' },
                '&:hover fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' },
              },
            }}
          />
          <IconButton onClick={handleReplyComment} disabled={replyText.trim() === ''}>
            <Send fontSize="small" />
          </IconButton>
        </Box>
      </Collapse>
    </Box>
  );
};

const createPostNotification = async (currentUser, recipientId, type, post) => {
  console.log('Starting notification creation with:', {
    currentUser: currentUser ? {
      uid: currentUser.uid,
      email: currentUser.email,
      isAnonymous: currentUser.isAnonymous
    } : null,
    recipientId,
    type,
    postId: post?.id
  });

  if (!currentUser || !post || currentUser.uid === recipientId) {
    console.log('Skipping notification - invalid parameters');
    return false;
  }

  try {
    // First create or update the user document directly
    const recipientDocRef = doc(db, 'users', recipientId);
    
    // Create basic user data
    const userData = {
      email: currentUser.email || '',
      displayName: currentUser.displayName || '',
      photoURL: currentUser.photoURL || '',
      createdAt: Timestamp.now(),
      notificationCount: 1
    };

    console.log('Attempting to create/update user document:', recipientDocRef.path);
    
    // Check if user document exists
    const recipientDoc = await getDoc(recipientDocRef);
    
    if (!recipientDoc.exists()) {
      console.log('Creating new user document');
      await setDoc(recipientDocRef, userData);
    } else {
      console.log('Updating existing user document');
      await updateDoc(recipientDocRef, {
        notificationCount: (recipientDoc.data().notificationCount || 0) + 1
      });
    }

    // Create notification data
    const notificationData = {
      triggeringUserId: currentUser.uid,
      triggeringUserName: currentUser.displayName || 'Anonymous User',
      triggeringUserAvatar: currentUser.photoURL || '',
      type,
      message: getNotificationMessage(type),
      postId: post.id,
      postTitle: post.title || 'Untitled',
      postImage: post.imageUrl || '',
      seen: false,
      read: false,
      timestamp: Timestamp.now()
    };

    console.log('Creating notification with data:', {
      ...notificationData,
      recipientId,
      notificationPath: `users/${recipientId}/notifications`
    });

    // Create the notification document
    const notificationsRef = collection(db, 'users', recipientId, 'notifications');
    await addDoc(notificationsRef, notificationData);

    console.log('Notification created successfully');
    return true;
  } catch (error) {
    console.error('Error in createPostNotification:', {
      errorCode: error.code,
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack
    });
    return false;
  }
};

// Helper function to get notification message
const getNotificationMessage = (type) => {
  switch (type) {
    case 'like':
      return 'liked your post';
    case 'unlike':
      return 'unliked your post';
    case 'comment':
      return 'commented on your post';
    case 'reply':
      return 'replied to your comment';
    case 'eyewitness':
      return 'marked themselves as an eyewitness on your post';
    case 'remove_eyewitness':
      return 'removed eyewitness status';
    case 'comment_like':
      return 'liked your comment';
    case 'reply_like':
      return 'liked your reply';
    case 'post_pending':
      return 'New post created. awaiting verification.';
    default:
      return 'interacted with your post';
  }
};

const anonymousAvatar = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';

const PostDetail = () => {
  const { postId } = useParams();
  const { currentUser } = useAuth(); // Get the current user
  const navigate = useNavigate();

  const [post, setPost] = useState(null); // State to hold the fetched post
  const [comments, setComments] = useState([]); // State to hold the fetched comments
  const [loadingPost, setLoadingPost] = useState(true); // Loading state for post
  const [loadingComments, setLoadingComments] = useState(true); // Loading state for comments
  const [postError, setPostError] = useState(null); // Error state for post
  const [commentError, setCommentError] = useState(null); // Error state for comments
  const [inputComment, setInputComment] = useState('');
  const [liked, setLiked] = useState(false); // State for if the current user liked the post
  const [eyewitnessed, setEyewitnessed] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [actionLoading, setActionLoading] = useState({
    like: false,
    comment: false,
    reply: false,
    eyewitness: false,
  });
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [repostDialogOpen, setRepostDialogOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Fetch post data (using real-time listener for post updates)
  useEffect(() => {
    if (!postId) return;

    const postRef = doc(db, 'posts', postId);
    const unsubscribePost = onSnapshot(postRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const postData = { id: docSnap.id, ...docSnap.data() };
          console.log('Fetched post data:', {
            isAnonymous: postData.isAnonymous,
            username: postData.username,
            userAvatar: postData.userAvatar,
            creatorId: postData.creatorId
          });
          setPost(postData);
          // Update local state based on fetched data
          if (currentUser) {
            setLiked(postData.likedBy?.includes(currentUser.uid) || false);
            setEyewitnessed(postData.eyewitnessedBy?.includes(currentUser.uid) || false);
          }
        } else {
          setPostError('Post not found.');
        }
        setLoadingPost(false);
      },
      (err) => {
        console.error('Error fetching post:', err);
        setPostError('Failed to fetch post.');
        setLoadingPost(false);
      }
    );

    return () => unsubscribePost();
  }, [postId, currentUser]);

  // Fetch comments data (using real-time listener)
  useEffect(() => {
    if (!postId) return;

    const commentsCollectionRef = collection(db, 'posts', postId, 'comments');
    const commentsQuery = query(commentsCollectionRef, orderBy('timestamp', 'asc'));

    const unsubscribeComments = onSnapshot(commentsQuery,
      async (snapshot) => {
        // console.log('Firestore comments snapshot received:', snapshot.docs.length, 'documents');
        const commentsData = await Promise.all(snapshot.docs.map(async (commentDocSnap) => {
          const comment = { id: commentDocSnap.id, ...commentDocSnap.data() };
          // console.log('Processing comment:', comment.id, comment.text);

          // Fetch comment author's details using senderId
          let author = { username: 'Unknown User', userAvatar: '' };
          if (comment.senderId) {
            try {
              const userDocRef = doc(db, 'users', comment.senderId);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                // Prioritize displayName, fallback to email, then 'Unknown User'
                author = {
                  username: userData.displayName || userData.email || 'Unknown User',
                  userAvatar: userData.photoURL || '', // Use photoURL from user document
                };
                //  console.log('Fetched author for comment:', comment.id, author.username);
              } else {
                // console.warn('User document not found for senderId:', comment.senderId);
              }
            } catch (err) {
              console.error('Error fetching comment author details for comment:', comment.id, err);
              // Continue processing even if fetching user details fails
            }
          }

          // console.log('Comment after author merge:', { ...comment, ...author });

          // Recursively fetch replies' author details if needed - currently assuming replies array has full user data
          // If replies need author fetching, a similar loop/map would be needed here for comment.replies

          return {
            ...comment,
            ...author, // Merge author details into the comment object
          };
        }));

        // console.log('Processed comments data:', commentsData);
        setComments(commentsData); // Update comments state with fetched data
        setLoadingComments(false);
      },
      err => {
        console.error('Error fetching comments with onSnapshot:', err);
        setCommentError('Failed to load comments.');
        setLoadingComments(false);
      }
    );

    return () => unsubscribeComments(); // Clean up listener on unmount
  }, [postId, currentUser, db, collection, query, orderBy, onSnapshot, getDoc, doc]); // Added dependencies

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Handle liking/unliking a post
  const handleLikePost = async () => {
    if (!currentUser || !post || actionLoading.like) return;

    console.log('Like post action triggered:', {
      currentUser: currentUser.uid,
      postCreator: post.creatorId,
      postId: post.id
    });

    setActionLoading(prev => ({ ...prev, like: true }));
    try {
      const postRef = doc(db, 'posts', post.id);
      const userId = currentUser.uid;

      // First ensure the user document exists
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: currentUser.email || '',
          displayName: currentUser.displayName || '',
          photoURL: currentUser.photoURL || '',
          createdAt: Timestamp.now(),
          notificationCount: 0
        });
      }

      if (liked) {
        // Unlike the post
        await updateDoc(postRef, {
          likes: (post.likes || 0) - 1,
          likedBy: arrayRemove(userId),
        });

        // Create notification for post creator if it's not your own post
        if (post.creatorId !== currentUser.uid) {
          // Ensure recipient's user document exists
          const recipientDocRef = doc(db, 'users', post.creatorId);
          const recipientDoc = await getDoc(recipientDocRef);
          
          if (!recipientDoc.exists()) {
            await setDoc(recipientDocRef, {
              email: post.creatorEmail || '',
              displayName: post.creatorDisplayName || '',
              photoURL: post.creatorPhotoURL || '',
              createdAt: Timestamp.now(),
              notificationCount: 1
            });
          } else {
            await updateDoc(recipientDocRef, {
              notificationCount: (recipientDoc.data().notificationCount || 0) + 1
            });
          }

          // Create the notification
          const notificationData = {
            triggeringUserId: currentUser.uid,
            triggeringUserName: currentUser.displayName || 'Anonymous User',
            triggeringUserAvatar: currentUser.photoURL || '',
            type: 'unlike',
            message: 'unliked your post',
            postId: post.id,
            postTitle: post.title || 'Untitled',
            postImage: post.imageUrl || '',
            seen: false,
            read: false,
            timestamp: Timestamp.now()
          };

          const notificationsRef = collection(db, 'users', post.creatorId, 'notifications');
          await addDoc(notificationsRef, notificationData);
        }
      } else {
        // Like the post
        await updateDoc(postRef, {
          likes: (post.likes || 0) + 1,
          likedBy: arrayUnion(userId),
        });

        // Create notification for post creator if it's not your own post
        if (post.creatorId !== currentUser.uid) {
          // Ensure recipient's user document exists
          const recipientDocRef = doc(db, 'users', post.creatorId);
          const recipientDoc = await getDoc(recipientDocRef);
          
          if (!recipientDoc.exists()) {
            await setDoc(recipientDocRef, {
              email: post.creatorEmail || '',
              displayName: post.creatorDisplayName || '',
              photoURL: post.creatorPhotoURL || '',
              createdAt: Timestamp.now(),
              notificationCount: 1
            });
          } else {
            await updateDoc(recipientDocRef, {
              notificationCount: (recipientDoc.data().notificationCount || 0) + 1
            });
          }

          // Create the notification
          const notificationData = {
            triggeringUserId: currentUser.uid,
            triggeringUserName: currentUser.displayName || 'Anonymous User',
            triggeringUserAvatar: currentUser.photoURL || '',
            type: 'like',
            message: 'liked your post',
            postId: post.id,
            postTitle: post.title || 'Untitled',
            postImage: post.imageUrl || '',
            seen: false,
            read: false,
            timestamp: Timestamp.now()
          };

          const notificationsRef = collection(db, 'users', post.creatorId, 'notifications');
          await addDoc(notificationsRef, notificationData);
        }
      }
    } catch (err) {
      console.error('Error liking post:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update like status',
        severity: 'error'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, like: false }));
    }
  };

  // Handle toggling eyewitness status for a post
  const handleToggleEyewitness = async () => {
    if (!currentUser || !post || actionLoading.eyewitness) return;

    setActionLoading(prev => ({ ...prev, eyewitness: true }));
    try {
      const postRef = doc(db, 'posts', post.id);
      const userId = currentUser.uid;

      // First ensure the user document exists
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: currentUser.email || '',
          displayName: currentUser.displayName || '',
          photoURL: currentUser.photoURL || '',
          createdAt: Timestamp.now(),
          notificationCount: 0
        });
      }

      if (eyewitnessed) {
        // Remove eyewitness status
        await updateDoc(postRef, {
          eyewitnesses: (post.eyewitnesses || 0) - 1,
          eyewitnessedBy: arrayRemove(userId),
        });

        // Create notification for post creator if it's not your own post
        if (post.creatorId !== currentUser.uid) {
          // Ensure recipient's user document exists
          const recipientDocRef = doc(db, 'users', post.creatorId);
          const recipientDoc = await getDoc(recipientDocRef);
          
          if (!recipientDoc.exists()) {
            await setDoc(recipientDocRef, {
              email: post.creatorEmail || '',
              displayName: post.creatorDisplayName || '',
              photoURL: post.creatorPhotoURL || '',
              createdAt: Timestamp.now(),
              notificationCount: 1
            });
          } else {
            await updateDoc(recipientDocRef, {
              notificationCount: (recipientDoc.data().notificationCount || 0) + 1
            });
          }

          // Create the notification
          const notificationData = {
            triggeringUserId: currentUser.uid,
            triggeringUserName: currentUser.displayName || 'Anonymous User',
            triggeringUserAvatar: currentUser.photoURL || '',
            type: 'remove_eyewitness',
            message: 'removed eyewitness status',
            postId: post.id,
            postTitle: post.title || 'Untitled',
            postImage: post.imageUrl || '',
            seen: false,
            read: false,
            timestamp: Timestamp.now()
          };

          const notificationsRef = collection(db, 'users', post.creatorId, 'notifications');
          await addDoc(notificationsRef, notificationData);
        }
      } else {
        // Add eyewitness status
        await updateDoc(postRef, {
          eyewitnesses: (post.eyewitnesses || 0) + 1,
          eyewitnessedBy: arrayUnion(userId),
        });

        // Create notification for post creator if it's not your own post
        if (post.creatorId !== currentUser.uid) {
          // Ensure recipient's user document exists
          const recipientDocRef = doc(db, 'users', post.creatorId);
          const recipientDoc = await getDoc(recipientDocRef);
          
          if (!recipientDoc.exists()) {
            await setDoc(recipientDocRef, {
              email: post.creatorEmail || '',
              displayName: post.creatorDisplayName || '',
              photoURL: post.creatorPhotoURL || '',
              createdAt: Timestamp.now(),
              notificationCount: 1
            });
          } else {
            await updateDoc(recipientDocRef, {
              notificationCount: (recipientDoc.data().notificationCount || 0) + 1
            });
          }

          // Create the notification
          const notificationData = {
            triggeringUserId: currentUser.uid,
            triggeringUserName: currentUser.displayName || 'Anonymous User',
            triggeringUserAvatar: currentUser.photoURL || '',
            type: 'eyewitness',
            message: 'marked themselves as an eyewitness on your post',
            postId: post.id,
            postTitle: post.title || 'Untitled',
            postImage: post.imageUrl || '',
            seen: false,
            read: false,
            timestamp: Timestamp.now()
          };

          const notificationsRef = collection(db, 'users', post.creatorId, 'notifications');
          await addDoc(notificationsRef, notificationData);
        }
      }
    } catch (err) {
      console.error('Error toggling eyewitness status:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update eyewitness status',
        severity: 'error'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, eyewitness: false }));
    }
  };

  const findCommentAndParent = (commentId, commentsList) => {
    for (const comment of commentsList) {
      // Check if this is the comment we're looking for
      if (comment.id === commentId) {
        return { comment, isReply: false };
      }
      // Check replies if they exist
      if (comment.replies && comment.replies.length > 0) {
        const reply = comment.replies.find(r => r.id === commentId);
        if (reply) {
          return { comment: reply, parent: comment, isReply: true };
        }
      }
    }
    return { comment: null, parent: null, isReply: false };
  };

  const handleLikeComment = async (commentId, currentLikedStatus) => {
    if (!currentUser || !post || actionLoading.like) return;

    setActionLoading(prev => ({ ...prev, like: true }));
    try {
      const displayName = await getUserDisplayName(currentUser.uid);
      const userId = currentUser.uid;
      const { comment: commentToUpdate, parent: parentComment, isReply } = findCommentAndParent(commentId, comments);
      const userHasLiked = commentToUpdate.likedBy?.includes(userId);

      if (isReply) {
        // Handle reply like
        const replyRef = doc(db, 'posts', post.id, 'comments', parentComment.id, 'replies', commentId);
        if (userHasLiked) {
          await updateDoc(replyRef, {
            likes: (commentToUpdate.likes || 1) - 1,
            likedBy: arrayRemove(userId)
          });
        } else {
          await updateDoc(replyRef, {
            likes: (commentToUpdate.likes || 0) + 1,
            likedBy: arrayUnion(userId)
          });

          // Send notification for reply like
          if (commentToUpdate.senderId !== currentUser.uid) {
            const recipientDocRef = doc(db, 'users', commentToUpdate.senderId);
            const recipientDoc = await getDoc(recipientDocRef);

            if (!recipientDoc.exists()) {
              await setDoc(recipientDocRef, {
                email: commentToUpdate.email || '',
                displayName: commentToUpdate.username || '',
                photoURL: commentToUpdate.userAvatar || '',
                createdAt: Timestamp.now(),
                notificationCount: 1
              });
            } else {
              await updateDoc(recipientDocRef, {
                notificationCount: (recipientDoc.data().notificationCount || 0) + 1
              });
            }

            const notificationData = {
              triggeringUserId: currentUser.uid,
              triggeringUserName: displayName,
              triggeringUserAvatar: currentUser.photoURL || '',
              type: 'reply_like',
              message: 'liked your reply',
              postId: post.id,
              postTitle: post.title || 'Untitled',
              postImage: post.imageUrl || '',
              seen: false,
              read: false,
              timestamp: Timestamp.now()
            };

            const notificationsRef = collection(db, 'users', commentToUpdate.senderId, 'notifications');
            await addDoc(notificationsRef, notificationData);
          }
        }
      } else {
        // Handle top-level comment like
        const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
        if (userHasLiked) {
          await updateDoc(commentRef, {
            likes: (commentToUpdate.likes || 1) - 1,
            likedBy: arrayRemove(userId)
          });
        } else {
          await updateDoc(commentRef, {
            likes: (commentToUpdate.likes || 0) + 1,
            likedBy: arrayUnion(userId)
          });

          // Send notification for comment like
          if (commentToUpdate.senderId !== currentUser.uid) {
            const recipientDocRef = doc(db, 'users', commentToUpdate.senderId);
            const recipientDoc = await getDoc(recipientDocRef);

            if (!recipientDoc.exists()) {
              await setDoc(recipientDocRef, {
                email: commentToUpdate.email || '',
                displayName: commentToUpdate.username || '',
                photoURL: commentToUpdate.userAvatar || '',
                createdAt: Timestamp.now(),
                notificationCount: 1
              });
            } else {
              await updateDoc(recipientDocRef, {
                notificationCount: (recipientDoc.data().notificationCount || 0) + 1
              });
            }

            const notificationData = {
              triggeringUserId: currentUser.uid,
              triggeringUserName: displayName,
              triggeringUserAvatar: currentUser.photoURL || '',
              type: 'comment_like',
              message: 'liked your comment',
              postId: post.id,
              postTitle: post.title || 'Untitled',
              postImage: post.imageUrl || '',
              seen: false,
              read: false,
              timestamp: Timestamp.now()
            };

            const notificationsRef = collection(db, 'users', commentToUpdate.senderId, 'notifications');
            await addDoc(notificationsRef, notificationData);
          }
        }
      }
    } catch (err) {
      console.error('Error liking comment or reply:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update like status',
        severity: 'error'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, like: false }));
    }
  };

  // Update handleAddComment with loading state and error handling
  const handleAddComment = async () => {
    if (!currentUser || !inputComment.trim() || actionLoading.comment) return;

    setActionLoading(prev => ({ ...prev, comment: true }));
    try {
      // Get the user's display name from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : null;
      const displayName = userData?.displayName || 'Anonymous User';
      
      const commentData = {
        text: inputComment.trim(),
        senderId: currentUser.uid,
        username: displayName,
        userAvatar: currentUser.photoURL,
        timestamp: Timestamp.now(),
        likes: 0,
        likedBy: [],
      };

      // Add comment to the comments collection
      const commentsRef = collection(db, 'posts', post.id, 'comments');
      const commentDoc = await addDoc(commentsRef, commentData);

      // Update the post's comment count
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        commentCount: (post.commentCount || 0) + 1
      });

      // Create notification for post creator if it's not your own post
      if (post.creatorId !== currentUser.uid) {
        // First ensure the recipient's user document exists
        const recipientDocRef = doc(db, 'users', post.creatorId);
        const recipientDoc = await getDoc(recipientDocRef);
        
        if (!recipientDoc.exists()) {
          await setDoc(recipientDocRef, {
            email: post.creatorEmail || '',
            displayName: post.creatorDisplayName || '',
            photoURL: post.creatorPhotoURL || '',
            createdAt: Timestamp.now(),
            notificationCount: 1
          });
        } else {
          await updateDoc(recipientDocRef, {
            notificationCount: (recipientDoc.data().notificationCount || 0) + 1
          });
        }

        // Create the notification
        const notificationData = {
          triggeringUserId: currentUser.uid,
          triggeringUserName: displayName,
          triggeringUserAvatar: currentUser.photoURL || '',
          type: 'comment',
          message: 'commented on your post',
          postId: post.id,
          postTitle: post.title || 'Untitled',
          postImage: post.imageUrl || '',
          seen: false,
          read: false,
          timestamp: Timestamp.now()
        };

        const notificationsRef = collection(db, 'users', post.creatorId, 'notifications');
        await addDoc(notificationsRef, notificationData);
      }

      setInputComment('');
      setSnackbar({
        open: true,
        message: 'Comment added successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error adding comment:', err);
      setSnackbar({
        open: true,
        message: 'Failed to add comment',
        severity: 'error'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, comment: false }));
    }
  };

  // Handle replying to a comment
  const handleReplyToComment = async (commentId, replyText) => {
    if (replyText.trim() === '' || !currentUser || !post || actionLoading.reply) return;

    setActionLoading(prev => ({ ...prev, reply: true }));

    try {
      const parentComment = findCommentById(comments, commentId);

      if (!parentComment) {
        console.error('Parent comment not found for reply');
        setSnackbar({
          open: true,
          message: 'Failed to add reply: Parent comment not found',
          severity: 'error'
        });
        return;
      }

      const newReply = {
        id: doc(collection(db, 'temp')).id,
        text: replyText.trim(),
        username: currentUser.displayName || 'Anonymous User',
        userAvatar: currentUser.photoURL || '',
        senderId: currentUser.uid,
        timestamp: Timestamp.fromDate(new Date()),
        likes: 0,
        likedBy: [],
      };

      // Update the parent comment document with the new reply
      const commentRef = doc(db, 'posts', post.id, 'comments', commentId);
      await updateDoc(commentRef, {
        replies: arrayUnion(newReply)
      });

      // Update the post's comment count
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        commentCount: (post.commentCount || 0) + 1
      });

      // Create notification for the parent comment creator
      if (parentComment.senderId !== currentUser.uid) {
        // First ensure the recipient's user document exists
        const recipientDocRef = doc(db, 'users', parentComment.senderId);
        const recipientDoc = await getDoc(recipientDocRef);
        
        if (!recipientDoc.exists()) {
          await setDoc(recipientDocRef, {
            email: parentComment.email || '',
            displayName: parentComment.username || '',
            photoURL: parentComment.userAvatar || '',
            createdAt: Timestamp.now(),
            notificationCount: 1
          });
        } else {
          await updateDoc(recipientDocRef, {
            notificationCount: (recipientDoc.data().notificationCount || 0) + 1
          });
        }

        // Create the notification
        const notificationData = {
          triggeringUserId: currentUser.uid,
          triggeringUserName: currentUser.displayName || 'Anonymous User',
          triggeringUserAvatar: currentUser.photoURL || '',
          type: 'reply',
          message: 'replied to your comment',
          postId: post.id,
          postTitle: post.title || 'Untitled',
          postImage: post.imageUrl || '',
          seen: false,
          read: false,
          timestamp: Timestamp.now()
        };

        const notificationsRef = collection(db, 'users', parentComment.senderId, 'notifications');
        await addDoc(notificationsRef, notificationData);
      }

      setSnackbar({
        open: true,
        message: 'Reply added!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding reply:', error);
      setSnackbar({
        open: true,
        message: 'Failed to add reply',
        severity: 'error'
      });
    } finally {
      setActionLoading(prev => ({ ...prev, reply: false }));
    }
  };

  const handleMenuClick = (event) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleRepostClick = () => {
    handleMenuClose();
    setRepostDialogOpen(true);
  };

  const deleteImageFromCloudinary = async (imageUrl) => {
    try {
      // Extract public_id from the Cloudinary URL
      const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
      
      // Make request to Cloudinary's delete API
      await axios.post(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/destroy`,
        {
          public_id: publicId,
          api_key: import.meta.env.VITE_CLOUDINARY_API_KEY,
          timestamp: Math.floor(Date.now() / 1000),
          signature: import.meta.env.VITE_CLOUDINARY_SIGNATURE
        }
      );
      console.log('Successfully deleted image from Cloudinary:', publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentUser || !post || actionInProgress) return;

    setActionInProgress(true);
    try {
      // Delete the post document
      await deleteDoc(doc(db, 'posts', post.id));
      
      // Delete the image from Cloudinary if it exists
      if (post.imageUrl) {
        await deleteImageFromCloudinary(post.imageUrl);
      }

      setSnackbar({
        open: true,
        message: 'Post deleted successfully',
        severity: 'success'
      });

      // Navigate back to home page
      navigate('/home');
    } catch (error) {
      console.error('Error deleting post:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete post',
        severity: 'error'
      });
    } finally {
      setActionInProgress(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleRepostConfirm = async () => {
    if (!currentUser || !post || actionInProgress) return;

    setActionInProgress(true);
    try {
      // Create a new post with the same content but new timestamps
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + post.duration * 60 * 60 * 1000);

      const newPost = {
        ...post,  // Copy all existing post data
        createdAt: Timestamp.fromDate(createdAt),
        expiresAt: Timestamp.fromDate(expiresAt),
        likes: 0,
        eyewitnesses: 0,
        comments: [],
        likedBy: [],
        eyewitnessedBy: [],
        // Preserve the original post's user information if it wasn't anonymous
        username: post.isAnonymous ? null : post.username,
        userAvatar: post.isAnonymous ? null : post.userAvatar,
      };

      // Remove the id field from the new post
      delete newPost.id;

      // Add the new post to Firestore
      await addDoc(collection(db, 'posts'), newPost);

      setSnackbar({
        open: true,
        message: 'Post reposted successfully',
        severity: 'success'
      });

      // Navigate to home page
      navigate('/home');
    } catch (error) {
      console.error('Error reposting:', error);
      setSnackbar({
        open: true,
        message: 'Failed to repost',
        severity: 'error'
      });
    } finally {
      setActionInProgress(false);
      setRepostDialogOpen(false);
    }
  };

  if (loadingPost) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6">Loading post...</Typography>
      </Container>
    );
  }

  if (postError) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error">{postError}</Typography>
      </Container>
    );
  }

  if (!post) {
     return (
       <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
         <Typography variant="h6">Post not found.</Typography>
       </Container>
     );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Card sx={{ display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden' }}>
        <CardContent sx={{ pb: 1 }}>
          {/* User Info Section with better logging and fallbacks */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {console.log('Rendering user info:', {
              isAnonymous: post.isAnonymous,
              username: post.username,
              userAvatar: post.userAvatar
            })}
            <Avatar 
              src={post.isAnonymous ? anonymousAvatar : (post.userAvatar || anonymousAvatar)}
              alt={post.isAnonymous ? 'Anonymous' : (post.username || 'Unnamed User')}
              sx={{ width: 40, height: 40, mr: 2 }}
            />
            <Typography variant="subtitle1" fontWeight={500}>
              {post.isAnonymous ? 'Anonymous' : (post.username || 'Unnamed User')}
            </Typography>
          </Box>
        </CardContent>
        <CardMedia
          component="img"
          image={post.imageUrl} // Use imageUrl from fetched post
          alt={post.title}
          sx={{ aspectRatio: '16/9', objectFit: 'cover' }}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" gutterBottom fontWeight={600}>
            {post.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {post.caption}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {post.tags?.map(tag => (
              <Typography key={tag} variant="caption" sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1, px: 1, py: 0.5 }}>
                {tag}
              </Typography>
            ))}
          </Box>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Posted: {post.createdAt?.toDate().toLocaleString()} {/* Display creation date */}
          </Typography>
        </CardContent>
        <Divider />
        <CardActions sx={{ p: 2, justifyContent: 'space-around' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={handleLikePost} size="small" sx={{ mr: 0.5 }} disabled={actionLoading.like}>
              {actionLoading.like ? <CircularProgress size={20} /> : (liked ? <FavoriteIcon color="error" /> : <FavoriteBorderOutlinedIcon />)}{/* Use filled icon if liked */}
            </IconButton>
            <Typography variant="body2">{post.likes || 0}</Typography> {/* Display likes from fetched post */}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={handleToggleEyewitness} size="small" sx={{ mr: 0.5 }} disabled={actionLoading.eyewitness}>
              {actionLoading.eyewitness ? <CircularProgress size={20} /> : (eyewitnessed ? <VisibilityOutlinedIcon color="primary" /> : <VisibilityOutlinedIcon />)}
            </IconButton>
            <Typography variant="body2">{post.eyewitnesses || 0}</Typography> {/* Display eyewitnesses from fetched post */}
          </Box>
          {/* Show options menu only if user is the post creator */}
          {currentUser && post.creatorId === currentUser.uid && (
            <>
              <IconButton size="small" onClick={handleMenuClick}>
                <MoreHorizIcon />
              </IconButton>
              <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleDeleteClick}>
                  <DeleteIcon sx={{ mr: 1 }} />
                  Delete Post
                </MenuItem>
                {!isPostActive(post) && (
                  <MenuItem onClick={handleRepostClick}>
                    <RefreshIcon sx={{ mr: 1 }} />
                    Repost
                  </MenuItem>
                )}
              </Menu>
            </>
          )}
        </CardActions>
      </Card>

      {/* Comments Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom fontWeight={600}>
          Comments ({comments.length}) {/* Display total comments from fetched comments state */}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Avatar sx={{ mr: 1 }} src={currentUser?.photoURL || ''} /> {/* User avatar for comment input */}
          <TextField
            fullWidth
            placeholder="Add a comment..."
            size="small"
            value={inputComment}
            onChange={(e) => setInputComment(e.target.value)}
            disabled={actionLoading.comment}
            sx={{
              '& .MuiOutlinedInput-root': {
                fieldset: { border: 'none' },
                '&:hover fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' },
              },
            }}
          />
          <Button 
            variant="contained" 
            onClick={handleAddComment} 
            disabled={inputComment.trim() === '' || actionLoading.comment}
          >
            {actionLoading.comment ? <CircularProgress size={24} /> : 'Post'}
          </Button>
        </Box>

        {loadingComments ? (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading comments...</Typography>
          </Box>
        ) : commentError ? (
          <Typography variant="body2" color="error" textAlign="center" sx={{ mt: 2 }}>{commentError}</Typography>
        ) : comments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2 }}>No comments yet. Be the first to comment!</Typography>
        ) : (
          <List disablePadding>
            {comments.map(comment => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                onReply={handleReplyToComment}
                onLike={handleLikeComment}
              />
            ))}
          </List>
        )}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Post</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this post? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={actionInProgress}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            disabled={actionInProgress}
            startIcon={actionInProgress ? <CircularProgress size={20} /> : null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Repost Confirmation Dialog */}
      <Dialog
        open={repostDialogOpen}
        onClose={() => setRepostDialogOpen(false)}
      >
        <DialogTitle>Repost</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Would you like to repost this expired post? It will appear as a new post with the same content.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRepostDialogOpen(false)} disabled={actionInProgress}>
            Cancel
          </Button>
          <Button 
            onClick={handleRepostConfirm} 
            color="primary" 
            disabled={actionInProgress}
            startIcon={actionInProgress ? <CircularProgress size={20} /> : null}
          >
            Repost
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

// Helper function to check if a post is active
const isPostActive = (post) => {
  const now = Timestamp.now().toMillis();
  const expirationTime = post.expiresAt?.toMillis();
  return expirationTime && expirationTime > now;
};

export default PostDetail;
 